'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageSquare, X } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { IconButton } from '@leasefy/cadence';
import {
  PROPERTY_PHOTO_ALLOWED_TYPES,
  PROPERTY_PHOTO_MAX_COUNT,
  validatePropertyPhoto,
} from '@/lib/api/property-photos';

interface PropertyPhotoPickerProps {
  photos: File[];
  onChange: (photos: File[]) => void;
  disabled?: boolean;
  max?: number;
}

/**
 * Photo picker for panel property forms. Client-side validation mirrors the
 * backend POST /properties/:id/images contract (jpg/png/webp, ≤5MB, max 40).
 * Invalid files are rejected on pick with a Spanish toast so the user knows
 * before the property is created.
 */
export function PropertyPhotoPicker({
  photos,
  onChange,
  disabled = false,
  max = PROPERTY_PHOTO_MAX_COUNT,
}: PropertyPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // Object URLs derive from `photos`; revoke the previous set on change/unmount.
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      const invalid = validatePropertyPhoto(file);
      if (invalid) rejected.push(`${file.name}: ${invalid}`);
      else accepted.push(file);
    }

    if (rejected.length > 0) {
      toast.error('Algunas fotos no son válidas', {
        description: rejected.slice(0, 3).join(' · '),
      });
    }

    const next = [...photos, ...accepted];
    if (next.length > max) {
      toast.error(`Máximo ${max} fotos por propiedad.`);
    }
    onChange(next.slice(0, max));

    // Allow re-selecting the same file after removal.
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={PROPERTY_PHOTO_ALLOWED_TYPES.join(',')}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
        data-testid="property-photo-input"
      />
      <div className="flex flex-wrap gap-3">
        {previews.map((url, i) => (
          <div
            key={`${photos[i]?.name ?? i}-${i}`}
            className="relative w-20 h-20 rounded-xl border border-border bg-center bg-cover"
            style={{ backgroundImage: `url(${url})` }}
            data-testid="property-photo-preview"
          >
            <IconButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeAt(i)}
              aria-label="Quitar foto"
              className="absolute -top-2 -right-2 h-6 w-6 min-h-0 min-w-0 rounded-full bg-card text-fg-muted"
              icon={<X className="w-3.5 h-3.5" />}
            />
          </div>
        ))}
        {photos.length < max && (
          // allowlist: custom photo-add tile (square dashed dropzone opening the
          // hidden file input) — same precedent as PropertyIACapture. Native.
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-surface-muted/40 hover:bg-surface-muted/70 flex flex-col items-center justify-center gap-1 text-fg-muted transition-colors disabled:opacity-50"
            data-testid="property-photo-add"
          >
            <ImageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">Agregar</span>
          </button>
        )}
      </div>
      <p className="text-xs text-fg-muted">
        Hasta {max} fotos. JPG, PNG o WebP, máx. 5MB cada una.
      </p>
    </div>
  );
}
