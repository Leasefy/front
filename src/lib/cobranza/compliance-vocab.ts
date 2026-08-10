/**
 * compliance-vocab.ts — traducción de los eventos de cumplimiento a español.
 *
 * ── De dónde salen ───────────────────────────────────────────────────────────
 *
 * De `agent.compliance_events`, que es donde el agente los escribe de verdad.
 * Antes la pantalla leía `calls.compliance_flags`: una columna que NADIE
 * escribe y que estaba vacía en las 129 llamadas de la base, así que el panel
 * de cumplimiento no mostró nunca nada — ni en desarrollo ni en producción.
 *
 * ── La distinción que importa ────────────────────────────────────────────────
 *
 * Un BLOQUEO no es una INFRACCIÓN. Son cosas opuestas:
 *
 *   `schedule_violation`        → se contactó fuera de horario. Pasó.
 *   `sms_schedule_blocked`      → se iba a contactar fuera de horario y el
 *                                 sistema lo impidió. NO pasó.
 *
 * Pintar los dos igual haría que una inmobiliaria lea como falta lo que en
 * realidad es la defensa funcionando. Por eso hay tres niveles y el del medio
 * («prevenido») existe sólo para eso.
 *
 * ── La regla ─────────────────────────────────────────────────────────────────
 *
 * NUNCA se pinta un slug crudo, igual que en [[call-vocab]]. Un evento
 * desconocido sale como «Otro (<slug>)» con tono neutro: se ve que hay algo,
 * sin fingir que sabemos qué tan grave es.
 */

/** Gravedad de cara al operador. */
export type ComplianceSeverity =
  /** Ocurrió algo que no debía. */
  | 'critical'
  /** El sistema impidió que ocurriera. Es buena noticia, pero hay que verla. */
  | 'prevented'
  /** Traza informativa del proceso. */
  | 'info'

interface ComplianceMeta {
  label: string
  severity: ComplianceSeverity
}

/**
 * Vocabulario levantado del código del agente (`eventType:` en `src/`) y
 * contrastado con lo que existe en la base.
 */
const COMPLIANCE_EVENTS: Record<string, ComplianceMeta> = {
  // ── Ocurrió: infracciones de verdad ───────────────────────────────────────
  frequency_violation: {
    label: 'Se superó la frecuencia permitida',
    severity: 'critical',
  },
  schedule_violation: {
    label: 'Contacto fuera de horario',
    severity: 'critical',
  },
  schedule_violation_detected: {
    label: 'Contacto fuera de horario',
    severity: 'critical',
  },
  ai_disclosure_violation: {
    label: 'No se avisó que es un asistente automatizado',
    severity: 'critical',
  },
  disclosure_ordering_violation: {
    label: 'Se habló de la deuda antes de los avisos obligatorios',
    severity: 'critical',
  },
  identity_verification_violation: {
    label: 'Se siguió sin verificar la identidad',
    severity: 'critical',
  },
  payment_amount_mismatch: {
    label: 'El monto ofrecido no coincide con la deuda',
    severity: 'critical',
  },
  fraud_signal: { label: 'Señal de fraude', severity: 'critical' },
  codeudor_prohibited_copy: {
    label: 'Se le contó la deuda al codeudor sin poder hacerlo',
    severity: 'critical',
  },

  // ── No ocurrió: el sistema lo impidió ─────────────────────────────────────
  guardrail_block: { label: 'Respuesta bloqueada', severity: 'prevented' },
  guardrail_block_post_response: {
    label: 'Respuesta bloqueada antes de enviarse',
    severity: 'prevented',
  },
  guardrail_rewrite: { label: 'Respuesta reescrita', severity: 'prevented' },
  guardrail_flag: { label: 'Respuesta marcada para revisión', severity: 'prevented' },
  negotiation_validator_block: {
    label: 'Acuerdo fuera de política, bloqueado',
    severity: 'prevented',
  },
  frequency_cap_blocked: {
    label: 'Contacto frenado por tope de frecuencia',
    severity: 'prevented',
  },
  cadence_skip: { label: 'Contacto omitido por la cadencia', severity: 'prevented' },
  sms_schedule_blocked: { label: 'SMS frenado por horario', severity: 'prevented' },
  codeudor_schedule_blocked: {
    label: 'Contacto al codeudor frenado por horario',
    severity: 'prevented',
  },
  precall_schedule_recheck_blocked: {
    label: 'Llamada frenada al revalidar el horario',
    severity: 'prevented',
  },
  motive_question_blocked: { label: 'Pregunta fuera de guion, bloqueada', severity: 'prevented' },
  invalid_transition_blocked: {
    label: 'Salto de estado inválido, bloqueado',
    severity: 'prevented',
  },
  rne_blocked: {
    label: 'Contacto frenado por el Registro Nacional de Exclusión',
    severity: 'prevented',
  },
  opt_out_blocked_followup: {
    label: 'Seguimiento frenado: pidió no ser contactado',
    severity: 'prevented',
  },
  opt_out_blocked_sms: {
    label: 'SMS frenado: pidió no ser contactado',
    severity: 'prevented',
  },
  codeudor_skipped_judicializado: {
    label: 'Codeudor omitido por caso judicializado',
    severity: 'prevented',
  },
  followup_skipped: { label: 'Seguimiento omitido', severity: 'prevented' },
  whatsapp_compose_skipped: { label: 'WhatsApp no enviado', severity: 'prevented' },
  contact_pause_review_pending: {
    label: 'Contacto en pausa, esperando revisión',
    severity: 'prevented',
  },
  inbound_outside_hours: { label: 'Entrante fuera de horario', severity: 'prevented' },

  // ── Traza del proceso ─────────────────────────────────────────────────────
  contact_attempt: { label: 'Intento de contacto', severity: 'info' },
  opt_out_request: { label: 'Pidió no ser contactado', severity: 'info' },
  opt_out_invoked: { label: 'Pidió no ser contactado', severity: 'info' },
  opt_out_observed: { label: 'Se detectó que no quiere ser contactado', severity: 'info' },
  opt_out_acknowledged: { label: 'Se confirmó la baja de contacto', severity: 'info' },
  arco_request: { label: 'Solicitud de datos personales (ARCO)', severity: 'info' },
  commitment_executed: { label: 'Compromiso cumplido', severity: 'info' },
  objection_handled: { label: 'Objeción atendida', severity: 'info' },
  playbook_applied: { label: 'Se aplicó un playbook', severity: 'info' },
  playbook_guidance: { label: 'Guía de playbook', severity: 'info' },
  anti_stall_rescue: { label: 'Se retomó la conversación estancada', severity: 'info' },
  fragmented_text_rescue: { label: 'Se recompuso un mensaje partido', severity: 'info' },
  inbound_caller_id_multi_match: {
    label: 'El número entrante coincide con varios deudores',
    severity: 'info',
  },
  codeudor_contacted: { label: 'Se contactó al codeudor', severity: 'info' },
  bureau_report: { label: 'Reporte a centrales', severity: 'info' },
  central_notification: { label: 'Aviso previo a centrales', severity: 'info' },
  crm_sync: { label: 'Sincronización con el CRM', severity: 'info' },
  payment_provider_failover: { label: 'Se cambió de pasarela de pago', severity: 'info' },
  whatsapp_inbound_free_text: { label: 'Mensaje libre por WhatsApp', severity: 'info' },
  whatsapp_inbound_pay_now: { label: 'Pidió pagar por WhatsApp', severity: 'info' },
}

export function complianceEventLabel(code: string): string {
  return COMPLIANCE_EVENTS[code]?.label ?? `Otro (${code})`
}

/**
 * Un código desconocido va como `info`, no como grave: pintar de rojo lo que
 * no sabemos si es grave convierte cualquier marca en alarma.
 */
export function complianceEventSeverity(code: string): ComplianceSeverity {
  return COMPLIANCE_EVENTS[code]?.severity ?? 'info'
}

/** ¿Hay algo que de verdad haya que mirar? Sirve para no rotular ruido. */
export function hasCriticalCompliance(codes: string[]): boolean {
  return codes.some((c) => complianceEventSeverity(c) === 'critical')
}
