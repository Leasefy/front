'use client';

import { MapPin, Buildings, Check, Compass } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { CITIES } from '@/lib/types/publish';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function StepLocation() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-8">
      {/* City Selection - Visual Cards */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium text-neutral-900 dark:text-white">Ciudad</Label>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
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
                className={cn(
                  'relative p-4 rounded-xl border text-left transition-all duration-200',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#2a2a2c] hover:shadow-sm'
                )}
              >
                <div className={cn(
                  'absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600'
                    : 'border-neutral-300 dark:border-neutral-600'
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <Buildings className={cn(
                  'w-5 h-5 mb-2 transition-colors',
                  isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'
                )}>
                  {city}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
          Pronto estaremos en más ciudades de Colombia.
        </p>
      </div>

      {/* Neighborhood - Free text input */}
      <div className="space-y-2">
        <Label htmlFor="neighborhood" className="text-base font-medium text-neutral-900 dark:text-white">
          Barrio
        </Label>
        <div className="relative">
          <Compass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            id="neighborhood"
            type="text"
            placeholder="Ej: Chapinero, El Poblado, Granada..."
            value={draft.neighborhood}
            onChange={(e) => updateDraft({ neighborhood: e.target.value })}
            className="pl-10 h-12 text-base rounded-xl border-neutral-200 dark:border-neutral-700"
            disabled={!draft.city}
          />
        </div>
        {!draft.city && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Primero selecciona una ciudad
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-base font-medium text-neutral-900 dark:text-white">
          Dirección completa
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            id="address"
            type="text"
            placeholder="Calle 123 #45-67, Apto 101"
            value={draft.address}
            onChange={(e) => updateDraft({ address: e.target.value })}
            className="pl-10 h-12 text-base rounded-xl border-neutral-200 dark:border-neutral-700"
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          La dirección exacta solo será visible para inquilinos confirmados
        </p>
      </div>
    </div>
  );
}
