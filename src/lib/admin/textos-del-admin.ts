/**
 * Los nombres en español de lo que el back del admin manda en inglés o en
 * código (`pre_judicial_letter`, `upheld`…).
 *
 * 🔴 Ronda 26 (23-10-2026, revisora T4): ya NO hay red que convierta un código
 * en frase («contact_attempt_tercero» → «Contact attempt tercero» salía en
 * inglés en Auditoría, Salud, Tareas programadas…). Cada cosa tiene su
 * diccionario; lo que no tiene nombre dice la palabra de su clase («Otro
 * evento», «Otra tarea») y el código va SÓLO al Excel y al cajón del detalle.
 * El guardián `textos-del-admin.test.ts` falla si una pantalla vuelve a
 * convertir códigos a mano.
 */

/** El nombre de un código, o la palabra de su clase si no tiene (nunca el código). */
export function nombreDe(
  mapa: Readonly<Record<string, string>>,
  codigo: string | null | undefined,
  otro: string,
  vacio = '—',
): string {
  if (!codigo) return vacio
  return Object.prototype.hasOwnProperty.call(mapa, codigo) ? mapa[codigo] : otro
}

function conNombre(mapa: Readonly<Record<string, string>>, otro: string) {
  return (codigo: string | null | undefined) => nombreDe(mapa, codigo, otro)
}

/**
 * Un código con prefijos («cartera.payment_plan.offered»): primero el código
 * entero; si no, el prefijo más largo que tenga nombre; si no, `otro`.
 */
function porPrefijo(
  mapa: Readonly<Record<string, string>>,
  prefijos: ReadonlyArray<readonly [string, string]>,
  otro: string,
) {
  return (codigo: string | null | undefined): string => {
    if (!codigo) return '—'
    if (Object.prototype.hasOwnProperty.call(mapa, codigo)) return mapa[codigo]
    const prefijo = prefijos.find(([p]) => codigo.startsWith(p))
    return prefijo ? prefijo[1] : otro
  }
}

export const TIPOS_DE_DECISION: Record<string, string> = {
  pre_judicial_letter: 'Carta prejurídica',
  siniestro_filing: 'Reclamo de siniestro',
  legal_escalation: 'Escalación legal',
  pagos_cobro_retenido: 'Cobro retenido',
}

export const tipoDeDecision = conNombre(TIPOS_DE_DECISION, 'Otra decisión')

export const resultadoDeLaRevision = conNombre(
  {
    upheld: 'Aprobada',
    overridden: 'Modificada',
    escalated: 'Escalada a abogado',
  },
  'Revisada',
)

/** Cómo terminó una llamada (`CallOutcomeSchema` del micro). */
export const RESULTADOS_DE_LLAMADA: Record<string, string> = {
  paid_full: 'Pagó todo',
  paid_partial: 'Pagó una parte',
  plan_agreed: 'Acordó un plan',
  hardship_extension: 'Plazo por dificultad',
  dispute: 'Disputa la deuda',
  no_resolution: 'Sin acuerdo',
  opt_out: 'Pidió no ser contactado',
  fraud: 'Posible fraude',
  escalated: 'Escalada',
  callback_later: 'Volver a llamar',
  no_answer: 'No contestó',
  voicemail: 'Buzón de voz',
  promise_to_pay: 'Prometió pagar',
  completed: 'Completada',
  error: 'Falló',
}

export const resultadoDeLaLlamada = conNombre(RESULTADOS_DE_LLAMADA, 'Otro resultado')

/** El tono de un resultado de llamada. */
export function tonoDelResultado(codigo: string | null | undefined): 'ok' | 'warn' | 'bad' | 'neutral' {
  switch (codigo) {
    case 'paid_full':
    case 'paid_partial':
    case 'plan_agreed':
    case 'promise_to_pay':
      return 'ok'
    case 'hardship_extension':
    case 'callback_later':
    case 'no_answer':
    case 'voicemail':
    case 'no_resolution':
      return 'warn'
    case 'dispute':
    case 'fraud':
    case 'escalated':
    case 'opt_out':
    case 'error':
      return 'bad'
    default:
      return 'neutral'
  }
}

/** Las métricas del detalle de una inmobiliaria (`GET /tenants/:id`). */
export const metricaDeLaInmobiliaria = conNombre({
  debtors_count: 'Deudores',
  calls_count: 'Llamadas',
  calls_30d: 'Llamadas en 30 días',
  open_promises_count: 'Promesas abiertas',
  paid_total: 'Recaudado',
  open_escalations_count: 'Escalaciones abiertas',
  compliance_events_count: 'Eventos de cumplimiento',
  cartera_atrasada_count: 'Cartera atrasada',
}, 'Otra cifra')

/** Las etapas de la cartera (BACK.md §7.1). */
export const ETAPAS_DE_CARTERA = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'] as const
export type EtapaDeCartera = (typeof ETAPAS_DE_CARTERA)[number]

export const ETAPA: Record<
  EtapaDeCartera,
  { nombre: string; pista: string; tono: 'ok' | 'neutral' | 'warn' | 'bad' | 'muted'; barra: 'success' | 'primary' | 'warning' | 'danger' }
> = {
  S0: { nombre: 'Antes de vencer', pista: 'aún no vence', tono: 'ok', barra: 'success' },
  S1: { nombre: 'Cartera fresca', pista: 'día 1 a 15', tono: 'neutral', barra: 'primary' },
  S2: { nombre: 'Mora administrativa', pista: 'día 16 a 45', tono: 'warn', barra: 'warning' },
  S3: { nombre: 'Mora prejurídica', pista: 'día 46 a 89', tono: 'warn', barra: 'warning' },
  S4: { nombre: 'Siniestro', pista: 'reclamo al seguro', tono: 'bad', barra: 'danger' },
  S5: { nombre: 'Restitución y jurídico', pista: '90 días o más, sin póliza', tono: 'bad', barra: 'danger' },
  SX: { nombre: 'Abandono', pista: 'cualquier edad', tono: 'muted', barra: 'primary' },
}

export function esEtapaDeCartera(x: string): x is EtapaDeCartera {
  return (ETAPAS_DE_CARTERA as readonly string[]).includes(x)
}

/** La urgencia de una escalación. */
export const URGENCIA: Record<string, { nombre: string; tono: 'bad' | 'warn' | 'info' | 'muted' }> = {
  live: { nombre: 'En vivo', tono: 'bad' },
  high: { nombre: 'Alta', tono: 'warn' },
  medium: { nombre: 'Media', tono: 'info' },
  low: { nombre: 'Baja', tono: 'muted' },
}

export function urgencia(codigo: string) {
  return URGENCIA[codigo] ?? { nombre: 'Sin urgencia', tono: 'muted' as const }
}

// ── La plataforma (19-10-2026: Inmobiliarias con todo lo de Leasefy) ─────────

/** El estado de la suscripción de una inmobiliaria (`AgencySubscriptionStatus`). */
export const ESTADO_DEL_PLAN: Record<string, { nombre: string; tono: 'ok' | 'warn' | 'bad' | 'muted' }> = {
  ACTIVE: { nombre: 'Al día', tono: 'ok' },
  PAST_DUE: { nombre: 'En mora', tono: 'warn' },
  SUSPENDED: { nombre: 'Suspendida', tono: 'bad' },
  CANCELLED: { nombre: 'Cancelada', tono: 'muted' },
}

export function estadoDelPlan(codigo: string | null | undefined) {
  if (!codigo) return { nombre: 'Sin plan', tono: 'muted' as const }
  return ESTADO_DEL_PLAN[codigo] ?? { nombre: 'Otro estado', tono: 'muted' as const }
}

/** Cómo se cobra un plan (`AgencyBillingMode`). */
export const MODO_DE_COBRO_DEL_PLAN: Record<string, string> = {
  FLAT: 'Mensualidad fija',
  USAGE_CANON: 'Porcentaje del canon',
}

/** Los roles del equipo de una inmobiliaria, con los nombres del panel. */
export const ROL_DEL_EQUIPO: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENTE: 'Asesor comercial',
  CONTADOR: 'Contador',
  VIEWER: 'Visualizador',
  COORDINADOR: 'Coordinador',
  AUXILIAR_CARTERA: 'Auxiliar de cartera',
  ABOGADO_EXTERNO: 'Abogado externo',
  AUXILIAR_COMERCIAL: 'Auxiliar comercial',
  AUXILIAR_ADMINISTRATIVO: 'Auxiliar administrativo',
  AUXILIAR_CONTABLE: 'Auxiliar contable',
  AUXILIAR_MANTENIMIENTO: 'Auxiliar de mantenimiento',
}

export const ESTADO_DEL_MIEMBRO: Record<string, { nombre: string; tono: 'ok' | 'info' | 'muted' }> = {
  ACTIVE: { nombre: 'Activo', tono: 'ok' },
  INVITED: { nombre: 'Invitado', tono: 'info' },
  INACTIVE: { nombre: 'Desactivado', tono: 'muted' },
}

/** El estado de un contrato (`ContractStatus`), como lo dice el panel. */
export const ESTADO_DEL_CONTRATO: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_LANDLORD_SIGNATURE: 'Firma del propietario',
  PENDING_TENANT_SIGNATURE: 'Firma del inquilino',
  REJECTED_PENDING_MODIFICATIONS: 'Con cambios pedidos',
  SIGNED: 'Firmado',
  ACTIVE: 'Vigente',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Terminado',
}

export const MIGRACION_DE_LA_INMOBILIARIA: Record<string, { nombre: string; tono: 'ok' | 'muted' | 'warn' }> = {
  completada: { nombre: 'Migración completa', tono: 'ok' },
  omitida: { nombre: 'Saltó la migración', tono: 'muted' },
  pendiente: { nombre: 'Migración pendiente', tono: 'warn' },
}

/**
 * Lo que hizo una persona del equipo de Leasefy (`agent.audit_log.action`), en
 * palabras (20-10-2026). Un código sin nombre dice el de su clase (por prefijo)
 * o «Otra acción»; el código, al Excel y al cajón.
 */
export const ACCIONES_DEL_ADMIN: Record<string, string> = {
  'debtor.search': 'Buscó un deudor',
  'call.view': 'Abrió una llamada',
  'cartera.view': 'Vio la cartera',
  'approval.view': 'Abrió una aprobación',
  approve: 'Aprobó una decisión',
  reject: 'Rechazó una decisión',
  'escalation.view': 'Abrió una escalación',
  'escalation.assign': 'Asignó una escalación',
  'escalation.resolve': 'Resolvió una escalación',
  'agent.system_prompt.update': 'Cambió el guion de un agente',
  'agentes.habilitacion': 'Prendió o apagó un agente',
  'agentes.pausa_de_emergencia': 'Pausó o reanudó los agentes',
  'kill_switch.toggle': 'Usó la pausa de emergencia',
  'agency.nit.update': 'Corrigió un NIT',
  'agency.subscription.suspend': 'Suspendió una inmobiliaria',
  'agency.subscription.reactivate': 'Reactivó una inmobiliaria',
  'agency.subscription.change_plan': 'Cambió el plan de una inmobiliaria',
  'plan.create': 'Creó un plan',
  'plan.update': 'Cambió un plan',
  'plan.delete': 'Desactivó un plan',
  'pricing_config.update': 'Cambió el precio de la cobranza por voz',
  'plantilla.update': 'Cambió un aviso',
  'metas.update': 'Puso las metas del mes',
  'registration_profile.toggle': 'Abrió o cerró un registro',
  'user.lookup': 'Buscó una cuenta',
  'user.mfa_reset': 'Restableció un segundo factor',
  'feel.facturador.save': 'Registró un facturador de FEEL',
  'feel.facturador.probe': 'Probó un facturador de FEEL',
  'feel.facturador.delete': 'Quitó un facturador de FEEL',
  'prescoring.config.update': 'Cambió la configuración del estudio',
  'cotizador.registry.create': 'Agregó una aseguradora',
  'cotizador.registry.update': 'Cambió una aseguradora',
  'cotizador.registry.delete': 'Desactivó una aseguradora',
  'cotizador.carrier.reset_degradation': 'Restableció una aseguradora',
  'avaluo.view': 'Abrió un avalúo',
  'avaluo.signoff': 'Firmó un avalúo',
  'avaluo.photo_descriptions.update': 'Editó las fotos de un avalúo',
  'avaluo.certificate.view': 'Abrió un certificado de avalúo',
  'recaudo_en_linea.reporte.import': 'Importó el reporte de Wompi',
  'recaudo_en_linea.liquidaciones.generate': 'Generó liquidaciones',
  'recaudo_en_linea.liquidacion.mark_girada': 'Marcó una liquidación como girada',
  'recaudo_en_linea.liquidacion.unmark_girada': 'Desmarcó una liquidación girada',
  'experimento.laura.empezar': 'Empezó un experimento de Mori',
  // Lo que escribe el micro de los agentes en la misma bitácora (ronda 26).
  view: 'Abrió un registro',
  acceso: 'Pidió acceso a sus datos',
  rectificacion: 'Pidió corregir sus datos',
  cancelacion: 'Pidió borrar sus datos',
  cancelacion_completed: 'Se borraron sus datos',
  oposicion: 'Se opuso al uso de sus datos',
  onboarding_completed: 'Terminó la puesta en marcha',
  opt_out_recorded: 'Pidió no ser contactado',
  escalated_to_human: 'Pasó a una persona',
  escalation_resolve: 'Resolvió una escalación',
  held_for_approval: 'Quedó esperando aprobación',
  intervene: 'Una persona intervino',
  fraud_flagged: 'Marcó posible fraude',
  pep_ofac_hit: 'Coincidió con una lista restrictiva',
  pii_reveal: 'Vio datos personales completos',
  inbound_call_start: 'Entró una llamada',
  placed: 'Hizo una llamada',
  sent: 'Envió un mensaje',
  skipped: 'Se saltó un contacto',
  scheduled_voice: 'Programó una llamada',
  bureau_report: 'Reportó a una central de riesgo',
  no_salio_en_la_gracia: 'Se frenó un envío a tiempo',
  retencion_llamada_borrada: 'Se borró una grabación',
  'retenido.caducado': 'Venció algo retenido',
  automated_decision_flagged_reviewable: 'Marcó una decisión para revisar',
  'agency.policy.updated': 'Cambió la política de la inmobiliaria',
  'ap.vendor.bank_detail_changed': 'Cambió la cuenta de un proveedor',
  'cartera.cadence.planned': 'Planeó los contactos del día',
  'cartera.daily_report.dispatched': 'Envió el reporte diario de cartera',
  'cartera.mora_sync.cierre': 'Cerró la revisión de la mora',
  'cartera.mora_sync.lote': 'Revisó un lote de la mora',
  'cartera.payment_plan.accepted': 'Aceptó un acuerdo de pago',
  'cartera.payment_plan.offered': 'Ofreció un acuerdo de pago',
  'cartera.payment_plan.defaulted': 'Se incumplió un acuerdo de pago',
  'cartera.payment_plan.cuota_pagada': 'Se pagó una cuota del acuerdo',
  'cartera.payment_plan.reemplazado': 'Se reemplazó un acuerdo de pago',
  'cartera.solicitud_de_acuerdo.recibida': 'Llegó una solicitud de acuerdo',
  'cartera.solicitud_de_acuerdo.atendida': 'Se atendió una solicitud de acuerdo',
  'central.report_submitted': 'Reportó a una central de riesgo',
  'central.pre_bureau.notified': 'Avisó antes de reportar a centrales',
  'cobranza.politica.updated': 'Cambió la política de cobranza',
  'cobranza.autonomy.updated': 'Cambió la autonomía de la cobranza',
  'cobranza.cadence.updated': 'Cambió la cadencia de la cobranza',
  'cobranza.ajustes.updated': 'Cambió los ajustes de la cobranza',
  'cobranza.memo.manual_create': 'Escribió una nota en un deudor',
  'cobranza.codeudor.contactar': 'Contactó a un codeudor',
  'cobranza.carta.a_mano': 'Mandó una carta a mano',
  'crm.outcome_pushed': 'Anotó el resultado en el CRM',
  'dialer.call_placed': 'Hizo una llamada',
  'dialer.call_skipped': 'Se saltó una llamada',
  'followup.sent': 'Hizo un seguimiento',
  'followup.skipped': 'Se saltó un seguimiento',
  'followup.send_failed': 'Falló un seguimiento',
  'insurance.claim.filed': 'Radicó un reclamo al seguro',
  'invoice.issued': 'Emitió una factura',
  'invoice.rejected': 'Se rechazó una factura',
  'legal.certified_notice_issued': 'Mandó una notificación certificada',
  'legal.package_sealed': 'Cerró el paquete jurídico',
  'legal.handoff_processed': 'Pasó el caso a jurídico',
  'qa.scored': 'Calificó una llamada',
  owner_report_generate: 'Armó el reporte del propietario',
  owner_report_approve: 'Aprobó el reporte del propietario',
  owner_report_send_failed: 'Falló el envío del reporte al propietario',
  piloto_autonomia_cambiada: 'Cambió la autonomía del piloto',
  piloto_habilitacion_cambiada: 'Prendió o apagó el piloto',
  piloto_decision_resuelta: 'Se resolvió una decisión del piloto',
  piloto_retenido_aprobado: 'Aprobó algo que el piloto retuvo',
  piloto_retenido_descartado: 'Descartó algo que el piloto retuvo',
  piloto_reporte_enviado: 'El piloto envió su reporte',
}

export const accionDelAdmin = porPrefijo(
  ACCIONES_DEL_ADMIN,
  [
    ['cartera.payment_plan.', 'Movimiento de un acuerdo de pago'],
    ['cartera.solicitud_de_acuerdo.', 'Solicitud de acuerdo de pago'],
    ['cartera.mora_sync.', 'Revisó la mora de la plataforma'],
    ['cartera.', 'Movimiento de la cartera'],
    ['cobranza.', 'Cambió la cobranza de una inmobiliaria'],
    ['piloto_', 'Movimiento del piloto automático'],
    ['legal.', 'Trámite jurídico'],
    ['central.', 'Reporte a centrales de riesgo'],
    ['followup.', 'Seguimiento a un deudor'],
    ['dialer.', 'Marcador de llamadas'],
    ['speed_to_lead.', 'Llamada a un interesado'],
    ['arco.', 'Solicitud de datos personales'],
    ['owner_report_', 'Reporte al propietario'],
    ['conciliacion', 'Conciliación bancaria'],
    ['cotizador.', 'Cotizador de seguros'],
    ['invoice.', 'Factura'],
    ['avaluo.', 'Avalúo'],
    ['recaudo_en_linea.', 'Recaudo en línea'],
    ['feel.', 'Facturador de FEEL'],
    ['agency.', 'Cambio en una inmobiliaria'],
    ['plan.', 'Cambio en un plan'],
  ],
  'Otra acción',
)

// ── Glow up 22-10-2026: los estados que el Resumen mostraba crudos ───────────

/** El estado de un pago en línea (Wompi). */
export const ESTADO_DEL_PAGO: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  declined: 'Rechazado',
  voided: 'Anulado',
  refunded: 'Reembolsado',
}

export const estadoDelPago = conNombre(ESTADO_DEL_PAGO, 'Otro estado')

export function tonoDelPago(codigo: string | null | undefined): 'ok' | 'warn' | 'bad' | 'neutral' {
  switch (codigo) {
    case 'approved':
      return 'ok'
    case 'pending':
      return 'warn'
    case 'declined':
    case 'voided':
    case 'refunded':
      return 'bad'
    default:
      return 'neutral'
  }
}

/** El estado de un experimento A/B de los agentes. */
export const ESTADO_DEL_EXPERIMENTO: Record<string, string> = {
  running: 'En curso',
  paused: 'En pausa',
  completed: 'Terminado',
  draft: 'Borrador',
  archived: 'Archivado',
}

export const estadoDelExperimento = conNombre(ESTADO_DEL_EXPERIMENTO, 'Otro estado')

/** El canal de una llamada de Mori (`call_type`). */
export const canalDeLaLlamada = conNombre(
  {
    outbound: 'Salientes',
    inbound: 'Entrantes',
    callback: 'Devoluciones',
    whatsapp: 'WhatsApp',
    voice: 'Voz',
    sms: 'SMS',
  },
  'Otro canal',
)

// ── Ronda 26 (23-10-2026): los diccionarios que faltaban (revisora T4) ───────

/** Quién deja un registro en la bitácora (`audit_log.actor_type`). */
export const QUIEN_LO_HIZO: Record<string, string> = {
  admin: 'Equipo de Leasefy',
  user: 'Una persona',
  agency_member: 'Una persona de la inmobiliaria',
  agent: 'Un agente',
  saas_orchestrator: 'Un agente de Leasefy',
  collector: 'Un agente de cobranza',
  recaudador: 'Un agente de cobranza',
  system: 'El sistema',
  external: 'Un servicio externo',
  totp: 'La verificación de seguridad',
}

export const quienLoHizo = conNombre(QUIEN_LO_HIZO, 'Otro')

/** Sobre qué quedó un registro (`audit_log.entity_type`). */
export const SOBRE_QUE: Record<string, string> = {
  agency: 'Una inmobiliaria',
  agencia: 'Una inmobiliaria',
  agency_policy: 'La política de la inmobiliaria',
  agent: 'Un agente',
  agent_autonomy: 'La autonomía de un agente',
  approval_request: 'Una aprobación',
  automated_decision: 'Una decisión automática',
  avaluo: 'Un avalúo',
  call: 'Una llamada',
  cartera_stage: 'Una etapa de la cartera',
  cartera_import: 'Una carga de cartera',
  cartera_daily_report: 'El reporte diario de cartera',
  compliance_event: 'Un evento de cumplimiento',
  conciliacion_bancaria: 'La conciliación bancaria',
  cotizador_carrier: 'Una aseguradora',
  cotizador_quote_request: 'Una cotización',
  debtor: 'Un deudor',
  debtor_memo: 'Una nota de un deudor',
  dispute: 'Una disputa',
  escalation: 'Una escalación',
  experimento: 'Un experimento',
  insurance_claim: 'Un reclamo al seguro',
  invoice: 'Una factura',
  legal_artifact: 'Un documento jurídico',
  legal_package: 'Un paquete jurídico',
  liquidacion_del_recaudo: 'Una liquidación',
  message: 'Un mensaje',
  metas_de_leasefy: 'Las metas de Leasefy',
  notification_template: 'Un aviso',
  owner_report: 'Un reporte al propietario',
  owner_settlement: 'Una liquidación al propietario',
  pagos: 'Los pagos',
  payment: 'Un pago',
  payment_plan: 'Un acuerdo de pago',
  plan: 'Un plan',
  politica_de_cobranza: 'La política de cobranza',
  prescoring_config: 'La configuración del estudio',
  prospect_lead: 'Un interesado',
  prospect_visit: 'Una visita',
  registration_profile: 'Un perfil de registro',
  reporte_de_wompi: 'Un reporte de Wompi',
  solicitud_de_acuerdo: 'Una solicitud de acuerdo',
  user: 'Una cuenta',
  vendor: 'Un proveedor',
  vendor_bill: 'Una factura de proveedor',
}

export const sobreQue = porPrefijo(SOBRE_QUE, [['piloto', 'El piloto automático'], ['cotizador_', 'El cotizador'], ['arco', 'Una solicitud de datos personales'], ['reconciliation', 'La conciliación bancaria'], ['retencion', 'Algo retenido']], 'Otro registro')

/**
 * Los eventos de cumplimiento (`agent.compliance_events.event_type`), en
 * palabras: Auditoría, Ley 2300, la ficha de la inmobiliaria y el Resumen.
 */
export const EVENTOS_DE_CUMPLIMIENTO: Record<string, string> = {
  contact_attempt: 'Intento de contacto',
  contact_attempt_tercero: 'Intento de contacto a un tercero',
  'call.connected': 'Llamada conectada',
  call: 'Llamada',
  'whatsapp.sent': 'WhatsApp enviado',
  'email.sent': 'Correo enviado',
  whatsapp_message_failed: 'WhatsApp que no salió',
  whatsapp_inbound_free_text: 'WhatsApp recibido',
  whatsapp_inbound_pay_now: 'Pidió pagar por WhatsApp',
  whatsapp_agreement_closed: 'Acuerdo cerrado por WhatsApp',
  whatsapp_compose_skipped: 'WhatsApp no enviado',
  whatsapp_turno_sin_respuesta_valida: 'WhatsApp sin respuesta válida',
  'payment.recovered': 'Pago recuperado',
  payment: 'Pago',
  payment_amount_mismatch: 'Pago por otro valor',
  payment_plan_ceiling_blocked: 'Acuerdo frenado por el tope',
  payment_provider_failover: 'Cambio de pasarela de pago',
  'transaction.updated': 'Pago actualizado',
  'invoice.issued': 'Factura emitida',
  opt_out_request: 'Pidió no ser contactado',
  opt_out_voice_request: 'Pidió no ser llamado',
  opt_out_sms: 'Pidió no recibir SMS',
  opt_out_whatsapp: 'Pidió no recibir WhatsApp',
  opt_out_email: 'Pidió no recibir correos',
  opt_out_acknowledged: 'Baja confirmada',
  opt_out_invoked: 'Baja aplicada',
  opt_out_observed: 'Baja respetada',
  opt_out_blocked_sms: 'SMS frenado por la baja',
  opt_out_blocked_followup: 'Seguimiento frenado por la baja',
  canal_autorizado_tras_opt_out: 'Autorizó otro canal tras la baja',
  no_me_llame_anotado: 'Anotado en «No me llame»',
  no_contacto_generico_respondido: 'Respondió a un «no me contacten»',
  rne_blocked: 'Frenado por el Registro de No Excluidos',
  schedule_violation: 'Contacto fuera del horario',
  frequency_violation: 'Pasó el tope de contactos',
  frequency_cap_blocked: 'Frenado por el tope de contactos',
  inbound_outside_hours: 'Llamada recibida fuera del horario',
  sms_schedule_blocked: 'SMS frenado por el horario',
  sms_paused_blocked: 'SMS frenado por la pausa',
  precall_schedule_recheck_blocked: 'Llamada frenada por el horario',
  'callback.violation': 'Devolución fuera de las reglas',
  codeudor_contacted: 'Codeudor contactado',
  codeudor_prohibited_copy: 'Mensaje al codeudor frenado',
  codeudor_schedule_blocked: 'Codeudor frenado por el horario',
  codeudor_frequency_blocked: 'Codeudor frenado por el tope',
  codeudor_skipped_judicializado: 'Codeudor no contactado: caso en jurídico',
  ai_disclosure_made: 'Dijo que es una IA',
  ai_disclosure_violation: 'No dijo que es una IA',
  disclosure_ordering_violation: 'Avisos en otro orden',
  'disclosure.missing': 'Faltó un aviso legal',
  'consent.expired': 'Venció la autorización',
  guardrail_block: 'Mensaje frenado por las reglas',
  guardrail_rewrite: 'Mensaje corregido por las reglas',
  guardrail_pii_leak: 'Datos personales frenados',
  motive_question_blocked: 'Pregunta frenada por las reglas',
  numero_de_contacto_inventado: 'Número de contacto frenado',
  promesa_de_verificacion_bloqueada: 'Promesa frenada por las reglas',
  cita_de_llamada_sin_respaldo: 'Cita de llamada sin respaldo',
  contacto_sugerido_por_deudor: 'El deudor sugirió otro contacto',
  exclusion_sin_titular_observada: 'Exclusión sin titular',
  fraud_signal: 'Señal de posible fraude',
  'escalation.created': 'Pasó a una persona',
  stage_transition: 'Cambio de etapa',
  invalid_transition_blocked: 'Cambio de etapa frenado',
  contact_pause_review_pending: 'Pausa de contacto por revisar',
  cadence_skip: 'Contacto saltado',
  followup_skipped: 'Seguimiento saltado',
  'certified_notice.issued': 'Notificación certificada enviada',
  'legal_package.issued': 'Paquete jurídico emitido',
  bureau_report: 'Reporte a centrales',
  'bureau_report.submitted': 'Reporte a centrales enviado',
  central_notification: 'Aviso a centrales',
  'qa.recorded': 'Llamada calificada',
  'agent.final_verdict': 'Cierre del agente',
  arco_request: 'Solicitud de datos personales',
  objection_handled: 'Objeción atendida',
  playbook_applied: 'Guion aplicado',
  anti_stall_rescue: 'Conversación retomada',
  fragmented_text_rescue: 'Mensaje cortado retomado',
  dos_salidas_retry: 'Reintento con dos salidas',
  memo: 'Nota',
  crm_sync: 'Anotado en el CRM',
  'carrier.start': 'Consulta a una aseguradora',
  'carrier.verdict': 'Respuesta de una aseguradora',
  prospectos_handoff: 'Interesado pasado a una persona',
  prospectos_fence_block: 'Interesado frenado por las reglas',
  inspeccion_fence_block: 'Inspección frenada por las reglas',
  'naira.third_party_volume': 'Volumen de terceros',
  'inmueble.guardado': 'Inmueble guardado',
}

export const eventoDeCumplimiento = porPrefijo(
  EVENTOS_DE_CUMPLIMIENTO,
  [['opt_out', 'Baja de contacto'], ['whatsapp', 'WhatsApp'], ['codeudor', 'Codeudor'], ['guardrail', 'Mensaje frenado por las reglas'], ['contact_attempt', 'Intento de contacto']],
  'Otro evento',
)

/** Un canal de contacto (`channel`). */
export const CANALES: Record<string, string> = {
  voice: 'Llamada',
  call: 'Llamada',
  phone: 'Llamada',
  outbound: 'Llamada',
  inbound: 'Llamada recibida',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Correo',
  push: 'Notificación',
  letter: 'Carta',
  carta: 'Carta',
  web: 'En la web',
  portal: 'En el portal',
}

export const canal = conNombre(CANALES, 'Otro canal')

/**
 * Las claves de los datos de un registro que se resumen en la fila. Lo que no
 * está aquí no sale en la fila (va entero en el cajón y en el Excel).
 */
export const CAMPOS_DE_LOS_DATOS: Record<string, string> = {
  channel: 'Canal',
  reason: 'Motivo',
  amount: 'Valor',
  amountCop: 'Valor',
  monto: 'Valor',
  outcome: 'Resultado',
  stage: 'Etapa',
  from: 'Desde',
  to: 'Hasta',
  previous: 'Antes',
  next: 'Después',
  phone: 'Teléfono',
  count: 'Cuántos',
  total: 'Total',
  motivo: 'Motivo',
  canal: 'Canal',
  enabled: 'Prendido',
  nombre: 'Nombre',
  name: 'Nombre',
}

/** ¿Este valor es un id o un código (no se le muestra a nadie en la fila)? */
function pareceUnCodigo(v: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) || // un UUID
    /^[a-z]+(?:[_.][a-z0-9]+)+$/.test(v) || // un código con guiones bajos o puntos
    /^[A-Z][A-Z0-9_]{3,}$/.test(v) // un código en mayúsculas
  )
}

/**
 * Los datos de un registro en una línea: sólo las claves con nombre y valores
 * que se leen (nunca un UUID, un código ni un JSON). Vacío si no queda nada.
 */
export function resumenDeLosDatos(datos: unknown, maximo = 2): string {
  if (!datos || typeof datos !== 'object') return ''
  const partes: string[] = []
  for (const [k, v] of Object.entries(datos as Record<string, unknown>)) {
    if (!Object.prototype.hasOwnProperty.call(CAMPOS_DE_LOS_DATOS, k) || v == null) continue
    let valor: string | null = null
    if (typeof v === 'boolean') valor = v ? 'sí' : 'no'
    else if (typeof v === 'number') valor = v.toLocaleString('es-CO')
    else if (typeof v === 'string' && v.trim() && v.length <= 60) {
      valor = (k === 'channel' || k === 'canal') ? canal(v) : pareceUnCodigo(v) ? null : v
    }
    if (valor) partes.push(`${CAMPOS_DE_LOS_DATOS[k]}: ${valor}`)
    if (partes.length === maximo) break
  }
  return partes.join(' · ')
}

/** Las reglas de calidad de una llamada que fallaron (`RULE_SLUGS` del micro y su forma camelCase). */
export const FALLAS_DE_CALIDAD: Record<string, string> = {
  ai_disclosed: 'No dijo que es una IA',
  aiDisclosed: 'No dijo que es una IA',
  consent_to_record: 'No pidió permiso para grabar',
  consentToRecord: 'No pidió permiso para grabar',
  habeas_data_noticed: 'Faltó el aviso de datos personales',
  habeasDataNoticed: 'Faltó el aviso de datos personales',
  schedule_violations_zero: 'Llamó fuera del horario',
  frequency_violations_zero: 'Pasó el tope de contactos',
  opt_out_respected: 'No respetó la baja',
  optOutRespected: 'No respetó la baja',
  actor_type_saas_orchestrator: 'Quedó registrada con otro autor',
  optOutRequested: 'Pidió no ser contactado',
}

export const fallaDeCalidad = conNombre(FALLAS_DE_CALIDAD, 'Otra alerta')

/** El estado de una llamada en Vapi. */
export const estadoEnVapi = conNombre(
  { queued: 'En cola', ringing: 'Timbrando', 'in-progress': 'En curso', forwarding: 'Transfiriendo', ended: 'Terminó' },
  'Otro estado',
)

/** Por qué terminó una llamada (`endedReason` de Vapi). */
export const porQueTermino = porPrefijo(
  {
    'customer-ended-call': 'Colgó el deudor',
    'assistant-ended-call': 'Colgó el agente',
    'assistant-said-end-call-phrase': 'El agente se despidió',
    'assistant-forwarded-call': 'El agente la transfirió',
    'silence-timed-out': 'Silencio prolongado',
    'exceeded-max-duration': 'Llegó al tiempo máximo',
    voicemail: 'Buzón de voz',
    'customer-did-not-answer': 'No contestó',
    'customer-busy': 'Ocupado',
    'manually-canceled': 'Se canceló a mano',
    'twilio-failed-to-connect-call': 'No conectó',
  },
  [['pipeline-error', 'Falla técnica'], ['assistant-error', 'Falla técnica'], ['call.in-progress.error', 'Falla técnica'], ['customer-', 'Por el deudor']],
  'Otro motivo',
)

/** Cómo se detectó una baja de contacto (`details.detection`). */
export const comoSeDetecto = porPrefijo(
  {
    canal_autorizado_tras_opt_out: 'Autorizó otro canal',
    turn_level_deterministic: 'Lo dijo en la llamada',
    vapi_end_call_phrase: 'Con la frase de cierre',
    transcript_match: 'En la transcripción',
  },
  [['turn_level_deterministic', 'Lo dijo en la llamada']],
  'Otra forma',
)

/** Por qué cambió de etapa un deudor (`transition_reason` del micro). */
export const MOTIVOS_DE_ETAPA: Record<string, string> = {
  dia_1_sin_pago: 'Día 1 sin pago',
  dia_16_sin_pago: 'Día 16 sin pago',
  dia_46_ptp_incumplido: 'Día 46: incumplió la promesa',
  dia_46_sin_acuerdo: 'Día 46 sin acuerdo',
  dia_90_juridico_directo: 'Día 90: pasa a jurídico',
  dia_90_sin_poliza: 'Día 90 sin póliza',
  dos_canones_vencidos_con_poliza: 'Dos cánones vencidos, con póliza',
  pago_total: 'Pagó todo',
  sin_cambio: 'Sin cambio',
  skip_comportamental: 'Dejó de responder',
  skip_explicito_operador: 'El equipo lo marcó como abandono',
  plan_defaulted: 'Incumplió el acuerdo de pago',
}

export const motivoDeEtapa = porPrefijo(MOTIVOS_DE_ETAPA, [['sin_deuda', 'Dejó de estar en mora']], 'Otro motivo')

/** El siguiente contacto de la cartera (`next_channel`). */
export const siguienteContacto = conNombre({ ...CANALES, voice: 'Llamada', none: 'Ninguno' }, 'Otro canal')

/** Los chequeos de Salud del sistema (`checks[].name` del back). */
export const CHEQUEOS_DE_SALUD: Record<string, string> = {
  postgres_ping: 'Base de datos',
  agent_schema_tables: 'Tablas de los agentes',
  calls_24h: 'Llamadas en 24 horas',
  llm_metrics_24h: 'Uso de la IA en 24 horas',
  cron_freshness: 'Tareas programadas',
  vapi: 'Vapi · llamadas de voz',
  anthropic: 'Anthropic · inteligencia artificial',
  wompi: 'Wompi · pagos en línea',
  inngest: 'Inngest · tareas en segundo plano',
  kapso: 'Kapso · WhatsApp',
  resend: 'Resend · correos',
  upstash_redis: 'Redis · memoria rápida',
  'supabase-storage': 'Archivos',
  feel: 'FEEL · factura electrónica',
  agent_micro: 'Servicio de los agentes',
  avaluo_micro: 'Servicio de avalúos',
}

export const chequeoDeSalud = conNombre(CHEQUEOS_DE_SALUD, 'Otro servicio')

export const categoriaDelChequeo = conNombre(
  { database: 'Base de datos', external: 'Proveedores', micro: 'Servicios de Leasefy' },
  'Otros',
)

/** El detalle de un chequeo, en palabras (el back lo escribe en inglés; el original va al Excel). */
export function detalleDelChequeo(detalle: string | null | undefined): string {
  if (!detalle) return '—'
  const t = detalle.trim()
  let m: RegExpMatchArray | null
  if (t === 'pong' || t === 'ok') return 'Responde'
  if ((m = t.match(/^(\d+) tables in agent schema \(min (\d+)\)$/))) return `${Number(m[1]).toLocaleString('es-CO')} tablas (mínimo ${m[2]})`
  if ((m = t.match(/^(\d+) calls in last 24h$/))) return `${Number(m[1]).toLocaleString('es-CO')} en las últimas 24 horas`
  if ((m = t.match(/^(\d+) LLM metrics rows in last 24h$/))) return `${Number(m[1]).toLocaleString('es-CO')} registros en las últimas 24 horas`
  if ((m = t.match(/^last cadence_contacts run: (.+)$/))) return `Última corrida: ${m[1].slice(0, 10)}`
  if (/has never run/.test(t)) return 'Nunca ha corrido'
  if ((m = t.match(/^timeout after (\d+)ms$/))) return `No respondió en ${Number(m[1]) / 1000} s`
  if ((m = t.match(/^([1-5]\d\d)$/))) return `Respondió con error ${m[1]}`
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(t)) return 'No hubo respuesta'
  if (/no Upstash REST endpoint/i.test(t)) return 'Configurado; no se puede probar desde aquí'
  return 'Ver el detalle en el Excel'
}

/** Las tareas programadas que vigila el monitor (`cron` del back). */
export const TAREAS_PROGRAMADAS: Record<string, string> = {
  cadence_contacts: 'Contactos del día de la cobranza',
  central_reports: 'Reportes a centrales de riesgo',
  debtor_rne_status: 'Revisión del Registro de No Excluidos',
  billing_events: 'Cobro de la cobranza por voz',
  payouts: 'Giros a las inmobiliarias',
  cartera_daily_report: 'Reporte diario de cartera',
}

export const tareaProgramada = conNombre(TAREAS_PROGRAMADAS, 'Otra tarea')

/** Los flujos de los agentes (`agent_execution_metrics.workflow_id`). */
export const FLUJOS_DE_LOS_AGENTES: Record<string, string> = {
  'autonomous-dialer-workflow': 'Llamadas de cobranza',
  'pre-call-workflow': 'Preparación de llamadas',
  'post-call-workflow': 'Cierre de llamadas',
  'follow-up-workflow': 'Seguimientos',
  'legal-escalation-workflow': 'Paso a jurídico',
  'payment-orchestration-workflow': 'Pagos',
  'infer-debtor-profile-workflow': 'Perfil del deudor',
  'pre-bureau-notification-cron': 'Aviso antes de centrales',
  'cartera-cadence-cron': 'Cadencia de la cartera',
  'cartera-daily-report-cron': 'Reporte diario de cartera',
  'conciliacion-daily-report-cron': 'Reporte diario de conciliación',
  'cadence-dispatcher': 'Envío de la cadencia',
  'cadence-email-dispatcher': 'Correos de la cadencia',
  'rne-daily-sync': 'Registro de No Excluidos',
  'monthly-billing-aggregation': 'Cobro del mes',
  'cotizador-evaluate-workflow': 'Cotizaciones',
  'tenant-scoring-pipeline': 'Estudio del candidato',
  'smart-matching-pipeline': 'Afinidad de inmuebles',
  'whatsapp-conversation-turn': 'Conversaciones de WhatsApp',
  'whatsapp-conversation-summarizer': 'Resumen de WhatsApp',
  'prospectos-voice-dialer-workflow': 'Llamadas a interesados',
  'prospectos-speed-to-lead-dialer': 'Primera llamada a interesados',
  'portal-propietario-digest-cron': 'Resumen al propietario',
  'retencion-sweep-cron': 'Revisión de lo retenido',
  'naira-foundations-cron': 'Naira · cuentas',
}

export const flujoDeLosAgentes = conNombre(FLUJOS_DE_LOS_AGENTES, 'Otro flujo')

/** Proveedores de modelos y de voz de los agentes (Vapi). */
export const proveedor = conNombre(
  {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    groq: 'Groq',
    'azure-openai': 'Azure',
    azure: 'Azure',
    '11labs': 'ElevenLabs',
    elevenlabs: 'ElevenLabs',
    playht: 'PlayHT',
    cartesia: 'Cartesia',
    deepgram: 'Deepgram',
    vapi: 'Vapi',
    rime: 'Rime',
    wompi: 'Wompi',
    payu: 'PayU',
  },
  'Otro proveedor',
)

/**
 * El nombre de un modelo de IA («claude-sonnet-5-5» → «Claude Sonnet 5.5»,
 * «gpt-4o-mini» → «GPT-4o mini»). «none» o vacío = «Sin modelo».
 */
export function nombreDelModelo(codigo: string | null | undefined): string {
  if (!codigo || codigo === 'none' || codigo === 'unknown') return 'Sin modelo'
  const c = codigo.toLowerCase()
  let m: RegExpMatchArray | null
  if ((m = c.match(/^claude-(opus|sonnet|haiku|fable)-(\d+)(?:[-.](\d+))?/))) {
    const familia = m[1].charAt(0).toUpperCase() + m[1].slice(1)
    return `Claude ${familia} ${m[2]}${m[3] && m[3].length <= 2 ? `.${m[3]}` : ''}`
  }
  if ((m = c.match(/^claude-(\d+)(?:[-.](\d+))?-(opus|sonnet|haiku)/))) {
    const familia = m[3].charAt(0).toUpperCase() + m[3].slice(1)
    return `Claude ${familia} ${m[1]}${m[2] ? `.${m[2]}` : ''}`
  }
  if ((m = c.match(/^gpt-([0-9.]+o?)(?:-(mini|nano|turbo))?/))) return `GPT-${m[1]}${m[2] ? ` ${m[2]}` : ''}`
  if ((m = c.match(/^gemini-([0-9.]+)-(pro|flash)/))) return `Gemini ${m[1]} ${m[2] === 'pro' ? 'Pro' : 'Flash'}`
  return 'Otro modelo'
}

/** Cómo se cobra la cobranza por voz de una inmobiliaria (`billing_model`). */
export const MODELOS_DE_COBRO: Record<string, string> = {
  success_fee: 'Comisión por lo recaudado',
  per_call: 'Por llamada',
  per_minute: 'Por minuto',
  flat: 'Mensualidad fija',
  flat_fee: 'Mensualidad fija',
  hybrid: 'Mixto',
  subscription: 'Suscripción',
  none: 'Sin modelo',
}

export const modeloDeCobro = conNombre(MODELOS_DE_COBRO, 'Otro modelo de cobro')

/** Los estados de los procesos que fallaron (`status` / `legal_status`). */
export const ESTADOS_DE_PROCESO: Record<string, string> = {
  failed: 'Falló',
  error: 'Falló',
  pending: 'Pendiente',
  retrying: 'Reintentando',
  PENDING_RECEIPT: 'Esperando el acuse de recibo',
  FAILED: 'Falló',
  REJECTED: 'Rechazado',
  RETURNED: 'Devuelto',
}

export const estadoDelProceso = conNombre(ESTADOS_DE_PROCESO, 'Otro estado')

/** Los métodos de un avalúo, lo observado y la suficiencia de los comparables. */
export const metodoDelAvaluo = conNombre(
  {
    comparativo_mercado: 'Comparación de mercado',
    comparativo: 'Comparación de mercado',
    mixto: 'Mixto',
    costo_reposicion: 'Costo de reposición',
    capitalizacion_rentas: 'Capitalización de rentas',
    renta: 'Capitalización de rentas',
    residual: 'Residual',
    hedonico: 'Modelo de precios',
    ia: 'Con inteligencia artificial',
  },
  'Otro método',
)

export const tipoObservado = conNombre({ sale: 'Venta', rent: 'Arriendo', listing: 'Oferta', venta: 'Venta', arriendo: 'Arriendo' }, 'Otro')

export const suficiencia = conNombre(
  { ok: 'Suficientes', sufficient: 'Suficientes', marginal: 'Justos', insufficient: 'Insuficientes', insuficiente: 'Insuficientes' },
  'Sin medir',
)

/** La pasarela de un pago. */
export const pasarela = conNombre({ wompi: 'Wompi', payu: 'PayU', pse: 'PSE', nequi: 'Nequi', manual: 'A mano' }, 'Otra pasarela')

/** El modo de una aseguradora en el Cotizador. */
export const modoDeLaAseguradora = conNombre({ api: 'Por API', manual: 'A mano', email: 'Por correo', scraping: 'Por su portal' }, 'Otro modo')
