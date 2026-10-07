'use client';

/**
 * Desde / hasta, en `AAAA-MM-DD`, que es lo que viaja al back (`RangoDto`).
 * Los dos opcionales: sin «desde» el informe arranca en el primer asiento.
 *
 * 🔴 CB-04 (QA de Contabilidad, 03-10-2026): eran dos `<input type="date">` del
 * navegador que en el libro se cortaban («dd/mm/yy'»). Ahora son el selector de
 * fecha del DS (`CampoDeDia`), con «Quitar la fecha» porque los dos son
 * opcionales y el calendario sólo elige días.
 */

import { useId } from 'react';

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { Label } from '@/components/ui/label';
import { rangoInvertido } from '@/lib/contabilidad/fechas';
import { CampoDeDia } from './CampoDeDia';

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
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${id}-desde`}>Desde</Label>
        <CampoDeDia
          id={`${id}-desde`}
          value={desde}
          max={hasta || undefined}
          disabled={disabled}
          invalido={invertido}
          describedBy={invertido ? `${id}-rango-error` : undefined}
          onChange={(valor) => onChange({ desde: valor, hasta })}
          placeholder="Sin fecha"
          quitable
          etiquetaDeQuitar="Quitar la fecha «desde»"
          testid="rango-desde"
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${id}-hasta`}>Hasta</Label>
        <CampoDeDia
          id={`${id}-hasta`}
          value={hasta}
          min={desde || undefined}
          disabled={disabled}
          invalido={invertido}
          describedBy={invertido ? `${id}-rango-error` : undefined}
          onChange={(valor) => onChange({ desde, hasta: valor })}
          placeholder="Sin fecha"
          quitable
          etiquetaDeQuitar="Quitar la fecha «hasta»"
          testid="rango-hasta"
        />
      </div>
      {/* El error es de los DOS campos: los dos lo nombran en `aria-describedby`. */}
      <ErrorDelCampo
        id={`${id}-rango-error`}
        className="col-span-2 mt-0"
        mensaje={invertido ? '«Desde» es posterior a «hasta».' : null}
      />
    </div>
  );
}
