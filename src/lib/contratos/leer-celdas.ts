/**
 * leer-celdas — convertir lo que trae una hoja de cálculo en datos usables.
 *
 * Vive aparte del componente porque es donde se pierden los datos en silencio:
 * un `$` que vuelve NaN se guarda como canon 0, y una fecha leída al revés
 * corre el contrato tres meses. Ninguna de las dos cosas da un error.
 */

import type { CampoDeContrato, MapeoDeColumna } from './columnas-de-contrato'

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function valorDe(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
  campo: CampoDeContrato,
): unknown {
  const col = mapeo.find((m) => m.campo === campo)?.columna
  return col ? fila[col] : undefined
}

export function textoOpcional(v: unknown): string | undefined {
  const s = v == null ? '' : String(v).trim()
  return s === '' ? undefined : s
}

/**
 * Un número que viene de una hoja de cálculo puede traer `$`, puntos de miles
 * y coma decimal. `Number('$ 2.400.000')` da NaN, y un NaN silencioso se
 * guarda como canon 0: el contrato queda cobrando nada y nadie ve un error.
 */
export function comoEntero(v: unknown): number {
  if (typeof v === 'number') return Math.round(v)
  const limpio = String(v ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')
  const n = Number(limpio)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/**
 * `03/04/2026` en Colombia es 3 de abril, no 4 de marzo.
 *
 * `new Date('03/04/2026')` lo lee al formato de EE.UU. y devuelve el 4 de
 * marzo: el contrato entero se corre un mes sin que nada falle.
 */
export function comoFecha(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  const conBarras = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (conBarras) {
    const [, d, m, a] = conBarras
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s.slice(0, 10)
}

/**
 * Ante la duda, vivienda.
 *
 * No es un empate arbitrario: vivienda va SIN IVA. Equivocarse hacia comercial
 * le cobraría a alguien un 19% que no debe, y esa plata ya salió de su bolsillo
 * cuando alguien lo note.
 */
export function comoUso(v: unknown): 'VIVIENDA' | 'COMERCIAL' {
  return /comerc|local|oficina|bodega/i.test(String(v ?? '')) ? 'COMERCIAL' : 'VIVIENDA'
}
