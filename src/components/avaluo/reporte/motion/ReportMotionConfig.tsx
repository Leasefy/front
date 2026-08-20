'use client'

/**
 * ReportMotionConfig.tsx — `MotionConfig reducedMotion="user"` para todo el
 * panel: cuando el sistema pide menos movimiento, framer vuelve instantáneas
 * las animaciones de transform y layout (los reveals, la banda que crece, el
 * marcador spring). Cada pieza además pasa sus transiciones a duración 0 con
 * `useReducedMotion`; esto es el cinturón para lo que se le escape.
 *
 * Es una isla de cliente que sólo envuelve: los hijos siguen siendo lo que
 * sean (Server Components incluidos).
 */

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

export function ReportMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
