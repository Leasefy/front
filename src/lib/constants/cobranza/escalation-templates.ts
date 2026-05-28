/**
 * Plan 34-06 — Escalation resolve templates (D-34-05, hardcoded seed)
 *
 * Five categories shipped in Phase 34. The user-facing labels + 1-line
 * stubs live in i18n (already seeded by Plan 34-02 under
 * `inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.*`).
 *
 * Phase 36 will replace this constant with a user-editable templates
 * surface; the UI consuming TEMPLATES stays the same shape.
 */

export type EscalationCategory =
  | 'compromise'
  | 'customer-rejected'
  | 'escalated-to-legal'
  | 'false-positive'
  | 'other'

export interface EscalationTemplate {
  id: EscalationCategory
  /** i18n key for the dropdown label */
  labelKey: string
  /** i18n key for the textarea seed stub */
  stubKey: string
}

export const TEMPLATES: ReadonlyArray<EscalationTemplate> = [
  {
    id: 'compromise',
    labelKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.compromise',
    stubKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.compromise',
  },
  {
    id: 'customer-rejected',
    labelKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.customerRejected',
    stubKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.customerRejected',
  },
  {
    id: 'escalated-to-legal',
    labelKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.escalatedToLegal',
    stubKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.escalatedToLegal',
  },
  {
    id: 'false-positive',
    labelKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.falsePositive',
    stubKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.falsePositive',
  },
  {
    id: 'other',
    labelKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.other',
    stubKey: 'inmobiliaria.ai.cobranza.escalaciones.resolveTemplates.other',
  },
] as const

/**
 * Urgency rank for client-side sort (defensive — backend already sorts).
 * Higher = more urgent. Used in kanban column ordering.
 */
export const URGENCY_RANK = {
  live: 3,
  high: 2,
  medium: 1,
  low: 0,
} as const

export type UrgencyLevel = keyof typeof URGENCY_RANK

export const RESOLUTION_TEXT_MIN = 80
export const RESOLUTION_TEXT_MAX = 2000
