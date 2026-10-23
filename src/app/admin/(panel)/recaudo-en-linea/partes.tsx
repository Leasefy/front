'use client'

/**
 * Piezas chicas de la pantalla del recaudo en línea: la etiqueta de un campo,
 * una cifra con su nombre y el aviso de error de una acción (que entra y sale
 * con los tokens de movimiento de Cadence).
 */

import { useRef } from 'react'
import { Presence } from '@leasefy/cadence'
import { Card, MonoLabel } from '@leasefy/cadence'

export function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <MonoLabel>{children}</MonoLabel>
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
    tono === 'bien' ? 'text-success' : tono === 'mal' ? 'text-danger' : tono === 'ojo' ? 'text-warning' : 'text-fg'
  return (
    <div className="min-w-0">
      <Etiqueta>{nombre}</Etiqueta>
      <div className={`font-mono text-body-sm tabular-nums mt-0.5 ${color}`}>{valor}</div>
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
      <Card className="p-4  mt-4" data-testid={testId} role="alert">
        <p className="text-body-sm text-danger">{ultimo.current}</p>
      </Card>
    </Presence>
  )
}
