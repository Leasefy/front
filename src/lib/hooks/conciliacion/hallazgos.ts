/**
 * Hallazgos del agente — las reglas puras detrás de la tarjeta «Lo que encontró
 * el agente» de la Sala de Conciliación.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * La Sala tenía un botón primario «Por revisar (0) →» en el encabezado y, más
 * abajo, una tarjeta «Excepciones por tipo» con cinco números sueltos. Ninguno
 * de los dos decía QUÉ encontró el agente: uno era un número sin nombre y la
 * otra, una taxonomía sin conclusión (Nico, 2026-09-03). Acá vive la conclusión
 * en palabras, separada de la pintura para poder probarla.
 *
 * ── Dos fuentes, una frase ──────────────────────────────────────────────────
 * El total de casos por revisar es `totals.en_cola` — la cola de verdad, la que
 * se abre al tocar el botón. El desglose por tipo es `taxonomy`, que puede
 * venir en ceros aunque la cola tenga filas (la columna `case_type` es
 * aditiva: hasta que la migración esté aplicada el back la omite fail-soft).
 * Por eso la frase se arma con el total de la cola y ENUMERA lo que la
 * taxonomía sepa; si no sabe nada, dice sólo el total. Nunca al revés: decir
 * «nada pendiente» porque la taxonomía está vacía sería mentir sobre plata.
 */

import type { ConciliacionSummaryTaxonomy } from './use-conciliacion-summary'

/** Los tipos de excepción que trae el summary, en orden canónico de lectura. */
export const TIPOS_DE_HALLAZGO = [
  'parciales',
  'duplicados',
  'diferencias_monto',
  'fuera_de_fecha',
  'sin_identificar',
] as const satisfies ReadonlyArray<keyof ConciliacionSummaryTaxonomy>

export type TipoDeHallazgo = (typeof TIPOS_DE_HALLAZGO)[number]

/** Etiquetas en singular y plural: la frase necesita las dos. */
const ETIQUETA: Record<TipoDeHallazgo, { uno: string; varios: string }> = {
  parciales: { uno: 'pago parcial', varios: 'pagos parciales' },
  duplicados: { uno: 'duplicado', varios: 'duplicados' },
  diferencias_monto: { uno: 'diferencia de monto', varios: 'diferencias de monto' },
  fuera_de_fecha: { uno: 'movimiento fuera de fecha', varios: 'movimientos fuera de fecha' },
  sin_identificar: { uno: 'sin identificar', varios: 'sin identificar' },
}

/** Etiqueta corta para el chip de la tarjeta (siempre en plural, cabe en una línea). */
export const ETIQUETA_CORTA: Record<TipoDeHallazgo, string> = {
  parciales: 'Pagos parciales',
  duplicados: 'Duplicados',
  diferencias_monto: 'Diferencia de monto',
  fuera_de_fecha: 'Fuera de fecha',
  sin_identificar: 'Sin identificar',
}

export interface Hallazgo {
  tipo: TipoDeHallazgo
  etiqueta: string
  cantidad: number
}

/**
 * Los tipos con al menos un caso, del más numeroso al menos.
 * Empate → gana el orden canónico, para que la lista no baile entre refrescos.
 */
export function hallazgosPorTipo(
  taxonomy: ConciliacionSummaryTaxonomy | null | undefined,
): Hallazgo[] {
  if (!taxonomy) return []
  return TIPOS_DE_HALLAZGO.map((tipo, orden) => ({
    tipo,
    etiqueta: ETIQUETA_CORTA[tipo],
    cantidad: taxonomy[tipo] ?? 0,
    orden,
  }))
    .filter((h) => h.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.orden - b.orden)
    .map(({ tipo, etiqueta, cantidad }) => ({ tipo, etiqueta, cantidad }))
}

/** Cuántos casos clasificó la taxonomía (puede ser menos que la cola). */
export function totalClasificado(
  taxonomy: ConciliacionSummaryTaxonomy | null | undefined,
): number {
  return hallazgosPorTipo(taxonomy).reduce((suma, h) => suma + h.cantidad, 0)
}

function nombrar(h: Hallazgo): string {
  const { uno, varios } = ETIQUETA[h.tipo]
  return `${h.cantidad} ${h.cantidad === 1 ? uno : varios}`
}

/** «a, b y c» — la coma final en español es «y», no una coma más. */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

/** Cuántos tipos se nombran antes de agrupar el resto: más de tres no se lee. */
const TIPOS_QUE_SE_NOMBRAN = 3

/**
 * La frase de una línea que resume la cola.
 *
 *   0 en cola                    → '' (la tarjeta dice «Nada pendiente de tu ojo»)
 *   3 en cola, sin taxonomía     → «3 movimientos necesitan tu ojo.»
 *   3 en cola, 3 de un solo tipo → «3 pagos parciales necesitan tu ojo.»
 *   3 en cola, 2 parciales + 1 duplicado
 *                                → «3 movimientos necesitan tu ojo: 2 pagos parciales y 1 duplicado.»
 */
export function fraseDeHallazgos(
  enCola: number,
  taxonomy: ConciliacionSummaryTaxonomy | null | undefined,
): string {
  if (enCola <= 0) return ''

  const hallazgos = hallazgosPorTipo(taxonomy)
  const sujeto = enCola === 1 ? '1 movimiento necesita' : `${enCola} movimientos necesitan`

  // La taxonomía no sabe nada (o el back todavía no la trae): sólo el total.
  if (hallazgos.length === 0) return `${sujeto} tu ojo.`

  // Un único tipo que explica TODA la cola: se nombra el tipo, no «movimientos».
  if (hallazgos.length === 1 && hallazgos[0].cantidad === enCola) {
    const unico = hallazgos[0]
    const verbo = unico.cantidad === 1 ? 'necesita' : 'necesitan'
    return `${nombrar(unico)} ${verbo} tu ojo.`
  }

  const nombrados = hallazgos.slice(0, TIPOS_QUE_SE_NOMBRAN).map(nombrar)
  const resto = hallazgos
    .slice(TIPOS_QUE_SE_NOMBRAN)
    .reduce((suma, h) => suma + h.cantidad, 0)
  if (resto > 0) nombrados.push(`${resto} ${resto === 1 ? 'caso más' : 'casos más'}`)

  return `${sujeto} tu ojo: ${enumerar(nombrados)}.`
}

/** La etiqueta del botón que lleva a la cola. */
export function etiquetaDeRevision(enCola: number): string {
  return `Revisar ${enCola} ${enCola === 1 ? 'caso' : 'casos'}`
}
