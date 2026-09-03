'use client';

/**
 * RepartoEntreDuenos — qué porcentaje del inmueble es de cada dueño cuando
 * hay más de uno.
 *
 * El primero de la lista (el que se eligió primero) se lleva EL RESTO: así la
 * suma da 100 % por construcción y no hay forma de guardar un 99 %. Los demás
 * tienen su casilla. Al cambiar quiénes son, el diálogo vuelve a repartir en
 * partes iguales; acá sólo se edita.
 */

import { Equals } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { BPS_TOTAL, formatParticipacion } from '@/lib/types/inmobiliaria';
import {
  bpsDelPrincipal,
  motivoInvalido,
  porcentajeABps,
  type FilaCopropietario,
} from './CopropietariosField';

/** Partes iguales para `n` dueños: los no-principales reciben el piso y el principal el resto. */
export function repartoEnPartesIguales(ids: readonly string[]): FilaCopropietario[] {
  const n = ids.length;
  if (n < 2) return [];
  const piso = Math.floor(BPS_TOTAL / n);
  return ids.slice(1).map((propietarioId) => ({ propietarioId, participacionBps: piso }));
}

export interface RepartoEntreDuenosProps {
  /** Ids elegidos en orden; el primero es el que se queda con el resto. */
  seleccion: string[];
  nombreDe: (id: string) => string;
  filas: FilaCopropietario[];
  onChange: (filas: FilaCopropietario[]) => void;
  className?: string;
}

export function RepartoEntreDuenos({ seleccion, nombreDe, filas, onChange, className }: RepartoEntreDuenosProps) {
  const { t } = useI18n();
  if (seleccion.length < 2) return null;

  const principalId = seleccion[0]!;
  const resto = bpsDelPrincipal(filas);
  const problema = motivoInvalido(filas, principalId);

  const cambiar = (propietarioId: string, texto: string) => {
    onChange(
      filas.map((f) => (f.propietarioId === propietarioId ? { ...f, participacionBps: porcentajeABps(texto) } : f)),
    );
  };

  return (
    <div className={className} data-testid="mandato-reparto">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-fg-muted">
          {t('inmobiliaria.consignaciones.mandateDialog.repartoTitle')}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onChange(repartoEnPartesIguales(seleccion))}
          data-testid="mandato-reparto-iguales"
        >
          <Equals className="h-4 w-4" />
          {t('inmobiliaria.consignaciones.mandateDialog.repartoIguales')}
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        <li className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="min-w-0 truncate text-sm text-fg">{nombreDe(principalId)}</span>
          <span
            className={`shrink-0 font-mono text-sm tabular-nums ${resto > 0 ? 'text-fg' : 'text-danger'}`}
            data-testid="mandato-reparto-resto"
          >
            {t('inmobiliaria.consignaciones.mandateDialog.repartoResto', { pct: formatParticipacion(Math.max(resto, 0)) })}
          </span>
        </li>
        {filas.map((f) => (
          <li key={f.propietarioId ?? 'x'} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate text-sm text-fg">{nombreDe(f.propietarioId ?? '')}</span>
            <span className="relative shrink-0">
              <Input
                type="number"
                min="0.01"
                max="99.99"
                step="0.5"
                value={f.participacionBps ? f.participacionBps / 100 : ''}
                onChange={(e) => cambiar(f.propietarioId ?? '', e.target.value)}
                className="h-9 w-28 pr-8 text-right font-mono tabular-nums"
                aria-label={`Porcentaje de ${nombreDe(f.propietarioId ?? '')}`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted">%</span>
            </span>
          </li>
        ))}
      </ul>

      {problema && (
        <p role="alert" className="mt-2 text-sm text-danger" data-testid="mandato-reparto-problema">
          {problema}
        </p>
      )}
    </div>
  );
}
