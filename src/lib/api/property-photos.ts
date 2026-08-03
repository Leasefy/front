/**
 * Property photo upload helpers.
 *
 * Client-side validation mirrors the backend contract of
 * POST /properties/:id/images (properties.controller.ts): field `file`,
 * jpg/png/webp only, max 5MB per file, max 10 images per property.
 *
 * Uploads are sequential so the backend `order` field follows the order the
 * user picked the photos in. Per-file failures are collected instead of
 * thrown: the property already exists at this point, so a failed photo must
 * never surface as a failed creation.
 */

import { propertiesApi } from './properties.service';

export const PROPERTY_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PROPERTY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROPERTY_PHOTO_MAX_COUNT = 10;

/** Spanish user-facing validation error, or null when the file is valid. */
export function validatePropertyPhoto(file: File): string | null {
  if (!PROPERTY_PHOTO_ALLOWED_TYPES.includes(file.type)) {
    return 'Formato no soportado. Usa JPG, PNG o WebP.';
  }
  if (file.size > PROPERTY_PHOTO_MAX_BYTES) {
    return 'El archivo excede el límite de 5MB.';
  }
  return null;
}

export interface PropertyPhotoUploadResult {
  uploaded: number;
  failed: { name: string; reason: string }[];
}

/**
 * Upload photos for an already-created property, one by one.
 * Invalid files (type/size) and per-file upload errors land in `failed`;
 * the promise itself never rejects for a single bad photo.
 */
export async function uploadPropertyPhotos(
  propertyId: string,
  files: File[],
): Promise<PropertyPhotoUploadResult> {
  const result: PropertyPhotoUploadResult = { uploaded: 0, failed: [] };

  for (const file of files.slice(0, PROPERTY_PHOTO_MAX_COUNT)) {
    const invalid = validatePropertyPhoto(file);
    if (invalid) {
      result.failed.push({ name: file.name, reason: invalid });
      continue;
    }
    try {
      await propertiesApi.uploadImage(propertyId, file);
      result.uploaded += 1;
    } catch (err) {
      result.failed.push({
        name: file.name,
        reason: err instanceof Error ? err.message : 'Error al subir la foto',
      });
    }
  }

  return result;
}
