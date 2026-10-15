'use client'

/**
 * NairaSinPermiso — el 403 de una lectura principal de Naira (Fase 13, plan 13-02; D13-3, D13-4, UI-SPEC §8.2).
 *
 * El 403 del servicio de agentes es la autoridad final: `PageGuard` deja pasar a `isAdmin` (`PageGuard.tsx:57`, R13-7),
 * así que el admin del monolito sin la acción `naira` llega hasta la vista y es el servidor el que niega. Cuando el que
 * niega es el FRONT, `PageGuard` ya no redirige: pinta su propio 403 (`:98-108`). En los dos casos se DICE, nunca se
 * redirige en silencio.
 *
 * No recibe ni pinta ningún dato: solo el cartel de `FalloDeCarga` con un 403 (clasificación `sinPermiso`, «No tienes
 * acceso a esto», sin reintentar) y la salida que pone la página (`volverA`). Hereda el `role="alert"` de `FalloDeCarga`
 * aunque UI-SPEC §11.1 pida `role="status"` (el componente existente no se toca, P5), y el texto genérico también para el
 * admin: la variante «no es por tus permisos» de `clasificar.ts` solo aplica a un cuerpo `SIN_PERMISO_DE_MODULO`.
 */

import type { JSX } from 'react'

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'

export function NairaSinPermiso({
  volverA,
}: {
  readonly volverA: { readonly label: string; readonly href: string }
}): JSX.Element {
  return (
    <div data-testid="naira-sin-permiso">
      <FalloDeCarga error={new Error('403')} volverA={volverA} />
    </div>
  )
}
