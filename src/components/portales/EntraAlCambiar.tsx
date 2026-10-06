'use client'

import { useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { enterTransition, motionDistance, usePrefersReducedMotion } from '@leasefy/cadence'

type Etiqueta = 'div' | 'ul' | 'section'

/**
 * Un contenido que se REEMPLAZA (cargando → lista, una pestaña por otra) y
 * entra suave: fundido y 4 px (`motionDistance.xs`) en `base`; con movimiento
 * reducido, sólo el fundido corto.
 *
 * La diferencia con `CrossFade`: lo viejo se va AL INSTANTE (no espera su
 * salida). Sirve donde lo que sale no tiene que quedar en el DOM ni un cuadro
 * —una lista filtrada por pestaña: la fila de otra pestaña no puede seguir
 * ahí— y donde un `CrossFade` en modo «wait» haría esperar 150 ms al
 * contenido nuevo. Es la misma regla de `EstadoDeDatos`: nadie espera a que
 * algo termine de irse.
 *
 * Lo que ya estaba al montarse no se anima (la página ya entra con su
 * `template.tsx`); sólo los cambios de `clave` después.
 */
export function EntraAlCambiar({
  clave,
  as = 'div',
  className,
  children,
}: {
  clave: string
  as?: Etiqueta
  className?: string
  children: ReactNode
}) {
  const reducido = usePrefersReducedMotion()
  const primera = useRef(clave)
  const yaCambio = useRef(false)
  if (clave !== primera.current) yaCambio.current = true
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp
      key={clave}
      className={className}
      initial={yaCambio.current ? { opacity: 0, y: motionDistance.xs } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={enterTransition(reducido)}
    >
      {children}
    </Comp>
  )
}
