/**
 * Los nombres en español de lo que el back del admin manda en inglés o en
 * código (`pre_judicial_letter`, `upheld`…). La pantalla nunca muestra el
 * código crudo si tiene nombre; si no lo tiene, lo muestra legible.
 */

/** «pre_judicial_letter» → «Pre judicial letter» (último recurso). */
export function legible(codigo: string | null | undefined): string {
  if (!codigo) return '—'
  const texto = codigo.replace(/[_-]+/g, ' ').trim()
  return texto.charAt(0).toLocaleUpperCase('es-CO') + texto.slice(1)
}

function conNombre(mapa: Record<string, string>) {
  return (codigo: string | null | undefined) => (codigo ? mapa[codigo] ?? legible(codigo) : '—')
}

export const tipoDeDecision = conNombre({
  pre_judicial_letter: 'Carta prejurídica',
  siniestro_filing: 'Reclamo de siniestro',
  legal_escalation: 'Escalación legal',
})

export const resultadoDeLaRevision = conNombre({
  upheld: 'Aprobada',
  overridden: 'Modificada',
  escalated: 'Escalada a abogado',
})

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

export const resultadoDeLaLlamada = conNombre(RESULTADOS_DE_LLAMADA)

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
})

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
  return URGENCIA[codigo] ?? { nombre: legible(codigo), tono: 'muted' as const }
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
  return ESTADO_DEL_PLAN[codigo] ?? { nombre: legible(codigo), tono: 'muted' as const }
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
 * palabras (20-10-2026). Un código nuevo sin nombre se muestra legible.
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
}

export const accionDelAdmin = conNombre(ACCIONES_DEL_ADMIN)
