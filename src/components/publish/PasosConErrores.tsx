'use client';

/**
 * Publicar del propietario: la barra de pasos marca los pasos con errores
 * (Nico, 02-10-2026, opción «c»).
 *
 * Tras un fallo al publicar, el contexto lleva a la persona al paso del primer
 * error; los demás pasos con error no se veían hasta llegar a ellos. Ahora:
 *
 *  · En la barra lateral (escritorio), el círculo del paso toma el estado de
 *    error del `Stepper` de Cadence (aro y fondo de peligro con una ×): la ×
 *    se distingue sin color del número y del ✓. El botón del paso suma, para
 *    el lector de pantalla, «tiene errores».
 *  · En el celular no hay barra de pasos (sólo «Paso N de 10» y el progreso):
 *    debajo del progreso, una línea dice qué pasos quedan por corregir.
 *
 * Las dos entran y salen con `Presence` de Cadence (fundido + 4px, tokens
 * `--motion-*`; con movimiento reducido, sólo el fundido). La marca se va
 * cuando el paso se queda sin errores: `pasosConErrores` del contexto deja de
 * nombrarlo al corregir su último campo.
 */

import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { PUBLISH_STEPS } from '@/lib/types/publish';

/** «a», «a y b», «a, b y c». */
export function enLista(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** «paso 3 (Detalles) y paso 6 (Precios)». */
export function pasosParaLeer(pasos: readonly number[]): string {
  return enLista(
    pasos.map((paso) => {
      const etiqueta = PUBLISH_STEPS.find((p) => p.id === paso)?.label;
      return etiqueta ? `paso ${paso} (${etiqueta})` : `paso ${paso}`;
    }),
  );
}

/** El círculo de error, el mismo del `Stepper` de Cadence. Decorativo. */
function CirculoDeError({ className, icono }: { className: string; icono: string }) {
  return (
    // Fondo sólido debajo: en modo oscuro `bg-danger-soft` es translúcido y
    // dejaría ver el número o el ✓ del círculo que tapa.
    <span aria-hidden className={`${className} rounded-full bg-surface`}>
      <span className="flex size-full items-center justify-center rounded-full border-[1.5px] border-danger bg-danger-soft text-danger">
        <X className={icono} weight="bold" />
      </span>
    </span>
  );
}

/**
 * La marca sobre el círculo de un paso de la barra lateral. Va junto al
 * círculo, dentro de su envoltura (`relative`), y lo tapa entero mientras el
 * paso tenga errores. Es decorativa: el texto para el lector de pantalla lo
 * pone el botón.
 *
 * 🔴 `z-20`: el círculo es `relative z-10`; sin un `z` mayor, el círculo se
 * pinta ENCIMA de la marca y la tapa (lo mostró la captura a 1280 px del
 * 02-10-2026: el DOM tenía la marca y la pantalla no).
 */
export function MarcaDeErrorDelPaso({ paso, tieneErrores }: { paso: number; tieneErrores: boolean }) {
  return (
    <Presence
      show={tieneErrores}
      as="span"
      distance="xs"
      aria-hidden
      data-testid={`paso-${paso}-marca-de-error`}
      className="absolute inset-0 z-20"
    >
      <CirculoDeError className="block size-full" icono="size-[15px]" />
    </Presence>
  );
}

/**
 * Celular: «Por corregir: paso 3 (Detalles) y paso 6 (Precios)». Al salir
 * (todo corregido) dice lo último que dijo, no sale vacía.
 */
export function PasosPorCorregir({ pasos }: { pasos: readonly number[] }) {
  const [ultimos, setUltimos] = useState(pasos);
  if (pasos.length > 0 && pasos !== ultimos) setUltimos(pasos);

  return (
    <Presence
      show={pasos.length > 0}
      as="p"
      distance="xs"
      data-testid="publicar-pasos-por-corregir"
      className="mt-3 flex items-start gap-2 text-caption text-danger"
    >
      <CirculoDeError className="mt-px inline-block size-4 shrink-0" icono="size-2.5" />
      <span>
        <span className="font-medium">Por corregir:</span> {pasosParaLeer(ultimos)}
      </span>
    </Presence>
  );
}
