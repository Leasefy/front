'use client'

import type { ReactNode } from 'react'
import { FormError } from '@leasefy/cadence'
import { cn } from '@/lib/utils'

/**
 * El mensaje de error bajo un campo, con su entrada suave (02-10-2026).
 *
 * Adaptador fino sobre `FormError` de Cadence (v1.1.1), que es donde vive el
 * movimiento desde que Nico lo pidió en el sistema de diseño: todo formulario
 * que use el `FormError` de Cadence lo hereda. Este adaptador sólo conserva la
 * API en español y el aire de arriba (`mt-1.5`) de los pasos que lo usan.
 *
 * Sistema de errores de la plataforma: el error de un campo —el del cliente
 * (zod) o el que mandó el servidor en `campos[]` (ver
 * `lib/errores/errores-en-el-formulario.ts`)— se pinta debajo del campo con el
 * estilo de error de la casa y ENTRA, no aparece de golpe:
 *
 *  · sin `pista`: baja 4px con un fundido y al corregirse sale acelerando,
 *    diciendo lo último que dijo (no sale vacío);
 *  · con `pista` (la ayuda gris que el error reemplaza): cruce entre las dos,
 *    sin que se vean ambas a la vez ni salte el alto.
 *
 * Sólo `transform` y `opacity`; con movimiento reducido queda el fundido corto.
 *
 * `id` es el que el campo nombra en `aria-describedby`: dentro de un
 * `FormField` de Cadence es `${id}-error`, el mismo que pone su `FormControl`.
 * Se ve cuando hay `mensaje`, esté o no dentro de un `FormField`.
 *
 * La `pista` lleva su propio id, `${id}-pista` (02-10-2026): fuera de un
 * `FormField`, Cadence no le pone ninguno y el campo no tenía cómo nombrarla.
 * Así el control dice `aria-describedby={`${id}-pista ${id}`}` y el lector lee
 * la ayuda sin error y el error cuando lo hay (sólo existe el que se ve). Va en
 * un `<span>` dentro del mismo `<p>`: el aspecto no cambia.
 */
export interface ErrorDelCampoProps {
  id: string
  /** El error. Vacío o ausente = el campo está bien. */
  mensaje?: string | null
  /** La ayuda que se ve sin error; el error la reemplaza con un cruce. */
  pista?: ReactNode
  className?: string
}

export function ErrorDelCampo({ id, mensaje, pista, className }: ErrorDelCampoProps) {
  const ayuda = pista === undefined ? undefined : <span id={`${id}-pista`}>{pista}</span>
  return (
    <FormError id={id} invalid={!!mensaje} hint={ayuda} className={cn('mt-1.5', className)}>
      {mensaje || null}
    </FormError>
  )
}
