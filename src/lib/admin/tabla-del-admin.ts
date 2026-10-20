/**
 * La lógica de las tablas del admin, pura y probada (20-10-2026, Nico: «que las
 * tablas tengan paginación, filtros y todo lo que tienen las tablas de la
 * plataforma real»). La usa `DataTable`; acá no hay React.
 *
 * El orden de las cosas es el mismo del panel de la inmobiliaria: primero se
 * busca y se filtra sobre la lista ENTERA, después se ordena y al final se
 * corta la página. Buscar sobre la página que se ve (10 de 300) es el error que
 * ya tuvo Propietarios.
 */

import { sinTildes } from './format'

export type ValorDeCelda = string | number | boolean | null | undefined

export type Sentido = 'asc' | 'desc'

/** Lo que una columna aporta a la búsqueda, al orden y al Excel. */
export interface ColumnaDeDatos<T> {
  header: string
  /** Valor por el que se ordena. Sin esto, la columna no se ordena. */
  orden?: (fila: T) => ValorDeCelda
  /** Lo que la columna dice en texto: se busca y va al Excel. */
  texto?: (fila: T) => ValorDeCelda
}

export interface Segmento<T> {
  valor: string
  nombre: string
  cumple: (fila: T) => boolean
}

const vacio = (v: ValorDeCelda) => v === null || v === undefined || v === ''

/** El texto de una fila en el que se busca: el de todas las columnas con `texto`. */
export function textoDeLaFila<T>(fila: T, columnas: ColumnaDeDatos<T>[], extra?: (fila: T) => ValorDeCelda): string {
  const partes: string[] = []
  for (const c of columnas) {
    const v = c.texto?.(fila)
    if (!vacio(v) && typeof v !== 'boolean') partes.push(String(v))
  }
  const e = extra?.(fila)
  if (!vacio(e) && typeof e !== 'boolean') partes.push(String(e))
  return sinTildes(partes.join(' '))
}

/**
 * Las filas que tienen TODAS las palabras buscadas, sin importar tildes ni
 * mayúsculas («bogota» encuentra «Bogotá»). Sin búsqueda, todas.
 */
export function buscarEnLasFilas<T>(
  filas: readonly T[],
  busqueda: string,
  columnas: ColumnaDeDatos<T>[],
  extra?: (fila: T) => ValorDeCelda,
): T[] {
  const palabras = sinTildes(busqueda).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return [...filas]
  return filas.filter((f) => {
    const donde = textoDeLaFila(f, columnas, extra)
    return palabras.every((p) => donde.includes(p))
  })
}

const comparador = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

/**
 * Compara dos valores de una columna. Lo vacío va SIEMPRE al final, ordene como
 * ordene: una columna de fechas en descendente no debe abrir con «—».
 */
export function compararValores(a: ValorDeCelda, b: ValorDeCelda, sentido: Sentido): number {
  const av = vacio(a), bv = vacio(b)
  if (av && bv) return 0
  if (av) return 1
  if (bv) return -1
  let r: number
  if (typeof a === 'number' && typeof b === 'number') r = a - b
  else if (typeof a === 'boolean' && typeof b === 'boolean') r = Number(a) - Number(b)
  else r = comparador.compare(String(a), String(b))
  return sentido === 'asc' ? r : -r
}

/** Ordena una copia (estable: los empates conservan el orden que trajo el back). */
export function ordenarFilas<T>(filas: readonly T[], valor: ((fila: T) => ValorDeCelda) | undefined, sentido: Sentido): T[] {
  if (!valor) return [...filas]
  return filas
    .map((f, i) => ({ f, i, v: valor(f) }))
    .sort((x, y) => compararValores(x.v, y.v, sentido) || x.i - y.i)
    .map((x) => x.f)
}

/**
 * Lo que sigue al apretar una cabecera, como en el panel: otra columna empieza
 * en el sentido que se le pide (texto de la A a la Z, cifras y fechas de mayor a
 * menor); la misma columna cambia de sentido.
 */
export function siguienteOrden(
  actual: { columna: number; sentido: Sentido } | null,
  columna: number,
  primero: Sentido = 'asc',
): { columna: number; sentido: Sentido } {
  if (actual && actual.columna === columna) return { columna, sentido: actual.sentido === 'asc' ? 'desc' : 'asc' }
  return { columna, sentido: primero }
}

/** El orden en la URL: «3» (columna 3, ascendente) o «-3» (descendente). */
export function leerOrden(crudo: string): { columna: number; sentido: Sentido } | null {
  const m = /^(-)?(\d{1,2})$/.exec(crudo.trim())
  if (!m) return null
  return { columna: Number(m[2]), sentido: m[1] ? 'desc' : 'asc' }
}

export function escribirOrden(o: { columna: number; sentido: Sentido } | null): string {
  if (!o) return ''
  return `${o.sentido === 'desc' ? '-' : ''}${o.columna}`
}

/** Cuántas filas caen en cada segmento (con la búsqueda y los demás filtros ya puestos). */
export function contarSegmentos<T>(filas: readonly T[], segmentos: Segmento<T>[]): Record<string, number> {
  const conteo: Record<string, number> = {}
  for (const s of segmentos) conteo[s.valor] = 0
  for (const f of filas) for (const s of segmentos) if (s.cumple(f)) conteo[s.valor]++
  return conteo
}

/** Las filas de una página (la página cuenta desde 0) y la página que de verdad se muestra. */
export function cortarPagina<T>(filas: readonly T[], pagina: number, tamano: number): { filas: T[]; pagina: number; ultima: number } {
  const ultima = Math.max(0, Math.ceil(filas.length / tamano) - 1)
  const p = Math.min(Math.max(pagina, 0), ultima)
  return { filas: filas.slice(p * tamano, p * tamano + tamano), pagina: p, ultima }
}

/** Las cantidades de filas por página que se ofrecen. */
export const FILAS_POR_PAGINA = [10, 25, 50, 100]
export const FILAS_POR_DEFECTO = 25

export function leerTamano(crudo: string, porDefecto = FILAS_POR_DEFECTO): number {
  const n = Number(crudo)
  return FILAS_POR_PAGINA.includes(n) ? n : porDefecto
}

/**
 * La hoja del Excel: una fila de títulos y una por registro, con lo que cada
 * columna dice en texto. Las cifras van como número (Excel las suma); lo vacío,
 * celda vacía (nunca «—», que en Excel es texto).
 */
export function hojaDeLaTabla<T>(filas: readonly T[], columnas: ColumnaDeDatos<T>[]): Array<Array<string | number>> {
  const conTexto = columnas.filter((c) => c.texto && c.header.trim())
  const titulos = conTexto.map((c) => c.header)
  const cuerpo = filas.map((f) =>
    conTexto.map((c) => {
      const v = c.texto!(f)
      if (vacio(v)) return ''
      if (typeof v === 'boolean') return v ? 'Sí' : 'No'
      return v as string | number
    }),
  )
  return [titulos, ...cuerpo]
}

/** El día de hoy en Bogotá, para el nombre del archivo (con UTC, de noche salía mañana). */
export function diaEnBogota(hoy: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(hoy)
}

/** «inmobiliarias-2026-10-20.xlsx»: sin tildes ni espacios. */
export function nombreDelArchivo(base: string, hoy: Date = new Date()): string {
  const limpio = sinTildes(base).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tabla'
  return `${limpio}-${diaEnBogota(hoy)}.xlsx`
}

/** «1 inmobiliaria» / «12 inmobiliarias» / «12 de 40 inmobiliarias». */
export function fraseDelConteo(vistas: number, total: number, queSon: [string, string]): string {
  const n = new Intl.NumberFormat('es-CO')
  const nombre = total === 1 && vistas === 1 ? queSon[0] : queSon[1]
  return vistas === total ? `${n.format(total)} ${nombre}` : `${n.format(vistas)} de ${n.format(total)} ${nombre}`
}
