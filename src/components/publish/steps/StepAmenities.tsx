'use client';

import { useState } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { AMENITIES_OPTIONS } from '@/lib/types/publish';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
        <h3 className="text-sm font-medium text-fg mb-1">
          ¿Qué amenidades tiene tu inmueble?
        </h3>
        <p className="text-sm text-fg-muted">
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
                'flex items-center gap-3 px-4 py-3 rounded-[14px] text-left transition-all duration-200',
                isSelected
                  ? 'border-2 border-primary bg-primary-soft'
                  : 'border border-border hover:border-border-strong bg-surface'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-border-strong'
              )}>
                {isSelected && <Check className="w-3 h-3 text-primary-fg" weight="bold" />}
              </div>
              <span className={cn(
                'text-sm',
                isSelected ? 'text-fg font-medium' : 'text-fg-muted'
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
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-2 border-primary bg-primary-soft text-left transition-all duration-200"
          >
            <div className="w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 border-2 bg-primary border-primary">
              <Check className="w-3 h-3 text-primary-fg" weight="bold" />
            </div>
            <span className="text-sm text-fg font-medium">{amenity}</span>
          </button>
        ))}

        {/* "Otro" button */}
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-dashed border-border-strong text-left transition-all duration-200 hover:border-border-strong hover:bg-surface-hover bg-surface"
          >
            <div className="w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 border-2 border-border-strong">
              <Plus className="w-3 h-3 text-fg-subtle" weight="bold" />
            </div>
            <span className="text-sm text-fg-subtle">Otro</span>
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
              className="flex-1"
            />
            <Button
              type="button"
              onClick={addCustom}
              disabled={!customValue.trim()}
              hideArrow
            >
              Agregar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowCustom(false); setCustomValue(''); }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {draft.amenities.length > 0 && (
        <p className="text-sm text-fg-muted">
          <span className="font-mono tabular-nums">{draft.amenities.length}</span> amenidad{draft.amenities.length !== 1 ? 'es' : ''} seleccionada{draft.amenities.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
