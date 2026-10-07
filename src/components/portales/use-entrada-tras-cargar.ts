'use client'

/**
 * La entrada del contenido de una pantalla de los portales (inquilino y
 * propietario) que primero pinta su esqueleto con un `return` temprano:
 *
 * ```tsx
 * const entrada = useEntradaTrasCargar(cargando)   // ANTES de los return
 * if (cargando) return <EsqueletoDePagina />
 * return <motion.div {...entrada} className="…">…</motion.div>
 * ```
 *
 * Es el «carga → contenido» de `EstadoDeDatos` para las pantallas que no lo
 * usan: si la pantalla llegó a pintar el esqueleto, el contenido que lo
 * reemplaza entra con un fundido y 4 px (`motionDistance.xs`) en `base`; con
 * movimiento reducido, sólo el fundido corto.
 *
 * Si los datos ya estaban al montarse (vuelve a una pantalla con la caché
 * llena) NO hay entrada propia: `initial: false`. La entrada de la página la
 * pone el `PageTransition` del `template.tsx`; dos a la vez serían un doble
 * fundido (DESIGN.md §8b, «La página no anima su propia entrada»).
 *
 * Un `useRef` y no un estado: sólo recuerda, no tiene que provocar un render.
 * Una vez que hubo esqueleto, toda vuelta al contenido (un reintento que
 * vuelve a cargar) entra igual.
 */

import { useRef } from 'react'
import { enterTransition, motionDistance, usePrefersReducedMotion } from '@leasefy/cadence'

export type EntradaTrasCargar =
  | { initial: false }
  | {
      initial: { opacity: number; y: number }
      animate: { opacity: number; y: number }
      transition: ReturnType<typeof enterTransition>
    }

/**
 * ¿Esta pantalla llegó a mostrar su esqueleto (o su «cargando») desde que se
 * montó? Sirve también para las cifras: como `KpiValor`, la que llega
 * después de cargar cuenta desde 0 (`from={huboEsqueleto ? 0 : undefined}`);
 * la que ya estaba se pinta quieta.
 */
export function useHuboEsqueleto(cargando: boolean): boolean {
  const huboEsqueleto = useRef(false)
  if (cargando) huboEsqueleto.current = true
  return huboEsqueleto.current
}

export function useEntradaTrasCargar(cargando: boolean): EntradaTrasCargar {
  const reducido = usePrefersReducedMotion()
  const huboEsqueleto = useHuboEsqueleto(cargando)
  if (!huboEsqueleto) return { initial: false }
  return {
    initial: { opacity: 0, y: motionDistance.xs },
    animate: { opacity: 1, y: 0 },
    transition: enterTransition(reducido),
  }
}
