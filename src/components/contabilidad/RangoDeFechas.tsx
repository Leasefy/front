'use client';

/**
 * Desde / hasta, en `AAAA-MM-DD`, que es lo que viaja al back (`RangoDto`).
 * Los dos opcionales: sin «desde» el informe arranca en el primer asiento.
 *
 * 🔴 CB-04 (QA de Contabilidad, 03-10-2026): eran dos `<input type="date">` del
 * navegador que en el libro se cortaban («dd/mm/yy'»). Ahora son el selector de
 * fecha del DS (`CampoDeDia`), con «Quitar la fecha» porque los dos son
 * opcionales y el calendario sólo elige días.
 *
 * GLOW UP 21-10 · `atajos`: el período casi siempre es «este mes», «el mes pasado» o «este
 * año». Con `atajos`, eso va a un toque (y las dos fechas sólo con «Otro rango»). Lo usan el
 * libro y todos los informes: el período se elige igual en toda la contabilidad.
 */

import { useId, useState } from 'react';
import { SegmentedControl } from '@leasefy/cadence';

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { Label } from '@/components/ui/label';
import { rangoInvertido } from '@/lib/contabilidad/fechas';
import { CampoDeDia } from './CampoDeDia';

export type AtajoDePeriodo = 'mes' | 'anterior' | 'anio' | 'todo' | 'otro';

/** Hoy en Colombia, `AAAA-MM-DD`. */
export function hoyEnColombia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

function ultimoDia(anio: number, mes: number): string {
  return `${anio}-${dosCifras(mes)}-${dosCifras(new Date(Date.UTC(anio, mes, 0)).getUTCDate())}`;
}

/** El rango de cada atajo. «Todo» es sin fechas: el libro entero. */
export function rangoDelAtajo(atajo: Exclude<AtajoDePeriodo, 'otro'>): { desde: string; hasta: string } {
  if (atajo === 'todo') return { desde: '', hasta: '' };
  const [anio, mes] = hoyEnColombia().split('-').map(Number);
  if (atajo === 'anio') return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
  if (atajo === 'mes') return { desde: `${anio}-${dosCifras(mes)}-01`, hasta: ultimoDia(anio, mes) };
  const [a2, m2] = mes === 1 ? [anio - 1, 12] : [anio, mes - 1];
  return { desde: `${a2}-${dosCifras(m2)}-01`, hasta: ultimoDia(a2, m2) };
}

/**
 * Qué atajo es el rango puesto («otro» si no es ninguno). «Este mes» y «este año» también son
 * «hasta hoy»: es como arrancan varios informes.
 */
export function atajoDe(desde: string, hasta: string): AtajoDePeriodo {
  const hoy = hoyEnColombia();
  for (const a of ['todo', 'mes', 'anterior', 'anio'] as const) {
    const r = rangoDelAtajo(a);
    if (r.desde !== desde) continue;
    if (r.hasta === hasta) return a;
    if ((a === 'mes' || a === 'anio') && hasta === hoy) return a;
  }
  return 'otro';
}

export const ATAJOS_DE_PERIODO: { value: AtajoDePeriodo; label: string }[] = [
  { value: 'mes', label: 'Este mes' },
  { value: 'anterior', label: 'Mes pasado' },
  { value: 'anio', label: 'Este año' },
  { value: 'todo', label: 'Todo' },
  { value: 'otro', label: 'Otro rango' },
];

export interface RangoDeFechasProps {
  desde: string;
  hasta: string;
  onChange: (rango: { desde: string; hasta: string }) => void;
  disabled?: boolean;
  /** Los atajos de período a un toque; las dos fechas sólo con «Otro rango». */
  atajos?: boolean;
}

export function RangoDeFechas({ desde, hasta, onChange, disabled, atajos = false }: RangoDeFechasProps) {
  const id = useId();
  const invertido = rangoInvertido(desde, hasta);
  /** «Otro rango» pedido a mano (con un rango que también es un atajo, igual se ven las fechas). */
  const [otroPedido, setOtroPedido] = useState(false);
  const actual = atajoDe(desde, hasta);
  const verFechas = !atajos || otroPedido || actual === 'otro';

  const fechas = (
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

  if (!atajos) return fechas;

  return (
    <div className="space-y-3" data-testid="rango-con-atajos">
      <SegmentedControl<AtajoDePeriodo>
        aria-label="Período"
        value={verFechas ? 'otro' : actual}
        onChange={(a) => {
          if (disabled) return;
          if (a === 'otro') {
            setOtroPedido(true);
            return;
          }
          setOtroPedido(false);
          onChange(rangoDelAtajo(a));
        }}
        options={ATAJOS_DE_PERIODO}
      />
      {verFechas ? <div className="max-w-xl">{fechas}</div> : null}
    </div>
  );
}
