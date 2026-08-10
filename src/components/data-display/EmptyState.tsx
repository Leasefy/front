'use client'

import * as React from 'react'

/**
 * EmptyState — primitiva universal de estado vacío ("nada todavía": cero
 * cotizaciones, cero deudores, datos insuficientes, etc.). Honesto: nunca
 * rellena con datos de muestra. Para el caso "bajo umbral / pendiente de
 * backend" todavía existe <NoDataYetBadge />.
 *
 * ⚠️ Tokens, NO `neutral-*` crudo. La paleta `neutral` de este proyecto ya es
 * sensible al tema (`hsl(var(--neutral-N))` cambia con `.dark`), así que un
 * `dark:text-neutral-100` **invierte dos veces**: en oscuro resolvía a
 * `hsl(40 8% 14%)` —casi negro— y el TÍTULO de todos los estados vacíos del
 * producto era ilegible sobre la tarjeta oscura. La descripción se salvaba de
 * casualidad, porque `--neutral-400` sí es claro en oscuro. Se usan los
 * semánticos: `text-fg` · `text-fg-muted` · `text-fg-subtle` ·
 * `bg-surface-muted` · `border-border` (ver `docs/DESIGN.md`).
 *
 * Estilo (rediseño 2026-06-16, pedido de Nico): limpio y MONOCROMO —
 * sin caja, sin borde punteado, sin fondo gris, sin líneas decorativas ni
 * ícono en azul de marca. Ícono mudo en gris dentro de un chip neutro,
 * título + descripción neutros, y el ÚNICO elemento con énfasis es el CTA
 * (si existe). Referencia visual: empty states de ElevenLabs.
 *
 * - icon: componente Phosphor-style (className, size, weight).
 * - title + description llegan PRE-traducidos desde la página (no usa useI18n).
 * - role="status" + aria-label={title} para anuncio único a lectores.
 * - CTA: <a> si hay href; <button> si solo hay onClick.
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

// CTA primario: botón discreto con borde (white/dark), estilo ElevenLabs —
// el único elemento con énfasis del empty state. El secundario es link mudo.
const PRIMARY_CTA_CLASSES =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium ' +
  'bg-card text-fg border border-border ' +
  'hover:border-fg-subtle hover:shadow-sm ' +
  'active:scale-[0.98] transition-all duration-150'

const SECONDARY_CTA_CLASSES =
  'text-xs text-fg-muted hover:text-fg underline underline-offset-2'

function renderCta(cta: EmptyStateCta, classes: string): React.ReactElement | null {
  if (cta.href) {
    return (
      <a href={cta.href} className={classes}>
        {cta.label}
      </a>
    )
  }
  if (cta.onClick) {
    return (
      <button type="button" onClick={cta.onClick} className={classes}>
        {cta.label}
      </button>
    )
  }
  return null
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryCta,
  secondaryCta,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      {/* Ícono mudo en chip neutro — sin azul, sin líneas, sin caja */}
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-muted">
        <Icon weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        <p className="text-sm text-fg-muted max-w-sm leading-relaxed mx-auto">{description}</p>
      </div>
      {primaryCta ? (
        <div className="mt-1">{renderCta(primaryCta, PRIMARY_CTA_CLASSES)}</div>
      ) : null}
      {secondaryCta ? <div>{renderCta(secondaryCta, SECONDARY_CTA_CLASSES)}</div> : null}
    </div>
  )
}
