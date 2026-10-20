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
