'use client'

/**
 * Piezas chicas de la pantalla del recaudo en línea: la etiqueta de un campo,
 * una cifra con su nombre y el aviso de error de una acción (que entra y sale
 * con los tokens de movimiento de Cadence).
 */

import { useRef } from 'react'
import { Presence } from '@leasefy/cadence'

export function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{children}</span>
  )
}

export function Cifra({
  nombre,
  valor,
  tono = 'normal',
}: {
  nombre: string
  valor: React.ReactNode
  tono?: 'normal' | 'bien' | 'mal' | 'ojo'
}) {
  const color =
    tono === 'bien' ? 'text-ok' : tono === 'mal' ? 'text-bad' : tono === 'ojo' ? 'text-warn' : 'text-fg'
  return (
    <div className="min-w-0">
      <Etiqueta>{nombre}</Etiqueta>
      <div className={`text-sm font-medium tabular-nums mt-0.5 ${color}`}>{valor}</div>
    </div>
  )
}

/** El error de una acción: aparece con su animación y se va igual (nunca de golpe). */
export function ErrorDeLaAccion({ mensaje, testId }: { mensaje: string | null; testId: string }) {
  // Mientras sale, se sigue leyendo el último mensaje (no una caja vacía).
  const ultimo = useRef(mensaje)
  if (mensaje !== null) ultimo.current = mensaje
  return (
    <Presence show={mensaje !== null}>
      <div className="card p-4 border-l-4 border-l-bad mt-4" data-testid={testId} role="alert">
        <p className="text-sm text-bad">{ultimo.current}</p>
      </div>
    </Presence>
  )
}
