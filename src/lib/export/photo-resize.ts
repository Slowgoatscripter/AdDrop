import sharp from 'sharp';
import { PLATFORM_DIMENSIONS, isAllowedPhotoUrl, type PlatformDimension } from './platform-dimensions';

export interface ResizedPhoto {
  buffer: Buffer;
  filename: string;
  width: number;
  height: number;
}

/**
 * Fetches a photo from URL and resizes it to the given dimensions.
 * Validates URL against allowed domains (SSRF protection).
 */
export async function resizePhoto(
  photoUrl: string,
  dimension: PlatformDimension,
  index?: number,
): Promise<ResizedPhoto> {
  if (!isAllowedPhotoUrl(photoUrl)) {
    throw new Error(`Blocked photo URL: not from allowed domain`);
  }

  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${response.status}`);
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());

  const outputBuffer = await sharp(inputBuffer)
    .resize(dimension.width, dimension.height, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const suffix = index !== undefined ? `-${String(index + 1).padStart(2, '0')}` : '';
  const filename = `${dimension.filenamePrefix}-${dimension.width}x${dimension.height}${suffix}.jpg`;

  return {
    buffer: outputBuffer,
    filename,
    width: dimension.width,
    height: dimension.height,
  };
}

/**
 * Resizes a single photo to all platform dimensions.
 * Returns array of resized photos.
 */
export async function resizePhotoAllPlatforms(
  photoUrl: string,
  platformIds: string[],
  index?: number,
): Promise<ResizedPhoto[]> {
  const dimensions = PLATFORM_DIMENSIONS.filter(d =>
    platformIds.some(id => d.platform.startsWith(id) || d.platform === id)
  );

  // Process in batches of 3 to avoid memory pressure
  const results: ResizedPhoto[] = [];
  for (let i = 0; i < dimensions.length; i += 3) {
    const batch = dimensions.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(dim => resizePhoto(photoUrl, dim, index))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Resizes all photos for all platforms. Processes photos sequentially,
 * platform dimensions in batches of 3.
 */
export async function resizeAllPhotos(
  photoUrls: string[],
  platformIds: string[],
): Promise<ResizedPhoto[]> {
  const allResults: ResizedPhoto[] = [];

  for (let photoIndex = 0; photoIndex < photoUrls.length; photoIndex++) {
    const results = await resizePhotoAllPlatforms(
      photoUrls[photoIndex],
      platformIds,
      photoIndex,
    );
    allResults.push(...results);
  }

  return allResults;
}
