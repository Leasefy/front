/**
 * Qué puede rellenar solo el panel en un WhatsApp manual.
 *
 * ── El defecto que arregla ────────────────────────────────────────────────
 *
 * `DebtorDetailClient` pasaba `prefill={{ nombre: debtorName }}`. Ninguna
 * plantilla tiene una variable llamada `nombre`, así que el `prefill[v] ?? ''`
 * del modal caía a vacío SIEMPRE: las cinco cajas salían en blanco y el
 * operador tenía que escribir a mano hasta el nombre de su propia
 * inmobiliaria. No fallaba nada — simplemente no rellenaba nunca.
 *
 * ── La plata y las fechas: sólo las de UNA cuota (QA-AGENTES 16-10) ────────
 *
 * 🔴 Desde el 16-10 el detalle del micro trae `deudaMasVieja` (mes,
 * vencimiento y saldo de la cuota abierta más vieja, la que nombra el
 * recordatorio) y `prefillDeLaCuotaVencida` los pone —sólo en la plantilla
 * que habla de un mes vencido (`overdue_month`)—. Lo de abajo sigue valiendo:
 * nunca el acumulado del caso ni los días de la etapa.
 *
 * ── Por qué NO se rellenaba la plata ni las fechas ────────────────────────
 *
 * Se rellena sólo lo que el panel sabe con certeza: el nombre del deudor y el
 * de la inmobiliaria. El monto, el mes vencido y la fecha de vencimiento NO,
 * aunque haya números a mano:
 *
 *  - `kpis.totalOwed` es el acumulado del caso, no necesariamente el canon
 *    que la plantilla nombra («tu canon del mes de X venció el Y por COP Z»).
 *  - `daysInStage` son días en la ETAPA, no días de mora.
 *
 * Un campo vacío es una molestia. Un monto equivocado dentro de un mensaje de
 * cobro es una afirmación falsa sobre una deuda, mandada por WhatsApp, con el
 * nombre de la inmobiliaria adelante. La vista previa marca los huecos para
 * que se vean; llenarlos es del operador.
 *
 * ── Dos familias de nombres ───────────────────────────────────────────────
 *
 * El registro del agente convive con dos convenciones: las plantillas de Meta
 * usan `debtor_first_name` / `agency_name`, y las de cartera `deudor` /
 * `nombre_inmobiliaria`. Se rellenan las dos: sobrar una clave no molesta —
 * el modal sólo lee las que su plantilla declara.
 */

import { primerNombre } from './wa-preview'

export interface DatosPrefillWA {
  /** Nombre completo del deudor, tal como lo devuelve el detalle. */
  debtorName: string
  /** Razón social / nombre de la inmobiliaria en sesión. */
  agencyName?: string | null
}

export function construirPrefillWA({
  debtorName,
  agencyName,
}: DatosPrefillWA): Record<string, string> {
  const prefill: Record<string, string> = {}

  const nombre = primerNombre(debtorName ?? '')
  if (nombre) {
    prefill.debtor_first_name = nombre
    prefill.deudor = nombre
    // `fiador_nombre` NO se rellena con esto: el fiador es otra persona, y
    // saludar al codeudor con el nombre del deudor sería un error grave en un
    // mensaje de cobro.
  }

  const agencia = (agencyName ?? '').trim()
  if (agencia) {
    prefill.agency_name = agencia
    prefill.nombre_inmobiliaria = agencia
  }

  return prefill
}

/** La cuota abierta más vieja del deudor (`deudaMasVieja` del detalle del micro). */
export interface CuotaMasVieja {
  /** '2026-08' (puede faltar). */
  periodo: string | null
  /** 'AAAA-MM-DD'. */
  vence: string
  /** Lo que falta por pagar de ESA cuota. */
  saldoCop: number
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

/**
 * Mes, vencimiento y monto de la cuota más vieja, como los pide la plantilla
 * del recordatorio («del mes de agosto venció el 1 de agosto por valor de COP
 * 1.400.000»). Lo que no se puede leer no se pone (el campo queda para escribir).
 */
export function prefillDeLaCuotaVencida(c: CuotaMasVieja | null | undefined): Record<string, string> {
  if (!c) return {}
  const prefill: Record<string, string> = {}
  const vence = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.vence ?? '')
  const periodo = /^(\d{4})-(\d{2})$/.exec(c.periodo ?? '')
  const mes = Number(periodo?.[2] ?? vence?.[2])
  if (mes >= 1 && mes <= 12) prefill.overdue_month = MESES[mes - 1]!
  if (vence) {
    const m = Number(vence[2])
    if (m >= 1 && m <= 12) prefill.due_date = `${Number(vence[3])} de ${MESES[m - 1]}`
  }
  if (Number.isFinite(c.saldoCop) && c.saldoCop > 0) {
    prefill.amount_cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(c.saldoCop)
  }
  return prefill
}
