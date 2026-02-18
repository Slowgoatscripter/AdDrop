import { createClient } from '@/lib/supabase/client';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 25;
const BUCKET = 'property-images';

interface UploadResult {
  urls: string[];
  errors: string[];
}

/**
 * Upload property images to Supabase Storage in parallel.
 * Returns HTTPS public URLs for successfully uploaded files.
 */
export async function uploadPropertyImages(
  files: File[],
  userId: string,
  existingCount: number = 0
): Promise<UploadResult> {
  const urls: string[] = [];
  const errors: string[] = [];

  // Cap total photos
  const remaining = MAX_PHOTOS - existingCount;
  if (remaining <= 0) {
    return { urls: [], errors: ['Maximum of 25 photos reached.'] };
  }

  const filesToUpload = files.slice(0, remaining);
  if (filesToUpload.length < files.length) {
    errors.push(`Only uploading ${filesToUpload.length} of ${files.length} files (25 photo limit).`);
  }

  // Validate all files before uploading
  const validFiles: File[] = [];
  for (const file of filesToUpload) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`${file.name}: unsupported type (use PNG, JPEG, WebP, or GIF).`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: exceeds 10MB limit.`);
      continue;
    }
    validFiles.push(file);
  }

  if (validFiles.length === 0) {
    return { urls, errors };
  }

  const supabase = createClient();

  const results = await Promise.allSettled(
    validFiles.map(async (file) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const path = `${userId}/${Date.now()}-${randomSuffix}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`${file.name}: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      return urlData.publicUrl;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      urls.push(result.value);
    } else {
      errors.push(result.reason?.message || 'Upload failed');
    }
  }

  return { urls, errors };
}

/**
 * Delete a single property image from Supabase Storage.
 */
export async function deletePropertyImage(path: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { error: error.message };
  return {};
}
