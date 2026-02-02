'use client';

import { Check } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { AMENITIES_OPTIONS } from '@/lib/types/publish';
import { cn } from '@/lib/utils';

export function StepAmenities() {
  const { draft, updateDraft } = usePublish();

  const toggleAmenity = (amenity: string) => {
    const current = draft.amenities;
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    updateDraft({ amenities: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-black mb-1">
          Que amenidades tiene tu inmueble?
        </h3>
        <p className="text-sm text-black/50">
          Selecciona todas las que apliquen. Esto ayuda a destacar tu propiedad.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {AMENITIES_OPTIONS.map((amenity) => {
          const isSelected = draft.amenities.includes(amenity.value);

          return (
            <button
              key={amenity.value}
              type="button"
              onClick={() => toggleAmenity(amenity.value)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-sm border-2 text-left transition-all',
                isSelected
                  ? 'border-black bg-black/[0.02]'
                  : 'border-black/10 hover:border-black/20'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 border-2',
                isSelected
                  ? 'bg-black border-black'
                  : 'border-black/20'
              )}>
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className={cn(
                'text-sm',
                isSelected ? 'text-black font-medium' : 'text-black/70'
              )}>
                {amenity.label}
              </span>
            </button>
          );
        })}
      </div>

      {draft.amenities.length > 0 && (
        <p className="text-sm text-black/50">
          {draft.amenities.length} amenidad{draft.amenities.length !== 1 ? 'es' : ''} seleccionada{draft.amenities.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
