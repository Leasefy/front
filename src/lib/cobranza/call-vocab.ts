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

/**
 * Motivos de escalación que el agente escribe como slug
 * (`persist-escalation-from-verdict.ts`). NO son un enum cerrado: la tool
 * `escalate-to-human` acepta `z.string().min(1).max(500)`, así que el motivo
 * también puede llegar como frase escrita. Por eso esto NO usa `lookup()`
 * —ver `escalationReasonLabel`.
 */
const ESCALATION_REASON_LABELS: Record<string, string> = {
  forced_transition_escalate_human: 'El agente pidió pasar a una persona',
  fraud_signal_confirmed: 'Señal de fraude confirmada',
  // 🔴 QA-AGENTES 16-10 (MORI-29): los que escribe el micro y la pantalla
  // pintaba como «Otro (whatsapp_inbound_free_text)», «Otro (dispute)»…
  dispute: 'Se abrió una disputa: revisa el saldo antes de seguir cobrando',
  whatsapp_inbound_free_text: 'Escribió por WhatsApp algo que Mori no supo responder',
  whatsapp_inbound_location: 'Mandó una ubicación por WhatsApp',
  whatsapp_inbound_contact: 'Mandó un contacto por WhatsApp',
  whatsapp_inbound_unknown_button: 'Tocó un botón de WhatsApp que Mori no reconoce',
  whatsapp_inbound_need_plan: 'Pidió un acuerdo de pago por WhatsApp',
  whatsapp_inbound_media: 'Mandó un archivo por WhatsApp (foto, audio o documento)',
  whatsapp_inbound_sin_cobro: 'Escribió por WhatsApp con la cobranza en pausa o el canal cerrado',
  whatsapp_payment_link_send_failed: 'No le llegó el link de pago por WhatsApp',
  whatsapp_cierre_sin_envio: 'Quedó un acuerdo por WhatsApp pero no le llegó la constancia',
  whatsapp_identidad_sin_envio: 'Mori no pudo pedirle por WhatsApp que confirme su identidad',
  whatsapp_comprobante_de_pago: 'Mandó un comprobante de pago por WhatsApp',
  whatsapp_respuesta_bloqueada_por_la_cerca: 'Mori frenó su respuesta por WhatsApp porque no cumplía las reglas',
  whatsapp_conductor_sin_respuesta: 'Mori no pudo responder por WhatsApp',
  whatsapp_pide_enlace_de_pago: 'Pidió el link de pago por WhatsApp',
  voz_exclusion_sin_titular_revisar_numero:
    'En una llamada, alguien que no es el titular pidió que no llamen a ese número',
}

/**
 * Lo que pasó en la llamada, por el efecto del caso (`playbook_<id>_<efecto>`,
 * `playbookEscalationReason` del micro).
 */
const EFECTO_DEL_CASO: Record<string, string> = {
  register_only: 'dejó una nota para el equipo',
  pause_collection: 'pausó el cobro de ese valor hasta verificarlo',
  escalate_human: 'pidió que lo revise una persona',
  escalate_legal: 'el caso va para jurídico',
  flag_vulnerable: 'el inquilino está en una situación difícil: sin presión',
  suppress_channel: 'no quiere que lo contacten por ese número',
  opt_out: 'pidió que no lo contacten',
  halt_case: 'se detuvo toda la cobranza del caso',
  fraud_flag: 'posible suplantación: la cobranza queda congelada',
}

/**
 * Lo que Mori le prometió al inquilino y no quedó programado
 * (`accion_<tipo>_sin_encolar`, `playbook-effects.ts` del micro).
 */
const ACCION_PROMETIDA: Record<string, string> = {
  enviar_estado_de_cuenta: 'mandarle el estado de cuenta',
  abrir_ticket_de_mantenimiento: 'abrir una solicitud de mantenimiento',
  solicitar_paz_y_salvo: 'revisar su paz y salvo',
  solicitar_debito_automatico: 'ayudarle con el débito automático',
  enviar_acuerdo: 'mandarle el acuerdo por escrito',
  agendar_retoma: 'volver a contactarlo en la fecha que pidió',
  registrar_preferencia_de_persona: 'que lo atienda una persona del equipo',
}

function motivoConPartes(slug: string): string | null {
  const caso = /^playbook_\d{3}_([a-z_]+)$/.exec(slug)
  if (caso) {
    const efecto = EFECTO_DEL_CASO[caso[1]]
    return efecto ? `En la llamada: ${efecto}` : null
  }
  const accion = /^accion_([a-z_]+)_sin_encolar$/.exec(slug)
  if (accion) {
    const que = ACCION_PROMETIDA[accion[1]]
    return que ? `Mori prometió ${que} y hay que hacerlo a mano` : null
  }
  return null
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

/**
 * Motivo de una escalación, listo para mostrar.
 *
 * Tres casos, porque el campo tiene tres orígenes distintos:
 *   1. slug conocido      → su frase en español
 *   2. slug desconocido   → marcado, para que se vea que falta traducirlo
 *   3. frase escrita      → tal cual (la tool acepta texto libre)
 *
 * Se distingue por la forma: sólo `[a-z0-9_]` es un slug. Sin esto, un motivo
 * escrito por el agente saldría envuelto en «Otro (…)», y un slug saldría en
 * inglés en la mitad de una pantalla en español.
 */
export function escalationReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null
  const limpio = reason.trim()
  if (!limpio) return null
  const conocido = ESCALATION_REASON_LABELS[limpio] ?? motivoConPartes(limpio)
  if (conocido) return conocido
  return /^[a-z0-9_]+$/.test(limpio) ? `Otro (${limpio})` : limpio
}
