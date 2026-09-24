'use client';

/**
 * Se muestra mientras un lote de importación de inmuebles sigue
 * `ENCOLADO`/`PROCESANDO` (`use-estado-de-lote-inmuebles.ts`,
 * wu-4-report.md §6). Mismo patrón que `ProgresoDeLote.tsx` (contratos):
 * el sondeo es una CONVENIENCIA mientras la pestaña sigue abierta — nunca
 * el mecanismo de finalización, que es la notificación
 * `PROPERTY_IMPORT_COMPLETED` server-side.
 */

import { Queue, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { abrirCentroDeProcesos } from '@/lib/api/procesos.service';
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

  /*
   * 🔴 23-09 (Nico: «¿para qué muestras la carga también en la tabla? Ya
   * tenemos centro de procesos, todas las cargas déjalas que sucedan allí»):
   * sin barra ni «4 / 10 filas procesadas» propios — el centro ya los muestra.
   * Queda lo que el centro NO dice: que la importación espera a que esto
   * termine para seguir, y que irse es seguro.
   */
  return (
    <div className="rounded-lg border border-border p-6 space-y-4" data-testid="lote-inmuebles-progreso">
      <div className="flex items-center gap-2">
        <Queue className="h-5 w-5 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-fg">
          {total > 0
            ? `Estamos preparando los ${total.toLocaleString('es-CO')} inmuebles de tu importación`
            : 'Estamos preparando tu importación'}
        </p>
      </div>

      <p className="text-sm text-fg-muted">
        El avance lo sigues en el centro de procesos, arriba a la derecha. Cuando termine, la revisión
        aparece aquí.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        hideArrow
        onClick={() => abrirCentroDeProcesos()}
        data-testid="lote-inmuebles-ver-en-el-centro"
      >
        Ver en el centro de procesos
      </Button>

      <p className="text-sm text-fg-muted">
        Puedes cerrar esta pestaña — seguimos trabajando igual, y te avisamos con
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
