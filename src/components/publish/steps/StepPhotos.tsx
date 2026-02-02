'use client';

import { useState } from 'react';
import { ImagePlus, X, GripVertical, AlertCircle } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { cn } from '@/lib/utils';

// Sample placeholder images for demo
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800',
];

export function StepPhotos() {
  const { draft, updateDraft } = usePublish();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addSamplePhoto = () => {
    const availableImages = SAMPLE_IMAGES.filter(img => !draft.photos.includes(img));
    if (availableImages.length > 0) {
      const randomImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      updateDraft({ photos: [...draft.photos, randomImage] });
    }
  };

  const removePhoto = (index: number) => {
    const updated = draft.photos.filter((_, i) => i !== index);
    updateDraft({ photos: updated });
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-black mb-1">
          Fotos del inmueble
        </h3>
        <p className="text-sm text-black/50">
          Agrega al menos 1 foto. La primera sera la imagen principal.
        </p>
      </div>

      {/* Upload area */}
      <button
        type="button"
        onClick={addSamplePhoto}
        disabled={draft.photos.length >= 10}
        className={cn(
          'w-full border-2 border-dashed rounded-sm p-8 text-center transition-colors',
          draft.photos.length >= 10
            ? 'border-black/10 bg-black/[0.02] cursor-not-allowed'
            : 'border-black/20 hover:border-black/40 hover:bg-black/[0.02]'
        )}
      >
        <ImagePlus className="w-10 h-10 mx-auto text-black/30 mb-3" />
        <p className="text-sm font-medium text-black/70">
          {draft.photos.length >= 10 ? 'Maximo de fotos alcanzado' : 'Haz clic para agregar fotos'}
        </p>
        <p className="text-xs text-black/40 mt-1">
          {draft.photos.length}/10 fotos
        </p>
      </button>

      {/* Photo grid */}
      {draft.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {draft.photos.map((photo, index) => (
            <div
              key={photo}
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
        </div>
      )}

      {/* Tips */}
      <div className="flex items-start gap-3 p-4 bg-black/[0.02] rounded-sm">
        <AlertCircle className="w-5 h-5 text-black/40 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-black/60">
          <p className="font-medium text-black/70 mb-1">Tips para mejores fotos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Usa luz natural cuando sea posible</li>
            <li>Muestra todas las habitaciones principales</li>
            <li>Asegurate de que el espacio este ordenado</li>
            <li>Arrastra las fotos para reordenarlas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
