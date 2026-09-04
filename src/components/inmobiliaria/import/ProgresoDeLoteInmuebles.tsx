'use client';

/**
 * Se muestra mientras un lote de importación de inmuebles sigue
 * `ENCOLADO`/`PROCESANDO` (`use-estado-de-lote-inmuebles.ts`,
 * wu-4-report.md §6). Mismo patrón que `ProgresoDeLote.tsx` (contratos):
 * el sondeo es una CONVENIENCIA mientras la pestaña sigue abierta — nunca
 * el mecanismo de finalización, que es la notificación
 * `PROPERTY_IMPORT_COMPLETED` server-side.
 */

import { Clock, XCircle } from '@phosphor-icons/react';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

export function ProgresoDeLoteInmuebles({
  estado,
  agotado,
}: {
  estado: EstadoDeLoteInmuebles | null;
  agotado: boolean;
}) {
  if (estado?.estado === 'FALLIDO') {
    return (
      <div className="rounded-lg border border-border p-6 space-y-3" data-testid="lote-inmuebles-fallido">
        <div className="flex items-center gap-2 text-danger">
          <XCircle className="h-5 w-5" />
          <p className="text-sm font-medium">No pudimos preparar la importación</p>
        </div>
        <p className="text-sm text-fg-muted">
          {estado.error ?? 'No pudimos preparar la importación.'}
        </p>
      </div>
    );
  }

  const total = estado?.total ?? 0;
  const procesadas = estado?.procesadas ?? 0;
  const porcentaje = total > 0 ? Math.round((procesadas / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-border p-6 space-y-4" data-testid="lote-inmuebles-progreso">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 animate-pulse text-primary" />
        <p className="text-sm font-medium text-fg">Estamos preparando tu importación</p>
      </div>

      {total > 0 ? (
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-xs tabular-nums text-fg-muted">
            {procesadas} / {total} filas procesadas
          </p>
        </div>
      ) : null}

      <p className="text-sm text-fg-muted">
        Podés cerrar esta pestaña — seguimos trabajando igual, y te avisamos con
        una notificación cuando termine.
      </p>

      {agotado ? (
        <div className="rounded-md border border-border bg-info-soft p-3">
          <p className="text-sm text-info">
            Esto está tardando más de lo esperado. Seguimos trabajando del lado
            del servidor — te avisamos apenas termine, no hace falta que esperes
            acá.
          </p>
        </div>
      ) : null}
    </div>
  );
}
