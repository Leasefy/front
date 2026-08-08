/**
 * call-vocab.ts — traducción de los slugs de llamadas a español.
 *
 * ── Por qué hay DOS vocabularios de resultado ────────────────────────────────
 *
 * `call.outcome` (la columna) guarda el estado terminal de la máquina de
 * llamada: 7 buckets mecánicos —contestó, no contestó, buzón, número
 * equivocado, falló, opt-out, escaló—. Lo escribe `mapStateToOutcome`.
 *
 * `call.summary.outcome` (el resumen) guarda el juicio del CallSummarizer
 * sobre la CONVERSACIÓN: 11 buckets —pagó, acordó un plan, disputa,
 * dificultad económica, fraude…—.
 *
 * No son lo mismo y no se pueden mezclar: una llamada puede ser `completed`
 * (contestaron y terminó bien la mecánica) y a la vez `dispute` (el deudor
 * niega la deuda). Por eso la UI muestra el del resumen cuando existe —dice
 * más— y cae al de la columna cuando no.
 *
 * ── La regla ─────────────────────────────────────────────────────────────────
 *
 * NUNCA se pinta un slug crudo. `contacted`, `promise`, `refused` estuvieron
 * semanas visibles en la tabla, en inglés, porque el fallback era
 * `?? call.outcome`. Un slug que no conocemos se muestra como «Otro
 * (<slug>)`» — así el operador ve que hay algo y nosotros vemos qué agregar,
 * sin fingir que lo entendimos.
 *
 * OJO: `agent.calls.outcome` NO tiene CHECK constraint pese a lo que dice el
 * comentario del schema de Prisma, así que la columna acepta cualquier texto.
 * Este mapa es la única defensa entre la base y la pantalla.
 */

// ── Resultado de la máquina de llamada (columna `outcome`) ───────────────────

const CALL_OUTCOME_LABELS: Record<string, string> = {
  completed: 'Completada',
  no_answer: 'Sin respuesta',
  voicemail: 'Buzón de voz',
  wrong_party: 'Persona equivocada',
  failed: 'Fallida',
  opt_out: 'Pidió no ser contactado',
  escalated: 'Escalada a humano',
}

// ── Resultado del resumen (los 11 buckets del CallSummarizer) ────────────────

const SUMMARY_OUTCOME_LABELS: Record<string, string> = {
  paid_full: 'Pagó el total',
  paid_partial: 'Pagó parcial',
  plan_agreed: 'Acordó un plan',
  hardship_extension: 'Prórroga por dificultad',
  dispute: 'Disputa la deuda',
  no_resolution: 'Sin acuerdo',
  opt_out: 'Pidió no ser contactado',
  fraud: 'Señales de fraude',
  escalated: 'Escalada a humano',
  callback_later: 'Pidió que lo llamen después',
  no_answer: 'Sin respuesta',
}

/**
 * Tono del resultado, para elegir el tinte del badge. `neutral` a propósito
 * en lo que no es ni bueno ni malo (sin respuesta, buzón): pintarlo de rojo
 * convierte la operación normal en alarma.
 */
export type OutcomeTone = 'positive' | 'negative' | 'attention' | 'neutral'

const OUTCOME_TONES: Record<string, OutcomeTone> = {
  // máquina
  completed: 'positive',
  no_answer: 'neutral',
  voicemail: 'neutral',
  wrong_party: 'attention',
  failed: 'negative',
  opt_out: 'attention',
  escalated: 'attention',
  // resumen
  paid_full: 'positive',
  paid_partial: 'positive',
  plan_agreed: 'positive',
  hardship_extension: 'attention',
  dispute: 'negative',
  no_resolution: 'neutral',
  fraud: 'negative',
  callback_later: 'neutral',
}

// ── Canal y dirección ────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  voice: 'Voz',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Correo',
}

const DIRECTION_LABELS: Record<string, string> = {
  outbound: 'Saliente',
  inbound: 'Entrante',
}

// ── Señales del resumen ──────────────────────────────────────────────────────

const SENTIMENT_LABELS: Record<string, string> = {
  cooperative: 'Colaborativo',
  neutral: 'Neutral',
  frustrated: 'Molesto',
  hostile: 'Hostil',
}

const NEXT_ACTION_LABELS: Record<string, string> = {
  send_payment_link: 'Enviar link de pago',
  send_reminder: 'Enviar recordatorio',
  retry_voice: 'Reintentar llamada',
  escalate_human: 'Escalar a un humano',
  no_action: 'Sin acción pendiente',
}

const FRAUD_FLAG_LABELS: Record<string, string> = {
  third_party_answered: 'Contestó un tercero',
  identity_refuted: 'Negó su identidad',
  contradictory_data: 'Datos contradictorios',
  pressure_unsolicited_info: 'Pidió información no solicitada',
  impersonation_attempt: 'Intento de suplantación',
  amount_fabrication_detected: 'Monto inventado',
  other: 'Otra señal',
}

const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
  wompi: 'Wompi',
  bold: 'Bold',
  efectivo: 'Efectivo',
}

// ── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Traduce un slug o, si no lo conocemos, lo muestra marcado como desconocido.
 * Nunca devuelve el slug pelado — un enum en inglés en la mitad de una tabla
 * en español es un bug visible, no un detalle.
 */
function lookup(map: Record<string, string>, slug: string | null | undefined): string | null {
  if (!slug) return null
  return map[slug] ?? `Otro (${slug})`
}

/** ¿Es un slug que el mapa conoce? Útil para no ofrecer filtros muertos. */
export function isKnownCallOutcome(slug: string | null | undefined): boolean {
  return !!slug && slug in CALL_OUTCOME_LABELS
}

export const callOutcomeLabel = (s: string | null | undefined) => lookup(CALL_OUTCOME_LABELS, s)
export const summaryOutcomeLabel = (s: string | null | undefined) =>
  lookup(SUMMARY_OUTCOME_LABELS, s)
export const channelLabel = (s: string | null | undefined) => lookup(CHANNEL_LABELS, s)
export const directionLabel = (s: string | null | undefined) => lookup(DIRECTION_LABELS, s)
export const sentimentLabel = (s: string | null | undefined) => lookup(SENTIMENT_LABELS, s)
export const nextActionLabel = (s: string | null | undefined) => lookup(NEXT_ACTION_LABELS, s)
export const fraudFlagLabel = (s: string | null | undefined) => lookup(FRAUD_FLAG_LABELS, s)
export const paymentChannelLabel = (s: string | null | undefined) =>
  lookup(PAYMENT_CHANNEL_LABELS, s)

export function outcomeTone(slug: string | null | undefined): OutcomeTone {
  if (!slug) return 'neutral'
  return OUTCOME_TONES[slug] ?? 'neutral'
}

/** Variante de `Badge` (@/components/ui) para cada tono. */
export function outcomeBadgeVariant(
  slug: string | null | undefined,
): 'success' | 'destructive' | 'warning' | 'secondary' {
  switch (outcomeTone(slug)) {
    case 'positive':
      return 'success'
    case 'negative':
      return 'destructive'
    case 'attention':
      return 'warning'
    default:
      return 'secondary'
  }
}
