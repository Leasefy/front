'use client';

/**
 * Desde / hasta, en `AAAA-MM-DD`, que es lo que viaja al back (`RangoDto`).
 * Los dos opcionales: sin «desde» el informe arranca en el primer asiento.
 */

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { rangoInvertido } from '@/lib/contabilidad/fechas';

export interface RangoDeFechasProps {
  desde: string;
  hasta: string;
  onChange: (rango: { desde: string; hasta: string }) => void;
  disabled?: boolean;
}

export function RangoDeFechas({ desde, hasta, onChange, disabled }: RangoDeFechasProps) {
  const id = useId();
  const invertido = rangoInvertido(desde, hasta);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-desde`}>Desde</Label>
        <Input
          id={`${id}-desde`}
          type="date"
          value={desde}
          max={hasta || undefined}
          disabled={disabled}
          aria-invalid={invertido || undefined}
          onChange={(e) => onChange({ desde: e.target.value, hasta })}
          data-testid="rango-desde"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-hasta`}>Hasta</Label>
        <Input
          id={`${id}-hasta`}
          type="date"
          value={hasta}
          min={desde || undefined}
          disabled={disabled}
          aria-invalid={invertido || undefined}
          onChange={(e) => onChange({ desde, hasta: e.target.value })}
          data-testid="rango-hasta"
        />
      </div>
      {invertido ? (
        <p className="col-span-2 text-xs text-danger" role="alert">
          «Desde» es posterior a «hasta».
        </p>
      ) : null}
    </div>
  );
}
