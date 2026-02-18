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
  phase: string;
  detail: string;
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

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(writable);

  const address = campaign.listing?.address?.street?.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Campaign';
  const folderName = address;

  // 1. Resize and add photos
  const photos = campaign.listing?.photos?.filter(Boolean) || [];
  if (photos.length > 0) {
    onProgress?.({ phase: 'photos', detail: `Processing ${photos.length} photos...` });

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

    const resized = await resizeAllPhotos(photos, platformIds);
    for (const photo of resized) {
      archive.append(photo.buffer, { name: `${folderName}/${photo.filename}` });
    }

    // Add originals
    for (let i = 0; i < photos.length; i++) {
      onProgress?.({ phase: 'originals', detail: `Adding original ${i + 1}/${photos.length}...` });
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
  onProgress?.({ phase: 'pdf', detail: 'Generating campaign PDF...' });
  const pdfBuffer = await generatePdfBuffer(campaign);
  archive.append(Buffer.from(pdfBuffer), { name: `${folderName}/Campaign-Full.pdf` });

  // 3. Finalize
  await archive.finalize();

  await new Promise<void>((resolve, reject) => {
    writable.on('finish', resolve);
    writable.on('error', reject);
  });

  return Buffer.concat(chunks);
}
