'use client'

import * as React from 'react'
import type { Icon } from '@phosphor-icons/react'
import {
  EmptyState as EmptyStateCanonico,
  type EmptyStateAction,
} from '@/components/ui/empty-state'

/**
 * EmptyState — ADAPTADOR sobre el canónico `@/components/ui/empty-state`.
 *
 * ── Por qué esto es un adaptador y no un componente ────────────────────────
 *
 * Hasta el 2026-09-05 el panel tenía DOS estados vacíos distintos con el mismo
 * nombre: éste (47 call sites) y `@/components/ui/empty-state` (22). Se veían
 * parecidos y no eran iguales: éste encerraba el ícono en un `rounded-2xl`
 * —una loseta— y armaba sus CTAs con `<a>` y `<button>` crudos con clases
 * escritas a mano, así que quedaban fuera del pill, del foco cobalto y del
 * `active:scale` del `Button` del DS. La regla del proyecto es explícita:
 * gris y **encerrado en círculos**. Ese es el otro.
 *
 * Se conserva el archivo —y su API `primaryCta` / `secondaryCta`— para no
 * tocar 47 imports, pero ya no dibuja nada: delega. Un solo lugar decide cómo
 * se ve un vacío en todo el producto.
 *
 * - icon: componente Phosphor-style (className, size, weight).
 * - title + description llegan PRE-traducidos desde la página (no usa useI18n).
 * - role="status" + aria-label={title} los pone el canónico.
 */

export type EmptyStateCta = {
  label: string
  href?: string
  onClick?: () => void
}

export type EmptyStateProps = {
  icon: React.ComponentType<any>
  title: string
  description: string
  primaryCta?: EmptyStateCta
  secondaryCta?: EmptyStateCta
}

/**
 * El canónico distingue en el TIPO entre «lleva a algún lado» y «hace algo
 * acá»; esta API vieja los deja a los dos opcionales. Una CTA sin `href` ni
 * `onClick` no es una CTA: se descarta en vez de pintar un botón muerto.
 */
function aAccion(cta: EmptyStateCta | undefined): EmptyStateAction | undefined {
  if (!cta) return undefined
  if (cta.href) return { label: cta.label, href: cta.href }
  if (cta.onClick) return { label: cta.label, onClick: cta.onClick }
  return undefined
}

export function EmptyState({
  icon,
  title,
  description,
  primaryCta,
  secondaryCta,
}: EmptyStateProps) {
  return (
    <EmptyStateCanonico
      icon={icon as Icon}
      title={title}
      description={description}
      action={aAccion(primaryCta)}
      secondaryAction={aAccion(secondaryCta)}
    />
  )
}
