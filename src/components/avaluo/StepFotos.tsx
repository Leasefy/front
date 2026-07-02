'use client';

import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ImageSquare, X, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { uploadPhotoToS3 } from '@/lib/api/avaluo.service';
import { useAvaluo } from './AvaluoContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_ACCEPT = 'image/jpeg,image/png,image/webp';

// ---------------------------------------------------------------------------
// Per-file upload state
// ---------------------------------------------------------------------------

interface UploadingFile {
  /** Temporary blob URL for preview while uploading */
  previewUrl: string;
  /** Original filename */
  filename: string;
}

// ---------------------------------------------------------------------------
// StepFotos — Step 3
// ---------------------------------------------------------------------------

/**
 * Step 3: Photo upload via presigned S3 URLs.
 * Photos are optional — this step is always valid.
 *
 * Stores S3 object keys in formData.photoKeys.
 */
export function StepFotos() {
  const { formData, updateFormData } = useAvaluo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  /** Files currently uploading — keyed by previewUrl */
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const totalCount = formData.photoKeys.length + uploadingFiles.length;
  const isFull = totalCount >= MAX_PHOTOS;

  // ──────────────────────────────────────────────────────────────────────────
  // Upload a single file
  // ──────────────────────────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Solo se aceptan imágenes JPG, PNG o WebP.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Cada imagen debe pesar menos de 10 MB.');
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const entry: UploadingFile = { previewUrl, filename: file.name };

      setUploadingFiles((prev) => [...prev, entry]);

      try {
        const key = await uploadPhotoToS3(file);
        updateFormData({ photoKeys: [...formData.photoKeys, key] });
      } catch {
        toast.error(`No pudimos subir "${file.name}". Intentá de nuevo.`);
      } finally {
        URL.revokeObjectURL(previewUrl);
        setUploadingFiles((prev) => prev.filter((u) => u.previewUrl !== previewUrl));
      }
    },
    [formData.photoKeys, updateFormData]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Process a FileList / File[]
  // ──────────────────────────────────────────────────────────────────────────

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = MAX_PHOTOS - totalCount;

      if (remaining <= 0) {
        toast.error('Ya alcanzaste el máximo de fotos permitidas.');
        return;
      }

      fileArray.slice(0, remaining).forEach((file) => {
        uploadFile(file);
      });
    },
    [totalCount, uploadFile]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Event handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Remove an uploaded key
  // ──────────────────────────────────────────────────────────────────────────

  const removeKey = (index: number) => {
    const next = formData.photoKeys.filter((_, i) => i !== index);
    updateFormData({ photoKeys: next });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">
          Fotos del inmueble{' '}
          <span className="text-fg-muted font-normal">(opcional)</span>
        </h3>
        <p className="text-sm text-fg-muted">
          Las fotos ayudan al avaluador a contextualizar el inmueble. Podés
          continuar sin ellas.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_ACCEPT}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => !isFull && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isFull}
        className={cn(
          'w-full border-2 border-dashed rounded-[20px] p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isFull
            ? 'border-border bg-surface-muted cursor-not-allowed'
            : isDragOver
            ? 'border-primary bg-primary-soft'
            : 'border-border hover:border-border-strong hover:bg-surface-hover'
        )}
      >
        <ImageSquare className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
        <p className="text-sm font-medium text-fg">
          {isFull
            ? 'Máximo de fotos alcanzado'
            : isDragOver
            ? 'Soltá las fotos aquí'
            : 'Hacé clic o arrastrá fotos aquí'}
        </p>
        <p className="text-xs text-fg-subtle mt-1">
          <span className="font-mono tabular-nums">{totalCount}/{MAX_PHOTOS}</span> fotos · JPG, PNG o WebP · Máx 10 MB c/u
        </p>
      </button>

      {/* Uploaded keys list */}
      {formData.photoKeys.length > 0 && (
        <ul className="space-y-2" aria-label="Fotos subidas">
          {formData.photoKeys.map((key, index) => {
            const filename = key.split('/').pop() ?? key;
            return (
              <li
                key={key}
                className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border"
              >
                <ImageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">
                  {filename}
                </span>
                <button
                  type="button"
                  onClick={() => removeKey(index)}
                  className="shrink-0 p-1 rounded-md hover:bg-border transition-colors"
                  aria-label={`Eliminar ${filename}`}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Uploading files (in-progress) */}
      {uploadingFiles.length > 0 && (
        <ul className="space-y-2" aria-label="Subiendo fotos" aria-live="polite">
          {uploadingFiles.map((u) => (
            <li
              key={u.previewUrl}
              className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border opacity-60"
            >
              <CircleNotch className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
              <span className="text-sm text-foreground truncate flex-1">
                {u.filename}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                Subiendo...
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Tips */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border">
        <WarningCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Tips para mejores fotos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Usá luz natural cuando sea posible</li>
            <li>Mostrá todas las habitaciones principales</li>
            <li>Asegurate de que el espacio esté ordenado</li>
            <li>Incluí fachada y áreas comunes si aplica</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
