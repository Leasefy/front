'use client';

/**
 * El aviso de una liquidación que el back frenó por un dato del inmueble
 * (participaciones que no suman 100 %, o varios dueños con impuestos).
 *
 * No lleva «Reintentar»: volver a pedir lo mismo da el mismo 400. Lleva el
 * motivo tal como lo escribió el back, el inmueble culpable con su enlace y la
 * salida — arreglarlo en la ficha y volver acá.
 */

import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import type { LiquidacionFrenada } from '@/lib/api/dispersiones-errores';

export function AvisoLiquidacionFrenada({
  frenada,
  despues,
  className,
}: {
  frenada: LiquidacionFrenada;
  /**
   * Qué se vuelve a hacer después de arreglarlo, como verbo y objeto:
   * «generar las dispersiones», «calcular el neto».
   */
  despues: string;
  className?: string;
}) {
  const salida =
    frenada.code === 'PARTICIPACIONES_NO_SUMAN_100'
      ? `Arregla las participaciones en la ficha del inmueble y vuelve a ${despues}.`
      : `Mientras ese inmueble siga en la corrida no se puede ${despues} de este mes: se liquida por fuera.`;

  return (
    <AlertaAccionable
      severidad="danger"
      titulo={frenada.titulo}
      accion={{ label: frenada.enlace.label, href: frenada.enlace.href }}
      className={className}
      data-testid="liquidacion-frenada"
      data-code={frenada.code}
    >
      <p>{frenada.mensaje}</p>
      <p className="mt-1">{salida}</p>
    </AlertaAccionable>
  );
}
