// Estudio de inquilino — color utilities (UX-only presentation layer).
// Usa TOKENS semánticos del DS (success/warning/danger/primary + *-soft), que
// ya son theme-aware vía CSS vars (no hace falta `dark:`). Migrado del hex de
// marca hardcodeado al contrato de UI (claudedocs/UI-DS-CONTRACT-2026-06-16.md).

import type { EstudioResultType, IndicatorStatus } from '@/lib/estudio/decision'

// =============================================================================
// Result-type color utilities (decision card / badges)
// =============================================================================

/**
 * Token classes for an estudio result type.
 *  - viable                    → success (verde)
 *  - viable_con_condiciones    → warning (ámbar)
 *  - requiere_analisis_humano  → primary (azul: "necesita un humano")
 *  - no_recomendado            → danger  (rojo)
 *
 * Returns `text` / `bg` / `border` / `ring` Tailwind class strings.
 */
export function resultTypeColorClasses(rt: EstudioResultType): {
  text: string
  bg: string
  border: string
  ring: string
} {
  if (rt === 'viable') {
    return {
      text: 'text-success',
      bg: 'bg-success-soft',
      border: 'border-success/30',
      ring: 'ring-success/30',
    }
  }
  if (rt === 'viable_con_condiciones') {
    return {
      text: 'text-warning',
      bg: 'bg-warning-soft',
      border: 'border-warning/30',
      ring: 'ring-warning/30',
    }
  }
  if (rt === 'requiere_analisis_humano') {
    return {
      text: 'text-primary',
      bg: 'bg-primary-soft',
      border: 'border-primary/30',
      ring: 'ring-primary/30',
    }
  }
  // no_recomendado
  return {
    text: 'text-danger',
    bg: 'bg-danger-soft',
    border: 'border-danger/30',
    ring: 'ring-danger/30',
  }
}

// =============================================================================
// Indicator-status color utilities (indicadores table "resultado" pills)
// =============================================================================

/**
 * Full badge class string for an indicator status pill.
 *  ok → success · warn → warning · bad → danger · neutral → gris (tokens fg/surface)
 * Returns text + bg + border together so it can drop straight onto a `<span>`.
 */
export function indicatorStatusClasses(estado: IndicatorStatus): string {
  if (estado === 'ok') {
    return 'text-success bg-success-soft border border-success/30'
  }
  if (estado === 'warn') {
    return 'text-warning bg-warning-soft border border-warning/30'
  }
  if (estado === 'bad') {
    return 'text-danger bg-danger-soft border border-danger/30'
  }
  // neutral
  return 'text-fg-muted bg-surface-muted border border-border'
}
