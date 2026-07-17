/**
 * property-photos.test.ts — client-side validation + sequential upload.
 *
 * Coverage:
 *   (1) validatePropertyPhoto: accepts jpg/png/webp ≤5MB, rejects others (Spanish messages)
 *   (2) uploadPropertyPhotos: uploads valid files in order via propertiesApi.uploadImage
 *   (3) per-file failures are collected, never thrown (property already exists)
 *   (4) invalid files are skipped without calling the API
 *   (5) respects the 10-photo backend cap
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../properties.service', () => ({
  propertiesApi: {
    uploadImage: vi.fn(),
  },
}));

import { propertiesApi } from '../properties.service';
import {
  validatePropertyPhoto,
  uploadPropertyPhotos,
  PROPERTY_PHOTO_MAX_COUNT,
} from '../property-photos';

const uploadImage = propertiesApi.uploadImage as unknown as ReturnType<typeof vi.fn>;

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadImage.mockResolvedValue({ id: 'img-1', url: 'https://cdn.test/1.jpg', order: 0 });
});

describe('validatePropertyPhoto', () => {
  it('accepts jpg, png and webp under 5MB', () => {
    expect(validatePropertyPhoto(makeFile('a.jpg', 'image/jpeg'))).toBeNull();
    expect(validatePropertyPhoto(makeFile('a.png', 'image/png'))).toBeNull();
    expect(validatePropertyPhoto(makeFile('a.webp', 'image/webp'))).toBeNull();
  });

  it('rejects unsupported types with a Spanish message', () => {
    expect(validatePropertyPhoto(makeFile('a.gif', 'image/gif'))).toBe(
      'Formato no soportado. Usa JPG, PNG o WebP.',
    );
    expect(validatePropertyPhoto(makeFile('a.heic', 'image/heic'))).toBe(
      'Formato no soportado. Usa JPG, PNG o WebP.',
    );
  });

  it('rejects files over 5MB with a Spanish message', () => {
    expect(validatePropertyPhoto(makeFile('big.png', 'image/png', 5 * 1024 * 1024 + 1))).toBe(
      'El archivo excede el límite de 5MB.',
    );
  });
});

describe('uploadPropertyPhotos', () => {
  it('uploads valid files sequentially in pick order', async () => {
    const f1 = makeFile('1.jpg', 'image/jpeg');
    const f2 = makeFile('2.png', 'image/png');

    const result = await uploadPropertyPhotos('prop-1', [f1, f2]);

    expect(result).toEqual({ uploaded: 2, failed: [] });
    expect(uploadImage).toHaveBeenNthCalledWith(1, 'prop-1', f1);
    expect(uploadImage).toHaveBeenNthCalledWith(2, 'prop-1', f2);
  });

  it('collects per-file upload failures without rejecting', async () => {
    uploadImage
      .mockResolvedValueOnce({ id: 'img-1', url: 'u', order: 0 })
      .mockRejectedValueOnce(new Error('Upload failed: 500'));

    const result = await uploadPropertyPhotos('prop-1', [
      makeFile('ok.jpg', 'image/jpeg'),
      makeFile('bad.png', 'image/png'),
    ]);

    expect(result.uploaded).toBe(1);
    expect(result.failed).toEqual([{ name: 'bad.png', reason: 'Upload failed: 500' }]);
  });

  it('skips invalid files without calling the API', async () => {
    const result = await uploadPropertyPhotos('prop-1', [
      makeFile('a.gif', 'image/gif'),
      makeFile('b.jpg', 'image/jpeg'),
    ]);

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(result.uploaded).toBe(1);
    expect(result.failed).toEqual([
      { name: 'a.gif', reason: 'Formato no soportado. Usa JPG, PNG o WebP.' },
    ]);
  });

  it('caps uploads at the backend limit of 10 photos', async () => {
    const files = Array.from({ length: PROPERTY_PHOTO_MAX_COUNT + 3 }, (_, i) =>
      makeFile(`${i}.jpg`, 'image/jpeg'),
    );

    const result = await uploadPropertyPhotos('prop-1', files);

    expect(uploadImage).toHaveBeenCalledTimes(PROPERTY_PHOTO_MAX_COUNT);
    expect(result.uploaded).toBe(PROPERTY_PHOTO_MAX_COUNT);
  });
});
