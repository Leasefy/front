import { useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';
import {
  motionDistance,
  motionDuration,
  motionEase,
  motionSpring,
  motionStagger,
} from '@leasefy/cadence';

/**
 * El ritmo de «Este movimiento son N recibos» (02-10-2026, regla de Nico:
 * «que cada interacción tenga su animación: entradas, salidas, cambios»).
 *
 * Todo sale de los tokens de movimiento de Cadence:
 *
 *   · la tarjeta entra   `base` (200 ms) · `enter` · sube `sm` (8 px)
 *   · los recibos         cascada corta: `motionStagger.step` (40 ms) con techo
 *                         `motionStagger.max` (320 ms) para la lista entera
 *   · la suma cuenta      `reveal` (500 ms), y AL TERMINAR salta el «calza»
 *                         con el resorte `bouncy`
 *   · la barra de confianza crece en `scaleX` (`slow`, `enter`)
 *   · la tarjeta sale     `fast` (150 ms) · `exit` · sube `xs` (4 px) al conciliar
 *
 * Sólo `transform` y `opacity`. 🔴 Con `prefers-reduced-motion` TODO es
 * instantáneo: sin desplazamientos, sin escalas, sin conteo y sin fundidos
 * (duración 0), que es lo que se pidió para esta pantalla.
 */

const INSTANTE: Transition = { duration: 0 };

export interface Coreografia {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit?: TargetAndTransition;
}

export interface MovimientoDeMuchosAUno {
  reducido: boolean;
  /** La tarjeta de la propuesta: entra subiendo, sale al conciliar. */
  tarjeta: Coreografia;
  /** El recibo `indice` de `total`, en cascada corta. */
  recibo: (indice: number, total: number) => Coreografia;
  /** El «calza» que salta cuando la suma llega al valor del banco. */
  calza: Coreografia;
  /** La barra de confianza, que crece desde la izquierda hasta `confianza` (0–1). */
  barra: (confianza: number) => Coreografia;
  /** Un aviso o un error que aparece en el lugar. */
  aviso: Coreografia;
  /** ¿La suma cuenta hasta el valor? Con movimiento reducido se pinta ya. */
  cuenta: boolean;
}

/**
 * El retraso del recibo `indice` en una cascada de `total`: 40 ms entre uno y
 * otro, y el último nunca espera más de 320 ms (40 recibos no tardan 1,6 s).
 */
export function retrasoEnCascada(indice: number, total: number): number {
  if (total <= 1 || indice <= 0) return 0;
  const paso = Math.min(motionStagger.step, motionStagger.max / (total - 1));
  return Math.min(indice, total - 1) * paso;
}

export function movimientoDeMuchosAUno(reducido: boolean): MovimientoDeMuchosAUno {
  if (reducido) {
    const quieto: Coreografia = {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: INSTANTE },
      exit: { opacity: 0, transition: INSTANTE },
    };
    return {
      reducido,
      tarjeta: quieto,
      recibo: () => quieto,
      calza: quieto,
      barra: (confianza) => ({
        initial: { scaleX: confianza },
        animate: { scaleX: confianza, transition: INSTANTE },
      }),
      aviso: quieto,
      cuenta: false,
    };
  }

  const entrar = (delay = 0): Transition => ({
    duration: motionDuration.base,
    ease: motionEase.enter,
    delay,
  });
  const salir: Transition = { duration: motionDuration.fast, ease: motionEase.exit };

  return {
    reducido,
    tarjeta: {
      initial: { opacity: 0, y: motionDistance.sm },
      animate: { opacity: 1, y: 0, transition: entrar() },
      exit: { opacity: 0, y: -motionDistance.xs, transition: salir },
    },
    recibo: (indice, total) => ({
      initial: { opacity: 0, y: motionDistance.xs },
      animate: { opacity: 1, y: 0, transition: entrar(retrasoEnCascada(indice, total)) },
      exit: { opacity: 0, transition: salir },
    }),
    calza: {
      initial: { opacity: 0, scale: 0.6 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: {
          // Llega cuando la suma terminó de contar.
          scale: { ...motionSpring.bouncy, delay: motionDuration.reveal },
          opacity: { duration: motionDuration.fast, ease: motionEase.enter, delay: motionDuration.reveal },
        },
      },
      exit: { opacity: 0, scale: 0.6, transition: salir },
    },
    barra: (confianza) => ({
      initial: { scaleX: 0 },
      animate: {
        scaleX: confianza,
        transition: { duration: motionDuration.slow, ease: motionEase.enter, delay: motionDuration.fast },
      },
    }),
    aviso: {
      initial: { opacity: 0, y: motionDistance.xs },
      animate: { opacity: 1, y: 0, transition: entrar() },
      exit: { opacity: 0, transition: salir },
    },
    cuenta: true,
  };
}

/** La coreografía según `prefers-reduced-motion` de quien mira. */
export function useMovimientoDeMuchosAUno(): MovimientoDeMuchosAUno {
  return movimientoDeMuchosAUno(useReducedMotion() ?? false);
}
