'use client';

import { Buildings, Check, Compass } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { CITIES } from '@/lib/types/publish';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PropertyLocationField } from '@/components/publicar/PropertyLocationField';
import { cn } from '@/lib/utils';

export function StepLocation() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-8">
      {/* City Selection - Visual Cards */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium text-fg">Ciudad</Label>
          <p className="text-sm text-fg-muted mt-1">
            Selecciona la ciudad donde está ubicado tu inmueble
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CITIES.map((city) => {
            const isSelected = draft.city === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => updateDraft({ city })}
                style={isSelected ? { boxShadow: '0 0 0 3px rgba(26,64,255,0.12)' } : undefined}
                className={cn(
                  'relative p-4 rounded-[18px] text-left transition-all duration-200',
                  isSelected
                    ? 'border-2 border-primary bg-primary-soft'
                    : 'border border-border hover:border-border-strong bg-surface'
                )}
              >
                <div className={cn(
                  'absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-border-strong'
                )}>
                  {isSelected && <Check className="w-3 h-3 text-primary-fg" weight="bold" />}
                </div>
                <Buildings className={cn(
                  'w-5 h-5 mb-2 transition-colors',
                  isSelected ? 'text-primary' : 'text-fg-subtle'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-fg' : 'text-fg-muted'
                )}>
                  {city}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-fg-subtle italic">
          Pronto estaremos en más ciudades de Colombia.
        </p>
      </div>

      {/* Neighborhood - Free text input */}
      <div className="space-y-2">
        <Label htmlFor="neighborhood" className="text-base font-medium text-fg">
          Barrio
        </Label>
        <div className="relative">
          <Compass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle z-10" />
          <Input
            id="neighborhood"
            type="text"
            placeholder="Ej: Chapinero, El Poblado, Granada..."
            value={draft.neighborhood}
            onChange={(e) => updateDraft({ neighborhood: e.target.value })}
            className="pl-10 h-12 text-base"
            disabled={!draft.city}
          />
        </div>
        {!draft.city && (
          <p className="text-xs text-warning">
            Primero selecciona una ciudad
          </p>
        )}
      </div>

      {/* Address — autocomplete when possible, always usable as free text */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-base font-medium text-fg">
          Dirección completa
        </Label>
        <PropertyLocationField
          id="address"
          placeholder="Calle 123 #45-67, Apto 101"
          address={draft.address}
          city={draft.city}
          latitude={draft.latitude}
          longitude={draft.longitude}
          onChange={updateDraft}
        />
        <p className="text-xs text-fg-muted flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          La dirección exacta solo será visible para inquilinos confirmados
        </p>
      </div>
    </div>
  );
}
