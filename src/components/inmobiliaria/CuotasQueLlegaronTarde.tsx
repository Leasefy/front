'use client';

/**
 * Las cuotas que llegaron TARDE a un mes ya liquidado, en el asistente de
 * dispersiones.
 *
 * Antes, un propietario que ya tenía su dispersión del mes se saltaba entero:
 * la cuota de un contrato activado después, o la parte del copropietario que
 * no estaba en la primera corrida, no se giraba nunca y nadie lo veía. El back
 * ahora las suma a esa liquidación si sigue abierta (`seSuman`), o dice por qué
 * no (`motivo`: ya está en un lote, ya se giró…). Esto sólo lo cuenta; la
 * decisión la tomó el back con sus reglas.
 */

import { ClockCounterClockwise } from '@phosphor-icons/react';

import type { CuotasTardias } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

export function CuotasQueLlegaronTarde({ tardias }: { tardias: CuotasTardias[] }) {
  if (tardias.length === 0) return null;
  const seSuman = tardias.filter((t) => t.seSuman);
  const noSeSuman = tardias.filter((t) => !t.seSuman);

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
      data-testid="cuotas-que-llegaron-tarde"
    >
      <div className="space-y-1">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <ClockCounterClockwise className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          Cuotas que llegaron tarde
        </h4>
        <p className="text-xs text-fg-muted">
          Estos propietarios ya tienen su liquidación del mes y aparecieron cuotas nuevas.
          {seSuman.length > 0 && ' Al confirmar, se suman a esa misma liquidación.'}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {[...seSuman, ...noSeSuman].map((t) => (
          <li
            key={t.propietarioId}
            className="flex items-start justify-between gap-4 py-2 text-sm"
            data-testid="cuota-tardia"
            data-se-suman={t.seSuman ? 'si' : 'no'}
          >
            <div className="min-w-0">
              <p className="font-medium text-fg">{t.propietarioName || '—'}</p>
              <p className="text-xs text-fg-muted">
                {t.cuotas} {t.cuotas === 1 ? 'cuota' : 'cuotas'} ·{' '}
                {t.seSuman ? 'se suman al confirmar' : (t.motivo ?? 'no se pueden sumar')}
              </p>
            </div>
            <span className="shrink-0 font-mono tabular-nums text-fg">
              {formatCurrency(t.netoCop)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
