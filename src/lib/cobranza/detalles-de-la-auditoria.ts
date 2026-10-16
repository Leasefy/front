/**
 * 🔴 N-09 (QA-PAGOS-95, 05-10-2026): Cobranza › Cumplimiento › Auditoría
 * pintaba la columna DETALLES como JSON crudo («{ "corte":
 * "2026-10-04T23:26:21.693Z", "lotes": 0, … }»). Acá cada dato es un renglón
 * «clave: valor» en palabras, fechas en Bogotá y nada de comillas ni llaves.
 *
 * Sigue siendo TEXTO: la página lo pinta como texto plano, nunca como HTML
 * (invariante forense T-34-07-02). La cédula se queda afuera: la pinta `Mask`.
 */

export interface DetalleLegible {
  clave: string
  valor: string
}

import { stageDisplayName, type CarteraStage } from '@/lib/cartera'
import { ESPACIO_DE_LA_PLATA } from '@/lib/plata/escribir-plata'

/**
 * Claves que ya se pintan aparte (la cédula, enmascarada por `Mask`) y las
 * internas que no le dicen nada a la inmobiliaria (MORI-26, QA-AGENTES 16-10):
 * el rol técnico de quien actuó, las validaciones que pasó la petición
 * («zod, prisma, service»), ids y huellas. El caso ya sale en la columna
 * «Sobre qué».
 */
const APARTE = new Set([
  'cedula_raw',
  'cedula_masked',
  'actor_role',
  'gate_checks_passed',
  'debtor_id',
  'tenant_id',
  'session_id',
  'huella',
  'target_phone_hash',
  'variable_keys',
  'body_length',
  'template_id',
])

/** La clave en español (en su forma «snake»: `acceptedAt` → `accepted_at`). */
const NOMBRES: Record<string, string> = {
  origen: 'Origen',
  corte: 'Corte',
  lotes: 'Lotes',
  lote: 'Lote',
  motivo: 'Motivo',
  reason: 'Motivo',
  canal: 'Canal',
  modo: 'Modo',
  nivel: 'Nivel',
  antes: 'Antes',
  despues: 'Después',
  before: 'Antes',
  after: 'Después',
  values: 'Valores',
  changed_fields: 'Qué cambió',
  email_enabled: 'Por correo',
  whatsapp_enabled: 'Por WhatsApp',
  new_version: 'Versión nueva',
  previous_max_version: 'Versión anterior',
  resumed: 'Reanudada',
  paused_until: 'Pausada hasta',
  accepted_at: 'Aceptado el',
  titulo: 'Qué pasó',
  outcome: 'Resultado',
  resolved_by: 'Lo resolvió',
  decision: 'Decisión',
  proposed_values: 'Lo propuesto',
  stage: 'Etapa',
  from_stage: 'Desde',
  to_stage: 'Hasta',
  target_stage: 'Etapa nueva',
  installment_count: 'Cuotas',
  discount_amount_cop: 'Descuento',
  discount_applied_pct: 'Descuento (%)',
  effective_total_cop: 'Total del acuerdo',
  initial_amount_cop: 'Pago inicial',
  monto_total_cop: 'Monto total',
  firmante: 'Con firmante',
  acuerdo_general: 'Acuerdo general',
  autonomy_level: 'Autonomía',
  billing_model: 'Cobro de Leasefy',
  experimentos_prendidos: 'Pruebas de mensajes',
  dias_de_gracia_de_la_promesa: 'Días de gracia de la promesa',
  duration_seconds: 'Duración (segundos)',
  payment_provider: 'Pasarela',
  member_count: 'Personas del equipo',
  fuera_del_horario_confirmado: 'Fuera del horario, confirmado',
  omitio_tope_de_frecuencia: 'Pasó por encima del tope de contactos',
  top_n_debtors_in_report: 'Deudores en el reporte',
  mora_dias_bucket_boundaries: 'Cortes de días de mora',
  pkr_pct_alert_below: 'Avisar si las promesas cumplidas bajan de (%)',
  indice_morosidad_pct_alert_above: 'Avisar si la morosidad pasa de (%)',
  compliance_violations_critical_at_least: 'Avisar desde faltas a la Ley 2300',
  calls_outside_window_critical_at_least: 'Avisar desde llamadas fuera de horario',
  error: 'Error',
  fuente: 'Fuente',
  cerradas: 'Cerradas',
  resueltas: 'Resueltas',
  retenidos: 'Retenidos',
  filas: 'Filas',
  // QA-AGENTES 16-10: los que seguían en inglés.
  to_version: 'Volvió a la versión',
  from_version: 'Versión que se deshizo',
  type: 'Tipo',
  status: 'Estado',
  request_type: 'Tipo de solicitud',
  previous_status: 'Estado anterior',
  notes: 'Notas',
  payment_provider_skipped: 'Sin pasarela de pago',
  marcado_como_enviado: 'Marcado como enviado',
  period: 'Período',
}

/** `acceptedAt` / `Accepted-At` → `accepted_at`. */
function enSnake(clave: string): string {
  return clave
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

/** Lo que dicen algunos valores, por su clave. */
const VALORES: Record<string, Record<string, string>> = {
  modo: { sombra: 'Manual', copiloto: 'Copiloto', autonomo: 'Automático' },
  outcome: { approved: 'Aprobado', rejected: 'Rechazado', expired: 'Venció' },
  decision: { approve: 'Aprobar', reject: 'Rechazar' },
  // Habeas Data (los mismos nombres de la bandeja).
  type: { acceso: 'Acceso', rectificacion: 'Rectificación', cancelacion: 'Cancelación', oposicion: 'Oposición' },
  request_type: { acceso: 'Acceso', rectificacion: 'Rectificación', cancelacion: 'Cancelación', oposicion: 'Oposición' },
  status: {
    pending_email_verification: 'Sin confirmar',
    pending_admin_triage: 'Por revisar',
    in_progress: 'En proceso',
    resolved: 'Resuelta',
    rejected: 'Rechazada',
  },
  previous_status: {
    pending_email_verification: 'Sin confirmar',
    pending_admin_triage: 'Por revisar',
    in_progress: 'En proceso',
    resolved: 'Resuelta',
    rejected: 'Rechazada',
  },
  // La sincronización de la mora (`cierre-por-ausencia.ts` del micro).
  motivo: {
    dejo_de_estar_en_mora_en_la_plataforma: 'Dejó de estar en mora en la plataforma',
    'sin_deuda:dejo_de_estar_en_mora_en_la_plataforma': 'Ya no tiene deuda en la plataforma',
  },
  fuente: { cuotas: 'Cuotas de la plataforma' },
  origen: { 'ai-hub-autonomia': 'Pantalla de autonomía' },
  autonomy_level: {
    sugerir: 'Sugiere y espera',
    aprobar: 'Pide aprobación',
    automatico_controlado: 'Automático con límites',
    automatico_completo: 'Automático',
  },
}
const ETAPAS = new Set(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'])
const CLAVES_DE_ETAPA = new Set(['stage', 'from_stage', 'to_stage', 'target_stage'])

/** «ai_hub_autonomia» / «aiHubAutonomia» → «Ai hub autonomia». */
export function claveLegible(clave: string): string {
  if (NOMBRES[clave]) return NOMBRES[clave]
  const snake = enSnake(clave)
  if (NOMBRES[snake]) return NOMBRES[snake]
  // «monto_cop» → «Monto»: el valor ya sale con su «$» (MORI-26).
  if (snake.endsWith('_cop') && snake.length > 4) return claveLegible(snake.slice(0, -4))
  const palabras = clave
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return palabras ? palabras.charAt(0).toUpperCase() + palabras.slice(1) : clave
}

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/
const DIA = /^\d{4}-\d{2}-\d{2}$/

/** Un valor como se lee: fechas en palabras (Bogotá), sí/no, listas con comas. */
export function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'number') return new Intl.NumberFormat('es-CO').format(valor)
  if (typeof valor === 'string') {
    if (INSTANTE.test(valor)) {
      const d = new Date(valor)
      if (!Number.isNaN(d.getTime()))
        return d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' })
    }
    if (DIA.test(valor)) {
      const d = new Date(`${valor}T00:00:00Z`)
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('es-CO', { dateStyle: 'long', timeZone: 'UTC' })
    }
    return valor
  }
  if (Array.isArray(valor)) return valor.length === 0 ? '—' : valor.map(valorLegible).join(', ')
  if (typeof valor === 'object') {
    const partes = Object.entries(valor as Record<string, unknown>).map(
      ([k, v]) => `${claveLegible(k)}: ${valorLegible(v)}`,
    )
    return partes.length === 0 ? '—' : partes.join(' · ')
  }
  return String(valor)
}

/** Un valor sabiendo de qué clave es: etapas, modos y plata en palabras. */
export function valorDeLaClave(clave: string, valor: unknown): string {
  const snake = enSnake(clave)
  if (typeof valor === 'string') {
    if (CLAVES_DE_ETAPA.has(snake) && ETAPAS.has(valor)) return stageDisplayName(valor as CarteraStage, 'es')
    const traduccion = VALORES[snake]?.[valor]
    if (traduccion) return traduccion
  }
  if (snake.endsWith('_cop') && typeof valor === 'number' && Number.isFinite(valor)) {
    return `$${ESPACIO_DE_LA_PLATA}${new Intl.NumberFormat('es-CO').format(valor)}`
  }
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    const partes = Object.entries(valor as Record<string, unknown>)
      .filter(([k]) => !APARTE.has(enSnake(k)))
      .map(([k, v]) => `${claveLegible(k)}: ${valorDeLaClave(k, v)}`)
    return partes.length === 0 ? '—' : partes.join(' · ')
  }
  if (snake === 'changed_fields' && Array.isArray(valor)) {
    return valor.length === 0 ? '—' : valor.map((v) => (typeof v === 'string' ? claveLegible(v) : valorLegible(v))).join(', ')
  }
  return valorLegible(valor)
}

/** Los detalles de un renglón de la auditoría, en renglones legibles. */
export function detallesLegibles(detalles: unknown): DetalleLegible[] {
  if (!detalles || typeof detalles !== 'object' || Array.isArray(detalles)) {
    return detalles === null || detalles === undefined ? [] : [{ clave: 'Detalle', valor: valorLegible(detalles) }]
  }
  return Object.entries(detalles as Record<string, unknown>)
    .filter(([k]) => !APARTE.has(k) && !APARTE.has(enSnake(k)))
    .map(([k, v]) => ({ clave: claveLegible(k), valor: valorDeLaClave(k, v) }))
}
