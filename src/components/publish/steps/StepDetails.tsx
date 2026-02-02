'use client';

import { Bed, Bath, Maximize2, Car, Building, Calendar, Layers } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  icon: React.ReactNode;
  suffix?: string;
}

function NumberInput({ label, value, onChange, min = 0, max = 99, icon, suffix }: NumberInputProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-sm border border-black/10 flex items-center justify-center text-black/60 hover:border-black/20 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
        >
          -
        </button>
        <div className="flex-1 relative">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const num = parseInt(e.target.value) || min;
              onChange(Math.min(max, Math.max(min, num)));
            }}
            min={min}
            max={max}
            className="text-center"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-black/40">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-sm border border-black/10 flex items-center justify-center text-black/60 hover:border-black/20 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function StepDetails() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-black mb-1">
          Caracteristicas del inmueble
        </h3>
        <p className="text-sm text-black/50">
          Describe las especificaciones de tu propiedad
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <NumberInput
          label="Habitaciones"
          value={draft.bedrooms}
          onChange={(value) => updateDraft({ bedrooms: value })}
          min={1}
          max={10}
          icon={<Bed className="w-4 h-4 text-black/40" />}
        />

        <NumberInput
          label="Banos"
          value={draft.bathrooms}
          onChange={(value) => updateDraft({ bathrooms: value })}
          min={1}
          max={10}
          icon={<Bath className="w-4 h-4 text-black/40" />}
        />

        <NumberInput
          label="Area"
          value={draft.area}
          onChange={(value) => updateDraft({ area: value })}
          min={10}
          max={1000}
          icon={<Maximize2 className="w-4 h-4 text-black/40" />}
          suffix="m²"
        />

        <NumberInput
          label="Parqueaderos"
          value={draft.parkingSpaces}
          onChange={(value) => updateDraft({ parkingSpaces: value })}
          min={0}
          max={5}
          icon={<Car className="w-4 h-4 text-black/40" />}
        />

        <NumberInput
          label="Piso"
          value={draft.floor}
          onChange={(value) => updateDraft({ floor: value })}
          min={1}
          max={50}
          icon={<Building className="w-4 h-4 text-black/40" />}
        />

        <NumberInput
          label="Estrato"
          value={draft.stratum}
          onChange={(value) => updateDraft({ stratum: value })}
          min={1}
          max={6}
          icon={<Layers className="w-4 h-4 text-black/40" />}
        />
      </div>

      <div className="pt-4 border-t border-black/5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-black/40" />
            Ano de construccion
          </Label>
          <Input
            type="number"
            value={draft.yearBuilt}
            onChange={(e) => updateDraft({ yearBuilt: parseInt(e.target.value) || 2000 })}
            min={1900}
            max={new Date().getFullYear()}
            className="max-w-[150px]"
          />
        </div>
      </div>
    </div>
  );
}
