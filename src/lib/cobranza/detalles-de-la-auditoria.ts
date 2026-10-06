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

/** Claves que ya se pintan aparte (la cédula, enmascarada por `Mask`). */
const APARTE = new Set(['cedula_raw', 'cedula_masked'])

const NOMBRES: Record<string, string> = {
  origen: 'Origen',
  corte: 'Corte',
  lotes: 'Lotes',
  motivo: 'Motivo',
  canal: 'Canal',
  modo: 'Modo',
  nivel: 'Nivel',
  antes: 'Antes',
  despues: 'Después',
}

/** «ai_hub_autonomia» / «aiHubAutonomia» → «Ai hub autonomia». */
export function claveLegible(clave: string): string {
  if (NOMBRES[clave]) return NOMBRES[clave]
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

/** Los detalles de un renglón de la auditoría, en renglones legibles. */
export function detallesLegibles(detalles: unknown): DetalleLegible[] {
  if (!detalles || typeof detalles !== 'object' || Array.isArray(detalles)) {
    return detalles === null || detalles === undefined ? [] : [{ clave: 'Detalle', valor: valorLegible(detalles) }]
  }
  return Object.entries(detalles as Record<string, unknown>)
    .filter(([k]) => !APARTE.has(k))
    .map(([k, v]) => ({ clave: claveLegible(k), valor: valorLegible(v) }))
}
