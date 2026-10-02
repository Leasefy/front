'use client'

import { useState, type ReactNode } from 'react'
import { CrossFade, Presence } from '@leasefy/cadence'
import { cn } from '@/lib/utils'

/**
 * El mensaje de error bajo un campo, con su entrada suave (02-10-2026).
 *
 * Sistema de errores de la plataforma: el error de un campo —el del cliente
 * (zod) o el que mandó el servidor en `campos[]` (ver
 * `lib/errores/errores-en-el-formulario.ts`)— se pinta debajo del campo con el
 * estilo de error de la casa y ENTRA, no aparece de golpe:
 *
 *  · sin `pista`: baja 4px con un fundido (`Presence`) y al corregirse sale
 *    acelerando, diciendo lo último que dijo (no sale vacío);
 *  · con `pista` (la ayuda gris que el error reemplaza): cruce entre las dos
 *    (`CrossFade`), sin que se vean ambas a la vez ni salte el alto.
 *
 * Sólo `transform` y `opacity`; con movimiento reducido las primitivas de
 * Cadence dejan nada más el fundido corto.
 *
 * `id` es el que el campo nombra en `aria-describedby`: dentro de un
 * `FormField` de Cadence es `${id}-error`, como el de su `FormError`.
 */
export interface ErrorDelCampoProps {
  id: string
  /** El error. Vacío o ausente = el campo está bien. */
  mensaje?: string | null
  /** La ayuda que se ve sin error; el error la reemplaza con un cruce. */
  pista?: ReactNode
  className?: string
}

const ESTILO = 'mt-1.5 text-caption'

export function ErrorDelCampo({ id, mensaje, pista, className }: ErrorDelCampoProps) {
  // Mientras sale, sigue diciendo lo último que dijo (si no, saldría vacío).
  const [ultimo, setUltimo] = useState(mensaje ?? '')
  if (mensaje && mensaje !== ultimo) setUltimo(mensaje)

  const error = (
    <p id={id} role="alert" className={cn(ESTILO, 'text-danger', className)}>
      {mensaje || ultimo}
    </p>
  )

  if (pista !== undefined) {
    return (
      <CrossFade swapKey={mensaje ? 'error' : 'pista'}>
        {mensaje ? error : <p className={cn(ESTILO, 'text-fg-subtle', className)}>{pista}</p>}
      </CrossFade>
    )
  }

  return (
    <Presence show={!!mensaje} direction="down" distance="xs">
      {error}
    </Presence>
  )
}
