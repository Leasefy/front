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
 * ── Por qué NO se rellena la plata ni las fechas ──────────────────────────
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
