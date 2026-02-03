'use client';

import { MapPin, Building2, Navigation, Check } from 'lucide-react';
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
          <Label className="text-base font-medium text-foreground">Ciudad</Label>
          <p className="text-sm text-muted-foreground mt-1">
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
                  'relative p-4 rounded-[1px] border text-left transition-all duration-200',
                  isSelected
                    ? 'border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(91,95,239,0.15)]'
                    : 'border-border hover:border-border bg-card hover:shadow-sm'
                )}
              >
                <div className={cn(
                  'absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-border'
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <Building2 className={cn(
                  'w-5 h-5 mb-2 transition-colors',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-foreground' : 'text-foreground/80'
                )}>
                  {city}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground italic">
          Pronto estaremos en más ciudades de Colombia.
        </p>
      </div>

      {/* Neighborhood - Free text input */}
      <div className="space-y-2">
        <Label htmlFor="neighborhood" className="text-base font-medium text-foreground">
          Barrio
        </Label>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
        <Label htmlFor="address" className="text-base font-medium text-foreground">
          Direccion completa
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="address"
            type="text"
            placeholder="Calle 123 #45-67, Apto 101"
            value={draft.address}
            onChange={(e) => updateDraft({ address: e.target.value })}
            className="pl-10 h-12 text-base"
          />
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          La direccion exacta solo sera visible para inquilinos confirmados
        </p>
      </div>
    </div>
  );
}
