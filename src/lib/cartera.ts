// Mirror of ~/rent/agent/src/cartera/stages.ts — keep in sync when agent spec bumps (pnpm api:gen).

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
  S1: 'Cartera fresca',
  S2: 'Mora administrativa',
  S3: 'Mora pre-jurídica',
  S4: 'Siniestro inmobiliario',
  S5: 'Restitución / jurídico',
  SX: 'Skip / Abandono',
}

export const STAGE_LABELS_EN: Record<CarteraStage, string> = {
  S0: 'Pre-due',
  S1: 'Fresh delinquency',
  S2: 'Administrative collections',
  S3: 'Pre-judicial collections',
  S4: 'Insurance claim',
  S5: 'Judicial / eviction',
  SX: 'Skip / abandoned',
}

// =============================================================================
// Stage color utilities
// =============================================================================

export function stageColorClasses(stage: CarteraStage): { text: string; bg: string; border: string } {
  if (stage === 'S0' || stage === 'S1') {
    return {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
    }
  }
  if (stage === 'S2' || stage === 'S3') {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
    }
  }
  if (stage === 'S4' || stage === 'S5') {
    return {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
    }
  }
  // SX
  return {
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
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
