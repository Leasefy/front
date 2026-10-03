import { motionStagger } from '@leasefy/cadence';

/**
 * El retraso de la entrada CSS (`animate-stagger-in`, `animate-content-reveal`)
 * del ítem `indice` de una lista del asistente de carga: el paso y el techo del
 * sistema (`motionStagger`: 40 ms, el último nunca después de 320 ms). Antes
 * cada paso ponía el suyo (40/60/80 ms) sin tope.
 */
export function retrasoEscalonado(indice: number): string {
  return `${Math.round(Math.min(indice * motionStagger.step, motionStagger.max) * 1000)}ms`;
}
