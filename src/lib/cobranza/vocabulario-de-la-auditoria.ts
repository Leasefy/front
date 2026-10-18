/**
 * La Auditoría de Cobranza en palabras (MORI-26, QA-AGENTES 16-10).
 *
 * 🔴 En el laboratorio la pantalla decía, renglón por renglón,
 * «subscription_update · agency_daily_report_subscriptions · Actor role: OWNER»,
 * «cobranza.autonomy.updated · agency_policy · After: Autonomy level: sugerir»
 * y «payment_plan_approve · Gate checks passed: zod, prisma, service · Debtor id:
 * 6dbe43ba-…». Es la bitácora que lee la inmobiliaria (o su abogado) para saber
 * qué pasó con un caso: va en su idioma.
 *
 * El código de la acción no se pierde: viaja en el filtro y en el CSV, y una
 * acción que todavía no tiene nombre acá se muestra con el código (mejor el
 * dato feo que uno inventado).
 */

/** Lo que hizo alguien (o el agente), por el código que guarda el micro. */
const ACCIONES: Record<string, string> = {
  // Intervenciones del equipo sobre un caso
  pause: 'Pausó o reanudó la cobranza',
  force_stage: 'Cambió la etapa a mano',
  manual_wa_send: 'Mandó un WhatsApp a mano',
  manual_call_trigger: 'Pidió una llamada',
  intervention: 'Intervino el caso',
  pii_reveal: 'Vio un dato personal',
  case_flag_judicializado: 'Marcó el caso como judicializado',
  case_flag_cartera_final: 'Marcó el caso como cartera final',
  case_flag_primary_contact: 'Cambió el contacto principal',
  'cobranza.memo.manual_create': 'Escribió una nota',
  'cobranza.carta.a_mano': 'Generó una carta a mano',
  'cobranza.codeudor.contactar': 'Pidió contactar al codeudor',
  escalated_to_human: 'El agente pasó el caso a una persona',
  escalation_resolve: 'Resolvió un escalamiento',
  escalation_claim: 'Tomó un escalamiento',
  escalation_assign: 'Asignó un escalamiento',
  escalacion_creada: 'Se abrió un escalamiento',
  escalacion_resuelta: 'Se resolvió un escalamiento',
  owner_report_generate: 'Generó un reporte para el propietario',
  owner_report_approve: 'Aprobó un reporte para el propietario',
  dispute_open: 'Abrió una disputa',
  dispute_resolve: 'Resolvió una disputa',
  // Acuerdos y pagos
  'cartera.payment_plan.offered': 'El agente ofreció un acuerdo de pago',
  'cartera.payment_plan.accepted': 'El inquilino aceptó el acuerdo de pago',
  'cartera.payment_plan.defaulted': 'Se incumplió el acuerdo de pago',
  'cartera.payment_plan.incumplimiento_detectado': 'Se detectó un incumplimiento del acuerdo',
  payment_plan_approve: 'Aprobó un acuerdo de pago',
  payment_plan_reject: 'Rechazó un acuerdo de pago',
  payment_self_report: 'El inquilino reportó un pago',
  payment_verify_approve: 'Confirmó un pago reportado',
  payment_verify_reject: 'Rechazó un pago reportado',
  pago_creado: 'Se registró un pago',
  pago_verificado: 'Se verificó un pago',
  pago_autorreportado: 'El inquilino reportó un pago',
  'cobranza.acuerdo_general.created': 'Creó un acuerdo general',
  'cobranza.acuerdo_general.updated': 'Cambió un acuerdo general',
  'cobranza.acuerdo_general.deleted': 'Retiró un acuerdo general',
  // Configuración
  'cobranza.autonomy.updated': 'Cambió la autonomía de Mori',
  'cobranza.ajustes.updated': 'Cambió los ajustes de la cobranza',
  'cobranza.politica.updated': 'Cambió la política de cobranza',
  'cobranza.cadence.updated': 'Cambió la cadencia de contacto',
  'agency.policy.updated': 'Cambió la política de la inmobiliaria',
  'policy-version-created': 'Guardó una versión de la política',
  'policy-rolled-back': 'Volvió a una versión anterior de la política',
  threshold_edit: 'Cambió los umbrales del reporte',
  threshold_rollback: 'Volvió a unos umbrales anteriores',
  subscription_update: 'Cambió su suscripción al reporte diario',
  onboarding_completed: 'Terminó la configuración inicial',
  // Cumplimiento y Habeas Data
  'arco-request-created': 'Llegó una solicitud de Habeas Data',
  'arco-email-verified': 'El titular confirmó su correo',
  'arco-request-triaged': 'Revisó una solicitud de Habeas Data',
  'arco-request-extended': 'Amplió el plazo de una solicitud de Habeas Data',
  'arco-request-resolved': 'Respondió una solicitud de Habeas Data',
  'arco-request-rejected': 'Rechazó una solicitud de Habeas Data',
  arco_resolve: 'Respondió una solicitud de Habeas Data',
  opt_out_recorded: 'Se registró un «no me contacten»',
  opt_out_acknowledged: 'Revisó un «no me contacten»',
  'legal.certified_notice_issued': 'Se envió un aviso certificado',
  'legal.package_sealed': 'Se selló el paquete para jurídico',
  'legal.handoff_processed': 'El caso pasó a jurídico',
  'cartera.stage.s3_pre_judicial_handoff': 'El caso pasó a mora pre-jurídica',
  // Sistema y Piloto
  'cartera.mora_sync.cierre': 'Se actualizó la cartera en mora',
  'cartera.mora_sync.lote': 'Llegó un lote de la cartera en mora',
  'cartera.daily_report.dispatched': 'Se envió el reporte diario',
  'cartera.cadence.planned': 'El agente planeó los contactos del día',
  piloto_autonomia_cambiada: 'Cambió el modo del Piloto',
  piloto_autonomia_flota_cambiada: 'Cambió el modo de los agentes',
  piloto_decision_resuelta: 'Se resolvió una decisión del Piloto',
  piloto_decision_vencida: 'Venció una decisión del Piloto',
  piloto_retenido_por_autonomia: 'El Piloto lo dejó para aprobar',
  piloto_retenido_aprobado: 'Se aprobó lo que el Piloto retuvo',
  piloto_retenido_descartado: 'Se descartó lo que el Piloto retuvo',
  piloto_calidad_pasada: 'El Piloto revisó la calidad',
  piloto_reporte_enviado: 'El Piloto envió su reporte',
  piloto_preferencias_cambiadas: 'Cambió las preferencias del Piloto',
  piloto_modo_del_proceso_cambiado: 'Cambió el modo de un proceso del Piloto',
  piloto_habilitacion_cambiada: 'Prendió o apagó un proceso del Piloto',
  piloto_envio_programado: 'El Piloto programó un envío',
  piloto_envio_deshecho: 'Se deshizo un envío del Piloto',
}

/** Sobre qué fue, por el `entity_type`. */
const ENTIDADES: Record<string, string> = {
  debtor: 'Caso',
  payment_plan: 'Acuerdo de pago',
  debtor_memo: 'Nota',
  agency: 'Inmobiliaria',
  agency_policy: 'Política de la inmobiliaria',
  agent_autonomy: 'Modo del agente',
  ajustes_de_la_cobranza: 'Ajustes de la cobranza',
  agency_daily_report_subscriptions: 'Suscripción al reporte',
  agency_daily_report_thresholds: 'Umbrales del reporte',
  mora_sync_corrida: 'Cartera en mora',
  calidad: 'Calidad',
  escalation: 'Escalamiento',
  dispute: 'Disputa',
  call: 'Llamada',
  payment: 'Pago',
  obligation: 'Cuota',
  arco_request: 'Solicitud de Habeas Data',
  arco_requests: 'Solicitud de Habeas Data',
  owner_report: 'Reporte al propietario',
}

/** Quién actuó, cuando el `actor_id` no es una persona. */
const ACTORES: Record<string, string> = {
  'piloto-gerente': 'El Piloto',
  piloto: 'El Piloto',
  // El titular desde el formulario público de Habeas Data.
  external: 'El titular de los datos',
  niti: 'Niti',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function accionLegible(codigo: string): string {
  return ACCIONES[codigo] ?? codigo
}

/** ¿La acción tiene nombre? (si no, la página la pinta como código). */
export function accionConNombre(codigo: string): boolean {
  return codigo in ACCIONES
}

export function entidadLegible(tipo: string | null | undefined): string {
  if (!tipo) return '—'
  return ENTIDADES[tipo] ?? tipo
}

export function actorLegible(actorId: string | null | undefined): string | null {
  if (!actorId) return null
  // Un id de usuario suelto (p. ej. al terminar la configuración inicial) no le
  // dice nada a nadie: antes salía «1a000000-0000-4000-8000-…».
  if (UUID.test(actorId)) return 'Alguien del equipo'
  return ACTORES[actorId] ?? actorId
}

/** Adónde lleva la entidad: el caso o el acuerdo, que tienen ficha. */
export function enlaceDeLaEntidad(tipo: string | null | undefined, id: string | null | undefined): string | null {
  if (!id) return null
  if (tipo === 'debtor') return `/panel/inmobiliaria/pagos/cobranza/deudores/${encodeURIComponent(id)}`
  if (tipo === 'payment_plan') return `/panel/inmobiliaria/pagos/cobranza/pagos/planes/${encodeURIComponent(id)}`
  if (tipo === 'arco_requests' || tipo === 'arco_request')
    return `/panel/inmobiliaria/pagos/cobranza/arco/${encodeURIComponent(id)}`
  return null
}

/** «16 de octubre de 2026, 11:26 a. m.» en la hora de Colombia (antes «16/10/2026, 11:26:40»). */
export function cuandoPaso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' })
}
