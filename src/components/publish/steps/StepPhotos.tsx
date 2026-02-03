'use client';

import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, GripVertical, AlertCircle } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function StepPhotos() {
  const { draft, updateDraft } = usePublish();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    const remaining = MAX_PHOTOS - draft.photos.length;

    if (remaining <= 0) {
      setError('Máximo de fotos alcanzado.');
      return;
    }

    const validFiles: File[] = [];
    for (const file of fileArray.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Solo se aceptan imágenes JPG, PNG o WebP.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('Cada imagen debe pesar menos de 10MB.');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const urls = validFiles.map((f) => URL.createObjectURL(f));
      updateDraft({ photos: [...draft.photos, ...urls] });
    }
  }, [draft.photos, updateDraft]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeaveZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removePhoto = (index: number) => {
    const url = draft.photos[index];
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    const updated = draft.photos.filter((_, i) => i !== index);
    updateDraft({ photos: updated });
  };

  // Drag-to-reorder
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...draft.photos];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, removed);
    updateDraft({ photos: updated });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const isFull = draft.photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">
          Fotos del inmueble
        </h3>
        <p className="text-sm text-muted-foreground">
          Agrega al menos 1 foto. La primera será la imagen principal.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload area */}
      <button
        type="button"
        onClick={() => !isFull && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOverZone}
        onDragLeave={handleDragLeaveZone}
        disabled={isFull}
        className={cn(
          'w-full border-2 border-dashed rounded-sm p-8 text-center transition-colors',
          isFull
            ? 'border-border bg-black/[0.02] cursor-not-allowed'
            : isDragOver
              ? 'border-black bg-black/[0.04]'
              : 'border-border hover:border-border hover:bg-black/[0.02]'
        )}
      >
        <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground/70">
          {isFull
            ? 'Máximo de fotos alcanzado'
            : isDragOver
              ? 'Suelta las fotos aquí'
              : 'Haz clic o arrastra fotos aquí'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {draft.photos.length}/{MAX_PHOTOS} fotos · JPG, PNG o WebP · Máx 10MB
        </p>
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Photo grid */}
      {draft.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {draft.photos.map((photo, index) => (
            <div
              key={`${photo}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'relative aspect-[4/3] rounded-sm overflow-hidden group cursor-move',
                'border-2 border-transparent',
                draggedIndex === index && 'border-black opacity-50'
              )}
            >
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

              {/* Primary badge */}
              {index === 0 && (
                <span className="absolute top-2 left-2 px-2 py-1 bg-black text-white text-xs font-medium rounded-sm">
                  Principal
                </span>
              )}

              {/* Drag handle */}
              <div className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-5 h-5 text-white drop-shadow-lg" />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 w-8 h-8 md:w-6 md:h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Add more button inside grid */}
          {!isFull && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] rounded-sm border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-border transition-colors"
            >
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Agregar</span>
            </button>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="flex items-start gap-3 p-4 bg-black/[0.02] rounded-sm">
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground/70 mb-1">Tips para mejores fotos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Usa luz natural cuando sea posible</li>
            <li>Muestra todas las habitaciones principales</li>
            <li>Asegúrate de que el espacio esté ordenado</li>
            <li>Arrastra las fotos para reordenarlas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
