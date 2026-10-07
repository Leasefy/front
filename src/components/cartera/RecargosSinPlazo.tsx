'use client';

/**
 * PPF-02b (QA-PAGOS-95 ronda 2; Nico, 05-10-2026, TAL CUAL): los recargos de
 * mora que quedaron ESCRITOS en cobros sin que la inmobiliaria haya fijado sus
 * días de plazo (sin plazo no corre mora, CR-31).
 *
 * Los que no estaban pagados ni facturados se quitan (el guion
 * `scripts/quitar-recargos-sin-plazo.ts` del back); los PAGADOS o FACTURADOS
 * quedan y la inmobiliaria los revisa AQUÍ, en Cobros emitidos. Con el plazo
 * fijado, o sin ninguno, no se pinta nada.
 */

import * as React from 'react';
import { Banner } from '@leasefy/cadence';

import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { nombreDelMes } from '@/lib/utils/mes';

export interface RecargoParaRevisar {
  cobroId: string;
  mes: string;
  inquilino: string | null;
  inmueble: string | null;
  recargoCop: number;
  motivo: 'PAGADO' | 'FACTURADO';
  porQue: string;
}

export interface RespuestaDeRecargosSinPlazo {
  plazoSinFijar: boolean;
  quedan: RecargoParaRevisar[];
  porQuitar: number;
}

export function leerRecargosSinPlazo(): Promise<RespuestaDeRecargosSinPlazo> {
  return apiClient.get<RespuestaDeRecargosSinPlazo>('/inmobiliaria/cobros/recargos-sin-plazo');
}

export function RecargosSinPlazo({ leer = leerRecargosSinPlazo }: { leer?: typeof leerRecargosSinPlazo }) {
  const [datos, setDatos] = React.useState<RespuestaDeRecargosSinPlazo | null>(null);
  React.useEffect(() => {
    let vivo = true;
    leer()
      .then((d) => vivo && setDatos(d))
      // Un back sin la ruta o un fallo de lectura: la pantalla queda como antes.
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [leer]);

  if (!datos?.plazoSinFijar || (datos.quedan.length === 0 && datos.porQuitar === 0)) return null;
  const n = datos.quedan.length;
  return (
    <Banner variant="warning" data-testid="recargos-sin-plazo">
      <div className="space-y-2">
        {n > 0 && (
          <p>
            {n === 1
              ? 'Un cobro tiene un recargo de mora que se escribió sin que la inmobiliaria haya fijado sus días de plazo (sin plazo no corre mora). No se quitó porque ya'
              : `${n} cobros tienen un recargo de mora que se escribió sin que la inmobiliaria haya fijado sus días de plazo (sin plazo no corre mora). No se quitaron porque ya`}{' '}
            se pagaron o se facturaron: revísalos.
          </p>
        )}
        {n > 0 && (
          <ul className="space-y-1 text-sm" data-testid="recargos-sin-plazo-lista">
            {datos.quedan.map((r) => (
              <li key={r.cobroId}>
                <span className="font-medium">{r.inquilino ?? 'Sin inquilino'}</span>
                {r.inmueble ? ` · ${r.inmueble}` : ''} · {nombreDelMes(r.mes as Parameters<typeof nombreDelMes>[0])}: recargo de{' '}
                <span className="font-mono tabular-nums">{formatCurrency(r.recargoCop)}</span>.{' '}
                <span className="text-fg-muted">{r.porQue}</span>
              </li>
            ))}
          </ul>
        )}
        {datos.porQuitar > 0 && (
          <p className="text-sm" data-testid="recargos-sin-plazo-por-quitar">
            {datos.porQuitar === 1
              ? 'Otro cobro todavía muestra un recargo que no corre: se quita en la próxima limpieza, sin que tengas que hacer nada.'
              : `Otros ${datos.porQuitar} cobros todavía muestran un recargo que no corre: se quitan en la próxima limpieza, sin que tengas que hacer nada.`}
          </p>
        )}
      </div>
    </Banner>
  );
}
