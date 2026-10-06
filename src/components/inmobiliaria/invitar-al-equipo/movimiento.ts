import { useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';
import { motionDistance, motionTransition } from '@leasefy/cadence';

/**
 * El ritmo de «Invitar a tu equipo» (02-10-2026, regla de Nico: «que cada
 * interacción tenga su animación: entradas, salidas, cambios»).
 *
 * Los valores son los tokens del sistema de movimiento de Cadence (03-10-2026;
 * antes eran números escritos acá con el mismo valor):
 *
 *   · entrar      `motionTransition.enter`  — 200 ms, desacelera
 *   · salir       `motionTransition.exit`   — 150 ms, acelera
 *   · reacomodar  `motionTransition.layout` — resorte ágil de 250 ms (las filas
 *                 que se corren cuando entra o sale otra); antes era un ease-out
 *                 de 250 ms, el sistema lo hace resorte con un 10 % de rebote
 *   · distancias  `motionDistance.xs` 4 px (un cambio en el mismo lugar) ·
 *                 `motionDistance.sm` 8 px (algo que llega)
 *   · escala      0,6 → 1 sólo para el visto de «Copiado» y el contador del
 *                 encabezado. Cadence no tiene un token para «salta» (sus
 *                 escalas son 0,96 y 0,97, de presión): queda acá.
 *
 * Sólo `transform` y `opacity`. Con `prefers-reduced-motion` no hay
 * desplazamientos ni escalas ni reacomodo: quedan los fundidos.
 *
 * Lo que ya traen las primitivas no se repite acá: el modal entra y sale con
 * la coreografía del `Dialog` (hoja desde abajo en el celular) y el indicador
 * de la pestaña activa se desliza con el `layoutId` de `Tabs`.
 */

export const ENTRAR: Transition = motionTransition.enter;
export const SALIR: Transition = motionTransition.exit;
export const REACOMODAR: Transition = motionTransition.layout;

/** De dónde nace lo que «salta» (el visto de «Copiado», el contador). */
const ESCALA_DEL_SALTO = 0.6;

export interface Coreografia {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

export interface Movimiento {
  reducido: boolean;
  /** Algo que llega (el bloque del enlace, una fila nueva, un aviso): sube 8 px y aparece. */
  llega: Coreografia;
  /** Un contenido que reemplaza a otro en el mismo lugar («Copiar» → «Copiado»). */
  cambia: Coreografia;
  /** Algo chico que «salta» al aparecer (el visto de «Copiado», el contador). */
  salta: Coreografia;
  /** `layout` de las filas: sólo la posición, y nada con movimiento reducido. */
  reacomodo: false | 'position';
}

export function coreografia(reducido: boolean): Movimiento {
  const px = (n: number) => (reducido ? 0 : n);
  const escala = (n: number) => (reducido ? 1 : n);
  return {
    reducido,
    llega: {
      initial: { opacity: 0, y: px(motionDistance.sm) },
      animate: { opacity: 1, y: 0, transition: ENTRAR },
      exit: { opacity: 0, y: px(-motionDistance.xs), transition: SALIR },
    },
    cambia: {
      initial: { opacity: 0, y: px(motionDistance.xs) },
      animate: { opacity: 1, y: 0, transition: ENTRAR },
      exit: { opacity: 0, y: px(-motionDistance.xs), transition: SALIR },
    },
    salta: {
      initial: { opacity: 0, scale: escala(ESCALA_DEL_SALTO) },
      animate: { opacity: 1, scale: 1, transition: ENTRAR },
      exit: { opacity: 0, scale: escala(ESCALA_DEL_SALTO), transition: SALIR },
    },
    reacomodo: reducido ? false : 'position',
  };
}

/** La coreografía según `prefers-reduced-motion` de quien mira. */
export function useMovimiento(): Movimiento {
  return coreografia(useReducedMotion() ?? false);
}
