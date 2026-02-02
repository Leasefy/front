'use client';

import { MapPin, Building2, Navigation } from 'lucide-react';
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
          <Label className="text-base font-medium text-black">Ciudad</Label>
          <p className="text-sm text-black/50 mt-1">
            Selecciona la ciudad donde esta ubicado tu inmueble
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
                  'relative p-4 rounded-sm border-2 text-left transition-all',
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 hover:border-black/30 bg-white'
                )}
              >
                <Building2 className={cn(
                  'w-5 h-5 mb-2',
                  isSelected ? 'text-white' : 'text-black/30'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-white' : 'text-black'
                )}>
                  {city}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Neighborhood - Free text input */}
      <div className="space-y-2">
        <Label htmlFor="neighborhood" className="text-base font-medium text-black">
          Barrio
        </Label>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
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
          <p className="text-xs text-amber-600">
            Primero selecciona una ciudad
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-base font-medium text-black">
          Direccion completa
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <Input
            id="address"
            type="text"
            placeholder="Calle 123 #45-67, Apto 101"
            value={draft.address}
            onChange={(e) => updateDraft({ address: e.target.value })}
            className="pl-10 h-12 text-base"
          />
        </div>
        <p className="text-xs text-black/40 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          La direccion exacta solo sera visible para inquilinos confirmados
        </p>
      </div>
    </div>
  );
}
