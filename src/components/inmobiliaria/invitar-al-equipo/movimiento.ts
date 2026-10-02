import { useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';

/**
 * El ritmo de «Invitar a tu equipo» (02-10-2026, regla de Nico: «que cada
 * interacción tenga su animación: entradas, salidas, cambios»).
 *
 * Valores, anotados para cuando se unifiquen con el sistema de Cadence:
 *
 *   · entrar      200 ms · ease-out  cubic-bezier(0.22, 1, 0.36, 1)
 *   · salir       150 ms · ease-in   cubic-bezier(0.4, 0, 1, 1)
 *   · reacomodar  250 ms · ease-out  (las filas que se corren cuando entra o sale otra)
 *   · distancias  4 px (un cambio en el mismo lugar) · 8 px (algo que llega)
 *   · escala      0,6 → 1 sólo para el visto de «Copiado» y el contador del encabezado
 *
 * Son los mismos números de los tokens de movimiento de Cadence
 * (`motionDuration.base`/`.fast`, `motionEase.enter`/`.exit`,
 * `motionDistance.xs`/`.sm`): cuando ese sistema quede publicado se cambian
 * por los tokens sin que cambie nada de lo que se ve.
 *
 * Sólo `transform` y `opacity`. Con `prefers-reduced-motion` no hay
 * desplazamientos ni escalas ni reacomodo: quedan los fundidos.
 *
 * Lo que ya traen las primitivas no se repite acá: el modal entra y sale con
 * la coreografía del `Dialog` (hoja desde abajo en el celular) y el indicador
 * de la pestaña activa se desliza con el `layoutId` de `Tabs`.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

export const ENTRAR: Transition = { duration: 0.2, ease: EASE_OUT };
export const SALIR: Transition = { duration: 0.15, ease: EASE_IN };
export const REACOMODAR: Transition = { duration: 0.25, ease: EASE_OUT };

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
      initial: { opacity: 0, y: px(8) },
      animate: { opacity: 1, y: 0, transition: ENTRAR },
      exit: { opacity: 0, y: px(-4), transition: SALIR },
    },
    cambia: {
      initial: { opacity: 0, y: px(4) },
      animate: { opacity: 1, y: 0, transition: ENTRAR },
      exit: { opacity: 0, y: px(-4), transition: SALIR },
    },
    salta: {
      initial: { opacity: 0, scale: escala(0.6) },
      animate: { opacity: 1, scale: 1, transition: ENTRAR },
      exit: { opacity: 0, scale: escala(0.6), transition: SALIR },
    },
    reacomodo: reducido ? false : 'position',
  };
}

/** La coreografía según `prefers-reduced-motion` de quien mira. */
export function useMovimiento(): Movimiento {
  return coreografia(useReducedMotion() ?? false);
}
