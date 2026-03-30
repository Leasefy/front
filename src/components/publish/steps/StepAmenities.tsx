'use client';

import { useState } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { AMENITIES_OPTIONS } from '@/lib/types/publish';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function StepAmenities() {
  const { draft, updateDraft } = usePublish();
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const toggleAmenity = (amenity: string) => {
    const current = draft.amenities;
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    updateDraft({ amenities: updated });
  };

  const predefinedValues = AMENITIES_OPTIONS.map(a => a.value);
  const customAmenities = draft.amenities.filter(a => !predefinedValues.includes(a));

  const addCustom = () => {
    const trimmed = customValue.trim();
    if (trimmed && !draft.amenities.includes(trimmed)) {
      updateDraft({ amenities: [...draft.amenities, trimmed] });
    }
    setCustomValue('');
    setShowCustom(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
          ¿Qué amenidades tiene tu inmueble?
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#2a2a2c] hover:shadow-sm'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
                isSelected
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'border-neutral-300 dark:border-neutral-600'
              )}>
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className={cn(
                'text-sm',
                isSelected ? 'text-neutral-900 dark:text-white font-medium' : 'text-neutral-700 dark:text-neutral-300'
              )}>
                {amenity.label}
              </span>
            </button>
          );
        })}

        {/* Custom amenities */}
        {customAmenities.map((amenity) => (
          <button
            key={amenity}
            type="button"
            onClick={() => toggleAmenity(amenity)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm text-left transition-all duration-200"
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 bg-indigo-600 border-indigo-600">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <span className="text-sm text-neutral-900 dark:text-white font-medium">{amenity}</span>
          </button>
        ))}

        {/* "Otro" button */}
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 text-left transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-sm bg-white dark:bg-[#2a2a2c]"
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 border-neutral-300 dark:border-neutral-600">
              <Plus className="w-3 h-3 text-neutral-400 dark:text-neutral-500" strokeWidth={2.5} />
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Otro</span>
          </button>
        ) : (
          <div className="col-span-2 sm:col-span-3 flex items-center gap-2">
            <Input
              autoFocus
              type="text"
              placeholder="Ej: Jacuzzi, Coworking..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustom();
                if (e.key === 'Escape') { setShowCustom(false); setCustomValue(''); }
              }}
              className="flex-1 rounded-xl border-neutral-200 dark:border-neutral-700"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customValue.trim()}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white uppercase tracking-wide font-mono rounded-xl disabled:opacity-30 transition-opacity hover:bg-indigo-700"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => { setShowCustom(false); setCustomValue(''); }}
              className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {draft.amenities.length > 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {draft.amenities.length} amenidad{draft.amenities.length !== 1 ? 'es' : ''} seleccionada{draft.amenities.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
