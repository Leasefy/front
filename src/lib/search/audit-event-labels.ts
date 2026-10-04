/**
 * audit-event-labels — cómo se DICE un evento del audit log del micro.
 *
 * El feed «Novedades» del buscador (⌘K) lee `GET /api/agency/:id/cobranza/audit-log`.
 * Allá `action` es una columna TEXT sin enum: cada writer del agente escribe su
 * propio slug (`precall.held_for_approval`, `dialer.call_placed`,
 * `escalation_claim`, `legal.package_sealed`, `erp.sync.invoices`…) en tres
 * convenciones distintas (punto, guion bajo, guion). El panel mostraba ese slug
 * tal cual, al lado de `debtor · hace 6h`.
 *
 * Acá vive la traducción, en tres capas:
 *
 *   1. Diccionario slug → frase (es/en), armado a partir de los literales que
 *      REALMENTE escribe el agente (`grep "action: '"` sobre `~/rent/agent/src`
 *      + `server/lib/audit-actions.ts` + los mapas locales de las rutas).
 *   2. Familias por prefijo, para los slugs que se arman en runtime
 *      (`erp.sync.${method}`, `arco_${accion}_requested`).
 *   3. Humanizador para lo desconocido: `snake_case` / `dot.case` / `kebab-case`
 *      → frase con la primera letra en mayúscula, sin puntos ni guiones. No
 *      traduce, pero nunca deja una clave cruda en pantalla.
 *
 * Las funciones son puras (reciben `now`) para que el tiempo relativo se pueda
 * probar sin fake timers.
 */

export type EventLocale = 'es' | 'en';

// ──────────────────────────────────────────────────────────────────────────────
// 1. Diccionario — sólo slugs que el agente escribe de verdad
// ──────────────────────────────────────────────────────────────────────────────

export const AUDIT_EVENT_LABELS_ES: Readonly<Record<string, string>> = {
  // BU-08 (04-10-2026): salía «Pricing config update». Es Leasefy cambiando,
  // desde /admin, el modelo de cobro del plan de la inmobiliaria (ella lo ve en
  // sólo lectura): se dice qué pasó, en español.
  'pricing_config.update': 'Leasefy cambió el modelo de cobro de tu plan',
  // Marcación (pre-call workflow, dialer, speed-to-lead)
  'precall.scheduled': 'Llamada programada',
  'precall.held_for_approval': 'Llamada retenida para aprobación',
  'dialer.call_placed': 'Llamada realizada',
  'dialer.call_skipped': 'Llamada omitida',
  'speed_to_lead.call_placed': 'Llamada a prospecto realizada',
  'speed_to_lead.call_skipped': 'Llamada a prospecto omitida',
  inbound_call_start: 'Llamada entrante',
  'qa.scored': 'Llamada calificada por QA',

  // Seguimientos
  'followup.sent': 'Seguimiento enviado',
  'followup.skipped': 'Seguimiento omitido',
  'followup.scheduled_voice': 'Seguimiento por voz programado',

  // Escalaciones e intervenciones humanas
  escalated_to_human: 'Escalado a una persona',
  escalation_claim: 'Escalación tomada',
  escalation_assign: 'Escalación asignada',
  escalation_resolve: 'Escalación resuelta',
  intervention: 'Intervención manual',
  intervene: 'Intervención manual',
  force_stage: 'Cambio de etapa manual',
  manual_wa_send: 'WhatsApp enviado manualmente',
  manual_call_trigger: 'Llamada disparada manualmente',
  'cobranza.codeudor.contactar': 'Contacto al codeudor',

  // Datos personales y opt-out
  pii_reveal: 'Cédula revelada',
  opt_out_recorded: 'Opt-out registrado',
  opt_out_acknowledged: 'Opt-out confirmado',

  // Aprobaciones (Fase 32)
  payment_plan_approve: 'Plan de pago aprobado',
  payment_plan_reject: 'Plan de pago rechazado',
  siniestro_approve: 'Siniestro aprobado',
  siniestro_reject: 'Siniestro rechazado',
  pre_judicial_approve: 'Prejurídico aprobado',
  pre_judicial_reject: 'Prejurídico rechazado',
  automated_decision_flagged_reviewable: 'Decisión automática enviada a revisión',

  // Planes de pago y cadencia
  'cartera.payment_plan.offered': 'Plan de pago ofrecido',
  'cartera.payment_plan.accepted': 'Plan de pago aceptado',
  'cartera.payment_plan.defaulted': 'Plan de pago incumplido',
  'cartera.cadence.planned': 'Cadencia planificada',
  'cartera.daily_report.dispatched': 'Reporte diario enviado',
  'cobranza.cadence.updated': 'Cadencia actualizada',
  'cobranza.autonomy.updated': 'Nivel de autonomía actualizado',
  threshold_edit: 'Umbrales del reporte editados',
  threshold_rollback: 'Umbrales del reporte restaurados',
  subscription_update: 'Suscripción al reporte actualizada',

  // Disputas
  dispute_open: 'Disputa abierta',
  dispute_resolve: 'Disputa resuelta',

  // Legal
  'legal.certified_notice_issued': 'Notificación certificada emitida',
  'legal.certified_webhook_received': 'Notificación certificada confirmada',
  'legal.package_sealed': 'Paquete legal sellado',
  'legal.handoff_processed': 'Entrega al abogado procesada',
  'legal_artifact.approved': 'Carta legal aprobada',
  'legal_artifact.pre_judicial_letter.generated': 'Carta prejurídica generada',
  'legal_artifact.pre_bureau_notification.generated': 'Aviso previo a centrales generado',
  bureau_report: 'Reporte a centrales de riesgo',

  // Seguros, facturas y dispersiones
  'insurance.claim.filed': 'Siniestro radicado',
  'invoice.issued': 'Factura emitida',
  'invoice.rejected': 'Factura rechazada',
  'payout.scheduled': 'Dispersión programada',

  // Riesgo
  fraud_flagged: 'Posible fraude marcado',
  pep_ofac_hit: 'Coincidencia en listas PEP/OFAC',

  // Central, CRM y ERP
  'central.report_submitted': 'Reporte enviado a la central',
  'central.orchestration_completed': 'Orquestación completada',
  'crm.outcome_pushed': 'Resultado enviado al CRM',

  // Plantillas
  template_draft_saved: 'Borrador de plantilla guardado',
  template_published: 'Plantilla publicada',
  wa_template_submitted_meta: 'Plantilla de WhatsApp enviada a Meta',

  // Políticas y aseguradoras
  'agency.policy.updated': 'Política de la inmobiliaria actualizada',
  'policy-version-created': 'Versión de política creada',
  'policy-rolled-back': 'Política restaurada',
  'carrier-override-edit': 'Aseguradora ajustada manualmente',
  'carrier-override-reset': 'Ajuste de aseguradora restablecido',

  // ARCO (habeas data)
  'arco-request-created': 'Solicitud ARCO creada',
  'arco-request-triaged': 'Solicitud ARCO clasificada',
  'arco-request-resolved': 'Solicitud ARCO resuelta',
  'arco-request-rejected': 'Solicitud ARCO rechazada',
  'arco-email-verified': 'Correo de la solicitud ARCO verificado',
  'arco.acceso': 'Solicitud de acceso a datos',
  'arco.rectificacion': 'Solicitud de rectificación de datos',
  'arco.oposicion': 'Solicitud de oposición al tratamiento',
  'arco.cancelacion': 'Solicitud de cancelación de datos',
  'arco.cancelacion_completed': 'Cancelación de datos completada',
  cancelacion_completed: 'Cancelación de datos completada',
  'arco.objection.recalibration_skipped': 'Recalibración omitida por oposición',
  'arco.cancelacion.event_store_sweep_audit': 'Barrido de eventos por cancelación',
  acceso: 'Solicitud de acceso a datos',
  rectificacion: 'Solicitud de rectificación de datos',
  oposicion: 'Solicitud de oposición al tratamiento',
  cancelacion: 'Solicitud de cancelación de datos',

  // Prospectos y onboarding
  prospectos_handoff: 'Prospecto entregado al asesor',
  prospectos_fence_block: 'Contacto a prospecto bloqueado por límites',
  onboarding_completed: 'Onboarding completado',

  // Cotizador
  'cotizador.quote.requested': 'Cotización solicitada',
  'cotizador.pii_leak_runtime': 'Alerta de fuga de datos en el cotizador',
  cotizacion_creada: 'Cotización creada',
  cotizacion_completada: 'Cotización completada',

  // Piloto automático (`~/rent/agent/src/piloto/*`). Sin el diccionario el
  // humanizador decía «Piloto retenido por autonomia» — sin tilde y al revés:
  // lo retenido no es el piloto, es una acción que esperó tu aprobación. Las
  // frases siguen a `piloto/motivos.ts` del agente, que es como ya las dice la
  // pantalla del piloto automático.
  piloto_retenido_por_autonomia: 'Acción retenida para tu aprobación',
  piloto_retenido_aprobado: 'Aprobaste una acción retenida',
  piloto_retenido_descartado: 'Descartaste una acción retenida',
  piloto_retenidos_caducados: 'Se cerraron retenciones que ya no aplicaban',
  piloto_decision_vencida: 'Una decisión lleva 72 h sin respuesta',
  piloto_decision_resuelta: 'Se aplicó una decisión tuya',
  piloto_reporte_enviado: 'Resumen del piloto automático enviado por correo',
  piloto_evento_dominio: 'Novedad del negocio',
  piloto_conciliacion_automatica: 'La conciliación cruzó sola los depósitos exactos',
  piloto_conciliacion_humana: 'Conciliación hecha a mano',
  piloto_gerente_hecha: 'El Gerente hizo una acción por su cuenta',
  piloto_gerente_fallida: 'El Gerente no pudo hacer una acción',
  piloto_gerente_para_tu_clic: 'Acciones listas para tu clic',
  piloto_preferencias_cambiadas: 'Cambiaste los topes o la gracia del piloto automático',
  piloto_habilitacion_cambiada: 'Cambiaste qué agentes trabajan para tu inmobiliaria',
  piloto_autonomia_cambiada: 'Cambiaste el modo de un agente',
  piloto_autonomia_flota_cambiada: 'Cambiaste el modo del piloto automático',
  piloto_envio_programado: 'Envío programado con tiempo para deshacerlo',
  piloto_envio_deshecho: 'Deshiciste un envío',

  // Pagos, matching y conciliación
  pago_creado: 'Pago registrado',
  pago_verificado: 'Pago verificado',
  pago_autorreportado: 'Pago reportado por el inquilino',
  match_sugerido: 'Coincidencia sugerida',
  match_decidido: 'Coincidencia decidida',
  'matching.caso.descartado': 'Caso de matching descartado',
  'conciliacion.daily_report.dispatched': 'Reporte diario de conciliación enviado',
  escalacion_creada: 'Escalación creada',
  escalacion_resuelta: 'Escalación resuelta',
  'followup.send_failed': 'Seguimiento no enviado',
  'cobranza.politica.updated': 'Política de cobranza actualizada',
  'cobranza.memo.manual_create': 'Nota agregada al deudor',
  'cobranza.acuerdo_general.updated': 'Acuerdo general actualizado',
  'cobranza.acuerdo_general.deleted': 'Acuerdo general eliminado',
  'retenido.caducado': 'Retención vencida',
  inspeccion_fence_block: 'Inspección bloqueada por límites',
};

export const AUDIT_EVENT_LABELS_EN: Readonly<Record<string, string>> = {
  'pricing_config.update': 'Leasefy changed your plan billing model',
  'precall.scheduled': 'Call scheduled',
  'precall.held_for_approval': 'Call held for approval',
  'dialer.call_placed': 'Call placed',
  'dialer.call_skipped': 'Call skipped',
  'speed_to_lead.call_placed': 'Lead call placed',
  'speed_to_lead.call_skipped': 'Lead call skipped',
  inbound_call_start: 'Inbound call',
  'qa.scored': 'Call scored by QA',

  'followup.sent': 'Follow-up sent',
  'followup.skipped': 'Follow-up skipped',
  'followup.scheduled_voice': 'Voice follow-up scheduled',

  escalated_to_human: 'Escalated to a person',
  escalation_claim: 'Escalation claimed',
  escalation_assign: 'Escalation assigned',
  escalation_resolve: 'Escalation resolved',
  intervention: 'Manual intervention',
  intervene: 'Manual intervention',
  force_stage: 'Manual stage change',
  manual_wa_send: 'WhatsApp sent manually',
  manual_call_trigger: 'Call triggered manually',
  'cobranza.codeudor.contactar': 'Co-signer contacted',

  pii_reveal: 'ID revealed',
  opt_out_recorded: 'Opt-out recorded',
  opt_out_acknowledged: 'Opt-out acknowledged',

  payment_plan_approve: 'Payment plan approved',
  payment_plan_reject: 'Payment plan rejected',
  siniestro_approve: 'Claim approved',
  siniestro_reject: 'Claim rejected',
  pre_judicial_approve: 'Pre-legal step approved',
  pre_judicial_reject: 'Pre-legal step rejected',
  automated_decision_flagged_reviewable: 'Automated decision sent to review',

  'cartera.payment_plan.offered': 'Payment plan offered',
  'cartera.payment_plan.accepted': 'Payment plan accepted',
  'cartera.payment_plan.defaulted': 'Payment plan defaulted',
  'cartera.cadence.planned': 'Cadence planned',
  'cartera.daily_report.dispatched': 'Daily report sent',
  'cobranza.cadence.updated': 'Cadence updated',
  'cobranza.autonomy.updated': 'Autonomy level updated',
  threshold_edit: 'Report thresholds edited',
  threshold_rollback: 'Report thresholds restored',
  subscription_update: 'Report subscription updated',

  dispute_open: 'Dispute opened',
  dispute_resolve: 'Dispute resolved',

  'legal.certified_notice_issued': 'Certified notice issued',
  'legal.certified_webhook_received': 'Certified notice confirmed',
  'legal.package_sealed': 'Legal package sealed',
  'legal.handoff_processed': 'Handoff to lawyer processed',
  'legal_artifact.approved': 'Legal letter approved',
  'legal_artifact.pre_judicial_letter.generated': 'Pre-legal letter generated',
  'legal_artifact.pre_bureau_notification.generated': 'Credit bureau pre-notice generated',
  bureau_report: 'Reported to credit bureau',

  'insurance.claim.filed': 'Insurance claim filed',
  'invoice.issued': 'Invoice issued',
  'invoice.rejected': 'Invoice rejected',
  'payout.scheduled': 'Payout scheduled',

  fraud_flagged: 'Possible fraud flagged',
  pep_ofac_hit: 'PEP/OFAC list match',

  'central.report_submitted': 'Report submitted to the hub',
  'central.orchestration_completed': 'Orchestration completed',
  'crm.outcome_pushed': 'Outcome pushed to CRM',

  template_draft_saved: 'Template draft saved',
  template_published: 'Template published',
  wa_template_submitted_meta: 'WhatsApp template submitted to Meta',

  'agency.policy.updated': 'Agency policy updated',
  'policy-version-created': 'Policy version created',
  'policy-rolled-back': 'Policy rolled back',
  'carrier-override-edit': 'Insurer manually adjusted',
  'carrier-override-reset': 'Insurer adjustment reset',

  'arco-request-created': 'Data-rights request created',
  'arco-request-triaged': 'Data-rights request triaged',
  'arco-request-resolved': 'Data-rights request resolved',
  'arco-request-rejected': 'Data-rights request rejected',
  'arco-email-verified': 'Data-rights request email verified',
  'arco.acceso': 'Data access request',
  'arco.rectificacion': 'Data rectification request',
  'arco.oposicion': 'Data processing objection',
  'arco.cancelacion': 'Data deletion request',
  'arco.cancelacion_completed': 'Data deletion completed',
  cancelacion_completed: 'Data deletion completed',
  'arco.objection.recalibration_skipped': 'Recalibration skipped due to objection',
  'arco.cancelacion.event_store_sweep_audit': 'Event sweep for data deletion',
  acceso: 'Data access request',
  rectificacion: 'Data rectification request',
  oposicion: 'Data processing objection',
  cancelacion: 'Data deletion request',

  prospectos_handoff: 'Lead handed to advisor',
  prospectos_fence_block: 'Lead contact blocked by limits',
  onboarding_completed: 'Onboarding completed',

  'cotizador.quote.requested': 'Quote requested',
  'cotizador.pii_leak_runtime': 'Quote engine data-leak alert',
  cotizacion_creada: 'Quote created',
  cotizacion_completada: 'Quote completed',

  piloto_retenido_por_autonomia: 'Action held for your approval',
  piloto_retenido_aprobado: 'You approved a held action',
  piloto_retenido_descartado: 'You discarded a held action',
  piloto_retenidos_caducados: 'Holds that no longer applied were closed',
  piloto_decision_vencida: 'A decision has waited 72 h for an answer',
  piloto_decision_resuelta: 'One of your decisions was applied',
  piloto_reporte_enviado: 'Autopilot summary emailed',
  piloto_evento_dominio: 'Business update',
  piloto_conciliacion_automatica: 'Reconciliation matched the exact deposits on its own',
  piloto_conciliacion_humana: 'Reconciliation done by hand',
  piloto_gerente_hecha: 'The Manager took an action on its own',
  piloto_gerente_fallida: 'The Manager could not take an action',
  piloto_gerente_para_tu_clic: 'Actions ready for your click',
  piloto_preferencias_cambiadas: 'You changed the autopilot limits or grace period',
  piloto_habilitacion_cambiada: 'You changed which agents work for your agency',
  piloto_autonomia_cambiada: "You changed an agent's mode",
  piloto_autonomia_flota_cambiada: 'You changed the autopilot mode',
  piloto_envio_programado: 'Send scheduled with time to undo it',
  piloto_envio_deshecho: 'You undid a send',

  pago_creado: 'Payment recorded',
  pago_verificado: 'Payment verified',
  pago_autorreportado: 'Payment reported by the tenant',
  match_sugerido: 'Match suggested',
  match_decidido: 'Match decided',
  'matching.caso.descartado': 'Matching case discarded',
  'conciliacion.daily_report.dispatched': 'Daily reconciliation report sent',
  escalacion_creada: 'Escalation created',
  escalacion_resuelta: 'Escalation resolved',
  'followup.send_failed': 'Follow-up not sent',
  'cobranza.politica.updated': 'Collections policy updated',
  'cobranza.memo.manual_create': 'Note added to the debtor',
  'cobranza.acuerdo_general.updated': 'General agreement updated',
  'cobranza.acuerdo_general.deleted': 'General agreement deleted',
  'retenido.caducado': 'Hold expired',
  inspeccion_fence_block: 'Inspection blocked by limits',
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. Familias por prefijo — slugs armados en runtime
// ──────────────────────────────────────────────────────────────────────────────

interface PrefixFamily {
  /** Matches when the slug starts with this prefix. */
  prefix: string;
  es: string;
  en: string;
}

const PREFIX_FAMILIES: readonly PrefixFamily[] = [
  { prefix: 'erp.sync.', es: 'Sincronización con el ERP', en: 'ERP sync' },
  { prefix: 'legal_artifact.', es: 'Documento legal generado', en: 'Legal document generated' },
];

interface PatternFamily {
  pattern: RegExp;
  es: (m: RegExpMatchArray) => string;
  en: (m: RegExpMatchArray) => string;
}

const ARCO_ACCION_ES: Readonly<Record<string, string>> = {
  acceso: 'acceso',
  rectificacion: 'rectificación',
  oposicion: 'oposición',
  cancelacion: 'cancelación',
};

const ARCO_ACCION_EN: Readonly<Record<string, string>> = {
  acceso: 'access',
  rectificacion: 'rectification',
  oposicion: 'objection',
  cancelacion: 'deletion',
};

const PATTERN_FAMILIES: readonly PatternFamily[] = [
  {
    // `arco_${accion}_requested` (cotizador ARCO)
    pattern: /^arco_([a-z]+)_requested$/,
    es: (m) => `Solicitud ARCO de ${ARCO_ACCION_ES[m[1] ?? ''] ?? m[1]} recibida`,
    en: (m) => `Data-rights ${ARCO_ACCION_EN[m[1] ?? ''] ?? m[1]} request received`,
  },
  {
    // Una huella `piloto_*` nueva que el diccionario todavía no conoce: el
    // prefijo no se dice (ya lo dice el contexto de la fila, «Piloto
    // automático»), así que «piloto_algo_nuevo» sale «Algo nuevo».
    pattern: /^piloto_(.+)$/,
    es: (m) => humanizeEventType(m[1] ?? ''),
    en: (m) => humanizeEventType(m[1] ?? ''),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 3. Humanizador — nunca una clave cruda
// ──────────────────────────────────────────────────────────────────────────────

/**
 * `precall.held_for_approval` → `Precall held for approval`.
 * `arco-request-created` → `Arco request created`.
 *
 * Separadores: punto, guion bajo, guion, dos puntos y espacios repetidos. Se
 * baja todo a minúscula y se sube sólo la primera letra: los slugs vienen en
 * minúscula pero alguno trae siglas (`OFAC`) y no vale la pena adivinar.
 */
export function humanizeEventType(type: string): string {
  const words = type
    .split(/[._:\-\s]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
  if (words.length === 0) return '';
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * Frase para un `action` del audit log: diccionario → familia por prefijo →
 * familia por patrón → humanizador.
 */
export function auditEventLabel(action: string, locale: EventLocale): string {
  const slug = action.trim();
  if (slug.length === 0) return '';

  const dict = locale === 'en' ? AUDIT_EVENT_LABELS_EN : AUDIT_EVENT_LABELS_ES;
  const exact = dict[slug];
  if (exact) return exact;

  for (const family of PREFIX_FAMILIES) {
    if (slug.startsWith(family.prefix)) return locale === 'en' ? family.en : family.es;
  }

  for (const family of PATTERN_FAMILIES) {
    const m = slug.match(family.pattern);
    if (m) return locale === 'en' ? family.en(m) : family.es(m);
  }

  return humanizeEventType(slug);
}

// ──────────────────────────────────────────────────────────────────────────────
// Entidad — `entity_type` del audit log
// ──────────────────────────────────────────────────────────────────────────────

export const AUDIT_ENTITY_LABELS_ES: Readonly<Record<string, string>> = {
  debtor: 'deudor',
  call: 'llamada',
  escalation: 'escalación',
  payment_plan: 'plan de pago',
  payment: 'pago',
  invoice: 'factura',
  payout: 'dispersión',
  dispute: 'disputa',
  legal_artifact: 'carta legal',
  legal_package: 'paquete legal',
  insurance_claim: 'siniestro',
  prospect_lead: 'prospecto',
  prospect_visit: 'visita',
  automated_decision: 'decisión automática',
  agency: 'inmobiliaria',
  agency_policy: 'política',
  agency_policy_versions: 'política',
  arco_request: 'solicitud ARCO',
  arco_requests: 'solicitud ARCO',
  compliance_event: 'cumplimiento',
  cartera_import: 'importación de cartera',
  cartera_daily_report: 'reporte diario',
  cartera_cadence_run: 'cadencia',
  script_template: 'plantilla',
  agency_daily_report_thresholds: 'umbrales del reporte',
  agency_daily_report_subscriptions: 'suscripción al reporte',
  cotizador_quote_request: 'cotización',
  cotizador_arco_job: 'proceso ARCO del cotizador',
  cotizador_arco_objections: 'oposición ARCO',
  cotizador_tenant_aseguradora_override: 'aseguradora',
  // Piloto automático: «piloto retencion» era la clave cruda humanizada.
  piloto_retencion: 'piloto automático',
  piloto_reporte: 'piloto automático',
  acciones_del_piloto: 'piloto automático',
  preferencias_del_piloto: 'piloto automático',
  agent_autonomy: 'piloto automático',
  gerente_detector: 'piloto automático',
  retencion_sweep_run: 'piloto automático',
  // Conciliación, pagos y proveedores
  conciliacion_bancaria: 'conciliación bancaria',
  conciliacion_daily_report: 'reporte de conciliación',
  reconciliation_match: 'conciliación',
  reconciliation_run: 'conciliación',
  reconciliation_ingest: 'extracto del banco',
  reconciliation_policy_versions: 'política de conciliación',
  owner_settlement: 'liquidación del propietario',
  vendor: 'proveedor',
  vendor_bill: 'factura de proveedor',
  ap_payment_run: 'pago a proveedores',
  ap_approval_matrix_versions: 'matriz de aprobación',
  approval_request: 'solicitud de aprobación',
  matching_case: 'matching',
  inspection_session: 'inspección',
  agency_agreement_template: 'plantilla de acuerdo',
  politica_de_cobranza: 'política de cobranza',
  debtor_memo: 'nota del deudor',
};

export const AUDIT_ENTITY_LABELS_EN: Readonly<Record<string, string>> = {
  debtor: 'debtor',
  call: 'call',
  escalation: 'escalation',
  payment_plan: 'payment plan',
  payment: 'payment',
  invoice: 'invoice',
  payout: 'payout',
  dispute: 'dispute',
  legal_artifact: 'legal letter',
  legal_package: 'legal package',
  insurance_claim: 'insurance claim',
  prospect_lead: 'lead',
  prospect_visit: 'visit',
  automated_decision: 'automated decision',
  agency: 'agency',
  agency_policy: 'policy',
  agency_policy_versions: 'policy',
  arco_request: 'data-rights request',
  arco_requests: 'data-rights request',
  compliance_event: 'compliance',
  cartera_import: 'portfolio import',
  cartera_daily_report: 'daily report',
  cartera_cadence_run: 'cadence',
  script_template: 'template',
  agency_daily_report_thresholds: 'report thresholds',
  agency_daily_report_subscriptions: 'report subscription',
  cotizador_quote_request: 'quote',
  cotizador_arco_job: 'quote-engine data-rights job',
  cotizador_arco_objections: 'data-rights objection',
  cotizador_tenant_aseguradora_override: 'insurer',
  piloto_retencion: 'autopilot',
  piloto_reporte: 'autopilot',
  acciones_del_piloto: 'autopilot',
  preferencias_del_piloto: 'autopilot',
  agent_autonomy: 'autopilot',
  gerente_detector: 'autopilot',
  retencion_sweep_run: 'autopilot',
  conciliacion_bancaria: 'bank reconciliation',
  conciliacion_daily_report: 'reconciliation report',
  reconciliation_match: 'reconciliation',
  reconciliation_run: 'reconciliation',
  reconciliation_ingest: 'bank statement',
  reconciliation_policy_versions: 'reconciliation policy',
  owner_settlement: 'owner settlement',
  vendor: 'vendor',
  vendor_bill: 'vendor bill',
  ap_payment_run: 'vendor payment',
  ap_approval_matrix_versions: 'approval matrix',
  approval_request: 'approval request',
  matching_case: 'matching',
  inspection_session: 'inspection',
  agency_agreement_template: 'agreement template',
  politica_de_cobranza: 'collections policy',
  debtor_memo: 'debtor note',
};

/**
 * Etiqueta en minúscula para el `entity_type` («debtor» → «deudor»). Un tipo
 * desconocido se humaniza en minúscula (`foo_bar` → `foo bar`); `null` o vacío
 * → `null`, para que la fila no pinte un separador colgando.
 */
export function auditEntityLabel(entityType: string | null | undefined, locale: EventLocale): string | null {
  const slug = entityType?.trim() ?? '';
  if (slug.length === 0) return null;
  const dict = locale === 'en' ? AUDIT_ENTITY_LABELS_EN : AUDIT_ENTITY_LABELS_ES;
  const exact = dict[slug];
  if (exact) return exact;
  const humanized = humanizeEventType(slug);
  return humanized.length > 0 ? humanized.toLowerCase() : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tiempo relativo — «hace 6 h», no «hace 6h»
// ──────────────────────────────────────────────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Tiempo relativo corto y bien escrito. En español el símbolo va separado del
 * número («6 h», «5 min») y «día/días» se escribe entero porque «3 d» no se
 * lee. Pasados 7 días muestra la fecha corta («12 ago»): el feed trae 7 días
 * por defecto y más atrás la cuenta de días deja de decir algo.
 *
 * Un `isoString` inválido o futuro se trata como «ahora».
 */
export function relativeTimeLabel(isoString: string, locale: EventLocale, now: number = Date.now()): string {
  const then = new Date(isoString).getTime();
  const diff = Number.isFinite(then) ? Math.max(0, now - then) : 0;

  const en = locale === 'en';

  if (diff < MINUTE) return en ? 'just now' : 'ahora';

  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    return en ? `${mins} min ago` : `hace ${mins} min`;
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return en ? `${hours} h ago` : `hace ${hours} h`;
  }

  const days = Math.floor(diff / DAY);
  if (days < 7) {
    if (en) return days === 1 ? '1 day ago' : `${days} days ago`;
    return days === 1 ? 'hace 1 día' : `hace ${days} días`;
  }

  return new Date(then).toLocaleDateString(en ? 'en-US' : 'es-CO', {
    day: 'numeric',
    month: 'short',
  });
}
