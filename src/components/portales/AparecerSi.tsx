'use client'

import type { ReactNode } from 'react'
import { Appear } from '@leasefy/cadence'

/**
 * Una tarjeta que aparece con `Appear` (fundido + 8 px) SÓLO si llega después
 * de cargar (`si`, normalmente `useHuboEsqueleto(cargando)`): los avisos y
 * las tarjetas que dependen de un dato que todavía no estaba. Si el dato ya
 * estaba al montarse la pantalla, es una `<div>` quieta: la entrada de la
 * página la pone el `PageTransition` del `template.tsx` y dos a la vez serían
 * un doble fundido.
 */
export function AparecerSi({
  si,
  className,
  children,
}: {
  si: boolean
  className?: string
  children: ReactNode
}) {
  if (!si) return <div className={className}>{children}</div>
  return <Appear className={className}>{children}</Appear>
}
