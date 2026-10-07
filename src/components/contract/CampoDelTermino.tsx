'use client'

import type { ReactNode } from 'react'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'

/**
 * Un término del contrato (fecha, canon, depósito, día de pago…) con su
 * rótulo, su ayuda y su error (02-10-2026).
 *
 * Lo comparten «Crear contrato» y «Editar contrato». Antes cada pantalla tenía
 * su `Field` con un párrafo rojo hecho a mano: el error aparecía de golpe,
 * en 12 px, sin `role="alert"` y sin que el campo lo nombrara. Ahora va por `ErrorDelCampo` (el `FormError` de Cadence): entra
 * suave, la ayuda y el error se cruzan sin saltar el alto, y con el `id` que
 * el control nombra en `aria-describedby` (ver `ariaDelCampoDelContrato`).
 */
export function CampoDelTermino({
  id,
  label,
  error,
  hint,
  children,
}: {
  /** El id del control; el error queda en `${id}-error`. Sin id, el rótulo no apunta a nada. */
  id?: string
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      <ErrorDelCampo id={`${id ?? 'campo'}-error`} mensaje={error} pista={hint} className="mt-0" />
    </div>
  )
}
