'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
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
        <h3 className="text-sm font-medium text-foreground mb-1">
          Que amenidades tiene tu inmueble?
        </h3>
        <p className="text-sm text-muted-foreground">
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
                'flex items-center gap-3 px-4 py-3 rounded-[1px] border text-left transition-all duration-200',
                isSelected
                  ? 'border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(91,95,239,0.15)]'
                  : 'border-border hover:border-border bg-card hover:shadow-sm'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-[1.5px] transition-all duration-200',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-border'
              )}>
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className={cn(
                'text-sm',
                isSelected ? 'text-foreground font-medium' : 'text-foreground/70'
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
            className="flex items-center gap-3 px-4 py-3 rounded-[1px] border border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(91,95,239,0.15)] text-left transition-all duration-200"
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-[1.5px] bg-primary border-primary">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <span className="text-sm text-foreground font-medium">{amenity}</span>
          </button>
        ))}

        {/* "Otro" button */}
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-[1px] border border-dashed border-border text-left transition-all duration-200 hover:border-border hover:shadow-sm"
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-[1.5px] border-border">
              <Plus className="w-3 h-3 text-muted-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-sm text-muted-foreground">Otro</span>
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
            <button
              type="button"
              onClick={addCustom}
              disabled={!customValue.trim()}
              className="px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-30 transition-opacity"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => { setShowCustom(false); setCustomValue(''); }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {draft.amenities.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {draft.amenities.length} amenidad{draft.amenities.length !== 1 ? 'es' : ''} seleccionada{draft.amenities.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
