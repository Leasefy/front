'use client'

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react'
import { motion, useInView, type Transition } from 'framer-motion'
import { usePrefersReducedMotion } from '@leasefy/cadence'

/**
 * Bucles decorativos de la landing (`repeat: Infinity`: halos que respiran,
 * brillos que barren, íconos que laten) que SÓLO corren mientras se ven.
 *
 * Por qué (DESIGN.md §8b y el inventario de movimiento, §7): una animación
 * infinita fuera de pantalla sigue gastando CPU y batería cuadro a cuadro, y
 * con movimiento reducido no debería correr nunca.
 *
 * - `ZonaDeBucles` es el contenedor que se observa (UN `IntersectionObserver`
 *   por zona, no uno por bucle). Se usa EN LUGAR del `div` raíz de la pieza:
 *   el mismo elemento, con sus clases.
 * - `Bucle.div`, `Bucle.span`… son el mismo `motion.div`, `motion.span`… con
 *   las mismas props. Fuera de pantalla (o con movimiento reducido) cada
 *   arreglo de fotogramas del `animate` se queda en su PRIMER valor y la
 *   transición es instantánea: el bucle se detiene, quieto en su pose de
 *   partida. Al volver a verse, retoma.
 * - Un `Bucle` fuera de toda zona se observa a sí mismo.
 */

const ZonaContext = createContext<boolean | null>(null)

/** Margen para arrancar un poco antes de entrar y parar un poco después de salir. */
const MARGEN = '120px 0px'

type ZonaProps = ComponentPropsWithoutRef<'div'>

export const ZonaDeBucles = forwardRef<HTMLDivElement, ZonaProps>(function ZonaDeBucles(
  { children, ...props },
  ref,
) {
  const propia = useRef<HTMLDivElement | null>(null)
  const enVista = useInView(propia, { margin: MARGEN })
  const unir = useCallback(
    (nodo: HTMLDivElement | null) => {
      propia.current = nodo
      if (typeof ref === 'function') ref(nodo)
      else if (ref) ref.current = nodo
    },
    [ref],
  )
  return (
    <ZonaContext.Provider value={enVista}>
      <div ref={unir} {...props}>
        {children}
      </div>
    </ZonaContext.Provider>
  )
})

/** La pose quieta: el primer fotograma de cada arreglo; lo demás, tal cual. */
export function poseQuieta(animate: unknown): unknown {
  if (!animate || typeof animate !== 'object' || Array.isArray(animate)) return animate
  const quieta: Record<string, unknown> = {}
  for (const [clave, valor] of Object.entries(animate as Record<string, unknown>)) {
    if (clave === 'transition') continue
    quieta[clave] = Array.isArray(valor) ? valor[0] : valor
  }
  return quieta
}

const QUIETO: Transition = { duration: 0 }

type EtiquetaDeBucle = 'div' | 'span' | 'p' | 'button' | 'circle' | 'path' | 'rect' | 'g' | 'svg'

function crearBucle<T extends EtiquetaDeBucle>(etiqueta: T) {
  const Comp = motion[etiqueta] as unknown as ForwardRefExoticComponent<
    Record<string, unknown> & RefAttributes<unknown>
  >
  const Bucle = forwardRef<unknown, Record<string, unknown>>(function Bucle(
    { animate, transition, ...props },
    ref,
  ) {
    const zona = useContext(ZonaContext)
    const propia = useRef<Element | null>(null)
    const propioEnVista = useInView(propia as React.RefObject<Element>, { margin: MARGEN })
    const reducido = usePrefersReducedMotion()
    const enVista = zona ?? propioEnVista
    const corre = enVista && !reducido
    const unir = useCallback(
      (nodo: Element | null) => {
        // Sólo se observa a sí mismo cuando no hay zona que lo haga.
        propia.current = zona === null ? nodo : null
        if (typeof ref === 'function') ref(nodo)
        else if (ref) (ref as React.MutableRefObject<unknown>).current = nodo
      },
      [ref, zona],
    )
    return (
      <Comp
        ref={unir}
        animate={corre ? animate : poseQuieta(animate)}
        transition={corre ? transition : QUIETO}
        {...props}
      />
    )
  })
  Bucle.displayName = `Bucle.${etiqueta}`
  return Bucle as unknown as (typeof motion)[T]
}

/** `motion.*` que se detiene fuera de pantalla y con movimiento reducido. */
export const Bucle = {
  div: crearBucle('div'),
  span: crearBucle('span'),
  p: crearBucle('p'),
  button: crearBucle('button'),
  circle: crearBucle('circle'),
  path: crearBucle('path'),
  rect: crearBucle('rect'),
  g: crearBucle('g'),
  svg: crearBucle('svg'),
}
