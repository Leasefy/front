// Mirror of ~/rent/agent/src/cartera/stages.ts — keep CODES in sync when agent spec bumps (pnpm api:gen).
// NOTE: display labels diverge intentionally from the agent mirror (front-only enrichment):
// human names lead with the day range appended where the canonical data defines one
// (agent stages.ts: S1 day 1..15 · S2 16..45 · S3 46..89 · S5 ≥90). Codes/keys unchanged.

// =============================================================================
// Types
// =============================================================================

export type CarteraStage = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'SX'

export const CARTERA_STAGES: CarteraStage[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX']

// =============================================================================
// Stage labels (mirrored verbatim from agent/src/cartera/stages.ts)
// =============================================================================

export const STAGE_LABELS_ES: Record<CarteraStage, string> = {
  S0: 'Pre-vencimiento',
  S1: 'Mora temprana · 1–15 días',
  S2: 'Mora administrativa · 16–45 días',
  S3: 'Mora pre-jurídica · 46–89 días',
  S4: 'Siniestro inmobiliario',
  S5: 'Restitución / jurídico · 90+ días',
  SX: 'Ilocalizable',
}

export const STAGE_LABELS_EN: Record<CarteraStage, string> = {
  S0: 'Pre-due',
  S1: 'Early delinquency · 1–15 days',
  S2: 'Administrative collections · 16–45 days',
  S3: 'Pre-judicial collections · 46–89 days',
  S4: 'Insurance claim',
  S5: 'Judicial / eviction · 90+ days',
  SX: 'Unlocatable',
}

/**
 * Human stage name WITHOUT the day-range suffix — for tight UI (badges).
 * The full label keeps "Nombre · rango"; this returns just "Nombre".
 */
export function stageDisplayName(stage: CarteraStage, locale: string): string {
  const full = locale === 'es' ? STAGE_LABELS_ES[stage] : STAGE_LABELS_EN[stage]
  return full.split(' · ')[0]
}

// =============================================================================
// Stage color utilities
// =============================================================================

export function stageColorClasses(stage: CarteraStage): { text: string; bg: string; border: string } {
  if (stage === 'S0' || stage === 'S1') {
    return {
      text: 'text-[#2C7A53] dark:text-[#3EAE70]',
      bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
      border: 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
    }
  }
  if (stage === 'S2' || stage === 'S3') {
    return {
      text: 'text-[#B7791F] dark:text-[#D2992F]',
      bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
      border: 'border-[#B7791F]/30 dark:border-[#B7791F]/40',
    }
  }
  if (stage === 'S4' || stage === 'S5') {
    return {
      text: 'text-[#C4503B] dark:text-[#E0664D]',
      bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
      border: 'border-[#C4503B]/30 dark:border-[#C4503B]/40',
    }
  }
  // SX
  return {
    text: 'text-neutral-600 dark:text-neutral-300',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    border: 'border-neutral-200 dark:border-neutral-700',
  }
}

// =============================================================================
// Channel icon helper
// =============================================================================

export function stageChannelIcon(channel: 'voice' | 'whatsapp' | 'email'): string {
  if (channel === 'voice') return 'Phone'
  if (channel === 'whatsapp') return 'ChatTeardropDots'
  return 'EnvelopeSimple'
}

// =============================================================================
// Relative time utility (shared across cobranza components — no date-fns)
// =============================================================================

export function relativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return locale === 'es' ? 'ahora mismo' : 'just now'
  if (diffMins < 60) {
    return locale === 'es'
      ? `hace ${diffMins}min`
      : `${diffMins}min ago`
  }
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) {
    return locale === 'es'
      ? `hace ${diffHrs}h`
      : `${diffHrs}h ago`
  }
  const diffDays = Math.floor(diffHrs / 24)
  return locale === 'es'
    ? `hace ${diffDays}d`
    : `${diffDays}d ago`
}
