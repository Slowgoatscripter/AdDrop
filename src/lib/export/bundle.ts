import archiver from 'archiver';
import { Writable } from 'stream';
import { CampaignKit } from '@/lib/types';
import { resizeAllPhotos } from './photo-resize';
import { generatePdfBuffer } from './generate-pdf';
import { PLATFORM_DIMENSIONS } from './platform-dimensions';

/**
 * Maps PlatformId to photo dimension platform keys.
 * Only platforms that have photo dimensions are included.
 */
const PLATFORM_TO_PHOTO_MAP: Record<string, string[]> = {
  instagram: ['instagram', 'instagram-story'],
  facebook: ['facebook'],
  twitter: ['twitter'],
};

export interface BundleProgress {
  phase: 'photos' | 'originals' | 'pdf' | 'zip' | 'uploading' | 'done';
  detail: string;
  step: number;
  totalSteps: number;
}

export async function generateBundle(
  campaign: CampaignKit,
  onProgress?: (progress: BundleProgress) => void,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  // Level 0 (store) — contents are already compressed (JPEG, PDF), so zlib is wasted CPU
  const archive = archiver('zip', { zlib: { level: 0 } });
  archive.pipe(writable);

  const address = campaign.listing?.address?.street?.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Campaign';
  const folderName = address;

  // 1. Resize and add photos
  const photos = campaign.listing?.photos?.filter(Boolean) || [];
  if (photos.length > 0) {
    const selectedPlatforms = campaign.selectedPlatforms || [];
    const photoPlatformIds: string[] = [];
    for (const pid of selectedPlatforms) {
      const mapped = PLATFORM_TO_PHOTO_MAP[pid];
      if (mapped) photoPlatformIds.push(...mapped);
    }
    // Always include LinkedIn for social campaigns
    if (selectedPlatforms.some(p => ['instagram', 'facebook', 'twitter'].includes(p))) {
      if (!photoPlatformIds.includes('linkedin')) photoPlatformIds.push('linkedin');
    }

    const platformIds = photoPlatformIds.length > 0
      ? photoPlatformIds
      : PLATFORM_DIMENSIONS.map(d => d.platform);

    onProgress?.({ phase: 'photos', detail: `Resizing ${photos.length} photos for ${platformIds.length} platforms...`, step: 1, totalSteps: 6 });

    const resized = await resizeAllPhotos(photos, platformIds);
    for (const photo of resized) {
      archive.append(photo.buffer, { name: `${folderName}/${photo.filename}` });
    }

    // Add originals
    for (let i = 0; i < photos.length; i++) {
      onProgress?.({ phase: 'originals', detail: `Saving original ${i + 1} of ${photos.length}...`, step: 2, totalSteps: 6 });
      try {
        const res = await fetch(photos[i]);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const ext = photos[i].split('.').pop()?.split('?')[0] || 'jpg';
          archive.append(buf, { name: `${folderName}/Originals/photo-${String(i + 1).padStart(2, '0')}.${ext}` });
        }
      } catch {
        // Skip failed original downloads
      }
    }
  }

  // 2. Generate and add PDF
  onProgress?.({ phase: 'pdf', detail: 'Generating campaign PDF...', step: 3, totalSteps: 6 });
  const pdfBuffer = await generatePdfBuffer(campaign);
  archive.append(Buffer.from(pdfBuffer), { name: `${folderName}/Campaign-Full.pdf` });

  // 3. Finalize — set up finish listener BEFORE finalize to avoid race condition
  const writableFinished = new Promise<void>((resolve, reject) => {
    writable.on('finish', resolve);
    writable.on('error', reject);
  });

  onProgress?.({ phase: 'zip', detail: 'Compressing files...', step: 4, totalSteps: 6 });
  await archive.finalize();
  await writableFinished;

  return Buffer.concat(chunks);
}
