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

/** Rango de días de la etapa, sin el nombre. `null` para las que no tienen. */
export function stageDayRange(stage: CarteraStage, locale: string): string | null {
  const full = locale === 'es' ? STAGE_LABELS_ES[stage] : STAGE_LABELS_EN[stage]
  const [, rango] = full.split(' · ')
  return rango ?? null
}

// =============================================================================
// Qué HACE el agente en cada etapa
// =============================================================================

/**
 * La etapa no es una etiqueta: es el plan de contacto que el agente va a
 * ejecutar. Un operador que ve «S2» en un desplegable no tiene forma de saber
 * que está eligiendo «llamar los días 20, 30 y 40», y menos que S4 y S5
 * significan que el agente DEJA de llamar.
 *
 * Espejo de `CADENCE_CALENDAR` en
 * `agent/src/cartera/cadence-orchestrator.ts`. Los días se cuentan desde el
 * primer vencimiento impago (negativos = antes de la fecha de pago).
 *
 * ⚠️ Dos cosas que este texto NO dice, a propósito:
 *  - Los correos del calendario (S1 día 3, S2 día 35) están detrás de
 *    `DEBTOR_EMAIL_ENABLED` y por defecto NO se planifican. Prometerlos sería
 *    prometer algo que no pasa.
 *  - Una inmobiliaria puede tener su propio calendario
 *    (`AgencyPolicy.cadenceConfig`). Por eso la UI lo presenta como el plan
 *    por defecto, no como una garantía.
 */
export const STAGE_ACCIONES_ES: Record<CarteraStage, string> = {
  S0: 'Avisa ANTES de que venza: WhatsApp y llamada 7 y 3 días antes, y una llamada el día del vencimiento.',
  S1: 'WhatsApp el día 1 de mora, y llamadas los días 5 y 12.',
  S2: 'Llama los días 20, 30 y 40. El día 25 avisa por WhatsApp que la deuda puede reportarse a centrales de riesgo.',
  S3: 'Una sola llamada, el día 50, para anunciar la carta pre-jurídica.',
  S4: 'El agente DEJA de gestionar. El caso queda en manos de la aseguradora.',
  S5: 'El agente DEJA de gestionar. El caso queda en manos del equipo jurídico.',
  SX: 'Sólo llama al fiador, y únicamente si hay uno registrado. Al deudor no lo contacta.',
}

export const STAGE_ACCIONES_EN: Record<CarteraStage, string> = {
  S0: 'Reaches out BEFORE the due date: WhatsApp and a call 7 and 3 days ahead, plus a call on the due date.',
  S1: 'WhatsApp on day 1 of delinquency, then calls on days 5 and 12.',
  S2: 'Calls on days 20, 30 and 40. On day 25 it warns over WhatsApp that the debt may be reported to credit bureaus.',
  S3: 'A single call, on day 50, announcing the pre-judicial letter.',
  S4: 'The agent STOPS working the case. The insurer takes over.',
  S5: 'The agent STOPS working the case. The legal team takes over.',
  SX: 'Only calls the guarantor, and only if one is on file. The debtor is not contacted.',
}

/** Qué hará el agente si el caso queda en esta etapa. */
export function stageAgentPlan(stage: CarteraStage, locale: string): string {
  return locale === 'es' ? STAGE_ACCIONES_ES[stage] : STAGE_ACCIONES_EN[stage]
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
// Human case state (vision #13 — estados humanos sobre etapas técnicas)
// =============================================================================

/**
 * Maps a case's raw signals to the human-readable state i18n key
 * (`inmobiliaria.ai.cobranza.estados.*`).
 *
 * Precedence (first match wins):
 *  1. `isPaused`            → `pausado`            (a paused case is paused, no matter what)
 *  2. `escalated`           → `escalado`           (human took over / urgent queue)
 *  3. `hasBrokenPromise`    → `promesaIncumplida`  (a broken promise outranks an open one)
 *  4. `hasOpenPromise`      → `promesaActiva`
 *  5. Otherwise, by stage:
 *     - S0        → `porVencer`
 *     - S1        → `enRecordatorio`
 *     - S2        → `esperandoRespuesta`
 *     - S3        → `prejuridicoSugerido`
 *     - S4 / S5   → `escalado`
 *     - SX (and any unknown stage) → `esperandoRespuesta`
 *
 * Returns the FULL i18n key — render with `t(humanCaseState(...))`.
 */
export function humanCaseState({
  stage,
  isPaused,
  hasOpenPromise,
  hasBrokenPromise,
  escalated,
}: {
  stage: string
  isPaused?: boolean
  hasOpenPromise?: boolean
  hasBrokenPromise?: boolean
  escalated?: boolean
}): string {
  const NS = 'inmobiliaria.ai.cobranza.estados'
  if (isPaused) return `${NS}.pausado`
  if (escalated) return `${NS}.escalado`
  if (hasBrokenPromise) return `${NS}.promesaIncumplida`
  if (hasOpenPromise) return `${NS}.promesaActiva`
  switch (stage) {
    case 'S0':
      return `${NS}.porVencer`
    case 'S1':
      return `${NS}.enRecordatorio`
    case 'S2':
      return `${NS}.esperandoRespuesta`
    case 'S3':
      return `${NS}.prejuridicoSugerido`
    case 'S4':
    case 'S5':
      return `${NS}.escalado`
    case 'SX':
    default:
      return `${NS}.esperandoRespuesta`
  }
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
