/**
 * leer-celdas — convertir lo que trae una hoja de cálculo en datos usables.
 *
 * Vive aparte del componente porque es donde se pierden los datos en
 * silencio: un `$` mal leído puede volverse un número distinto, y una fecha
 * leída al revés corre el contrato tres meses. Ninguna de las dos cosas da
 * un error — se ven como datos perfectamente válidos.
 *
 * Regla dura de este archivo: lo que no se puede leer con certeza vuelve
 * `undefined`, NUNCA un valor inventado (0, una fecha truncada, "hoy").
 * `0` es un canon legítimo — un arriendo gratuito existe — y confundirlo con
 * "no se pudo leer" es lo que anula la protección del back
 * (`Consignacion.canonDesconocido`, que sólo se activa cuando el campo llega
 * ausente): un `0` fabricado acá registra un contrato como legítimamente
 * gratuito y lo factura en $0 para siempre, sin que nadie vea un error.
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

/**
 * Placeholders que los exports usan para decir «no hay dato»: si viajan como
 * texto real, el back guarda un documento «N/A» o un teléfono «-» y esa
 * basura después NO casa con nada (búsquedas, duplicados, consignaciones).
 * «No hay dato» tiene UNA forma: `undefined`.
 */
const PLACEHOLDERS_DE_VACIO = new Set([
  '-',
  '--',
  '.',
  'n/a',
  'na',
  'n.a.',
  'null',
  'none',
  'sin dato',
  'sin datos',
  's/d',
  'nd',
  'n.d.',
  'no aplica',
  'ninguno',
  'ninguna',
])

export function textoOpcional(v: unknown): string | undefined {
  const s = v == null ? '' : String(v).trim()
  if (s === '') return undefined
  return PLACEHOLDERS_DE_VACIO.has(s.toLowerCase()) ? undefined : s
}

/**
 * Si la celda trae algo. `null`/`undefined` es una columna que no mapeó a
 * nada; `''` es una columna mapeada con la celda vacía. Los dos casos son
 * "no sé", y ninguno de los dos debe convertirse en un valor inventado
 * (0, la fecha de hoy, "vivienda") — eso es justo lo que el back no puede
 * distinguir de un dato real una vez que llega.
 */
export function hayValor(v: unknown): boolean {
  return v != null && String(v).trim() !== ''
}

/**
 * Un número que viene de una hoja de cálculo puede traer `$`, y miles/decimales
 * en cualquiera de las dos convenciones: `1.234.567,89` (miles con punto,
 * decimal con coma — Colombia) o `1,234,567.89` (miles con coma, decimal con
 * punto — el export real del owner). No se adivina por locale: el separador
 * DECIMAL es el ÚLTIMO separador seguido de 1 o 2 dígitos; un separador
 * seguido de exactamente 3 dígitos es de miles.
 *
 * El código viejo sólo sabía leer la convención colombiana:
 * `.replace(/\.(?=\d{3}\b)/g,'')` borraba únicamente los puntos seguidos de
 * 3 dígitos (dejando vivo el `.00` decimal anglosajón) y luego
 * `.replace(',', '.')` reemplazaba sólo la PRIMERA coma — convertía la coma
 * de miles del formato anglosajón en un segundo punto decimal.
 * `Number('570.000.00')` es `NaN`. 1365 filas reales del owner quedaron en
 * canon 0 por esto.
 *
 * Lo que no se puede leer con certeza vuelve `undefined`, nunca 0 — ver el
 * docstring del archivo.
 */
export function comoEntero(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : undefined

  // U+2212 (−, el «menos» tipográfico que pegan Excel y Numbers) y el guion
  // largo son signo, no basura: si se filtran como basura, «−1.800.000» queda
  // POSITIVO — el signo desaparece en silencio, que es peor que no leer.
  const conSignoAscii = String(v ?? '').replace(/[\u2212\u2013\u2014]/g, '-')
  const limpio = conSignoAscii.replace(/[^\d,.-]/g, '')
  if (limpio === '') return undefined

  const negativo = limpio.startsWith('-')
  const sinSigno = (negativo ? limpio.slice(1) : limpio).replace(/-/g, '')

  const separadores = [...sinSigno.matchAll(/[.,]/g)]
  let parteEntera = sinSigno
  let parteDecimal = ''

  if (separadores.length > 0) {
    const ultimo = separadores[separadores.length - 1]
    const posicion = ultimo.index ?? -1
    const digitosDespues = sinSigno.length - posicion - 1
    const separadorEsDecimal = digitosDespues >= 1 && digitosDespues <= 2
    if (separadorEsDecimal) {
      parteDecimal = sinSigno.slice(posicion + 1)
      parteEntera = sinSigno.slice(0, posicion)
    }
    /*
     * Los separadores que quedan son de MILES y tienen que agrupar de a tres:
     * «1.234.567» sí; «12.34.56» no es un número — es una fecha, una versión o
     * basura, y leerlo como 1234.56 fabricaría un valor plausible de la nada.
     */
    /*
     * El primer grupo puede ser largo («1800.000» viene de «1'800.000» con el
     * apóstrofe ya limpiado); los SIGUIENTES tienen que ser de a tres exacto.
     * «12.34.56» (34 no tiene 3) no es plata y no se lee como si lo fuera.
     */
    const grupos = parteEntera.split(/[.,]/)
    const agrupaBien =
      grupos.length === 1 ||
      (grupos[0].length >= 1 && grupos.slice(1).every((g) => g.length === 3))
    if (!agrupaBien) return undefined
    parteEntera = grupos.join('')
  }

  const parteEnteraValida = /^\d+$/.test(parteEntera)
  const parteDecimalValida = parteDecimal === '' || /^\d+$/.test(parteDecimal)
  if (!parteEnteraValida || !parteDecimalValida) return undefined

  const n = Number(`${parteEntera}.${parteDecimal || '0'}`)
  if (!Number.isFinite(n)) return undefined
  return negativo ? -Math.round(n) : Math.round(n)
}

/**
 * Tope del back (`MAX_COP_POR_MOVIMIENTO`, INT4 de Postgres). Un canon que lo
 * supere no es un canon: es una celda corrida o un número mal pegado, y si
 * viaja, el 400 del DTO tumba el LOTE entero en vez de marcar la fila.
 */
export const MAX_COP_POR_MOVIMIENTO = 2_147_483_647

/**
 * Un porcentaje humano: «10», «10%», «10,5 %», «0». El 0 es un valor real
 * (una comisión del 0% existe) — por eso esto no puede ser `Number(v) ||
 * undefined`, que convierte el 0 en «no hay dato». Fuera de [0, 100] no es
 * un porcentaje: vuelve `undefined`, nunca recortado.
 */
export function comoPorcentaje(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : undefined
  }
  const s = String(v ?? '')
    .replace(/[%\s]/g, '')
    .replace(',', '.')
  if (s === '' || !/^\d+(\.\d+)?$/.test(s)) return undefined
  const n = Number(s)
  return n >= 0 && n <= 100 ? n : undefined
}

/**
 * `03/04/2026` en Colombia es 3 de abril, no 4 de marzo.
 *
 * `new Date('03/04/2026')` lo lee al formato de EE.UU. y devuelve el 4 de
 * marzo: el contrato entero se corre un mes sin que nada falle.
 *
 * Mismo defecto que `comoEntero`: el `s.slice(0, 10)` viejo convertía
 * CUALQUIER texto no reconocido en un string de 10 caracteres con forma de
 * fecha ("15 de marzo de 2025" → "15 de marz") — una fecha inventada que
 * además choca contra `@IsDateString()` en el back y tira TODO el lote con
 * 400 en vez de marcar sólo esa fila como faltante. Ahora sólo se acepta el
 * patrón `dd/mm/aaaa` (o con guiones) o un ISO `aaaa-mm-dd` ya formado;
 * cualquier otra cosa vuelve `undefined`.
 */
/**
 * ¿`a-m-d` existe en el calendario? «2026-02-31» y «2026-13-01» tienen forma
 * de fecha y NO son fechas: si viajan, `@IsDateString()` puede dejarlas pasar
 * y `new Date()` las corre a otro mes o las vuelve Invalid Date río abajo.
 * Una fecha imposible es un faltante, no un contrato corrido de mes.
 */
function fechaExiste(a: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false
  const diasDelMes = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return d <= diasDelMes
}

const armar = (a: number, m: number, d: number): string | undefined =>
  fechaExiste(a, m, d)
    ? `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    : undefined

export function comoFecha(v: unknown): string | undefined {
  if (v instanceof Date) {
    // `new Date('basura')` sigue siendo `instanceof Date`; `.toISOString()`
    // sobre eso LANZA y tumba el armado de todas las filas.
    return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10)
  }
  const s = String(v ?? '').trim()

  // dd/mm/aaaa — también con guiones o puntos. En Colombia el día va primero,
  // SIEMPRE: «03/04/2026» es 3 de abril. No se intenta adivinar mm/dd; si el
  // archivo viene en formato gringo, el mes >12 no existe en el calendario y
  // la fila queda como faltante visible en vez de correrse de mes.
  const conBarras = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/)
  if (conBarras) {
    const [, d, m, a] = conBarras
    return armar(Number(a), Number(m), Number(d))
  }

  // aaaa/mm/dd y aaaa-mm-dd (el ISO también pasa por acá para validar que la
  // fecha exista: la regex de forma no sabe que febrero no tiene 31).
  const conAnioPrimero = s.match(/^(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})$/)
  if (conAnioPrimero) {
    const [, a, m, d] = conAnioPrimero
    return armar(Number(a), Number(m), Number(d))
  }

  /*
   * Todo lo demás vuelve `undefined` y termina como faltante VISIBLE de la
   * fila. Incluye a propósito: años de 2 dígitos («1/6/26» — adivinar el
   * siglo es inventar), seriales de Excel («44713» — el número correcto
   * depende del sistema de fechas del archivo, que acá ya no existe) y texto
   * («Jun 1, 2026»). Ninguno se traduce a una fecha que nadie escribió.
   */
  return undefined
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

export type Periodicidad = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'

const PERIODICIDADES: Record<string, Periodicidad> = {
  mensual: 'MENSUAL',
  bimestral: 'BIMESTRAL',
  trimestral: 'TRIMESTRAL',
  semestral: 'SEMESTRAL',
  anual: 'ANUAL',
}

/**
 * A diferencia de `comoUso`, acá NO hay «ante la duda». El back ya trae su
 * propio default (`MENSUAL`) para cuando el campo falta — inventar uno acá
 * duplicaría esa decisión y, el día que cambie, quedaría un default viejo
 * escondido en el front.
 */
export function comoPeriodicidad(v: unknown): Periodicidad | undefined {
  return PERIODICIDADES[normalizar(String(v ?? ''))]
}

/**
 * El documento como LLAVE, igual que lo guarda la migración de terceros
 * (`back/src/inmobiliaria/migracion-terceros/normalizar-tercero.ts`):
 * mayúsculas y sólo dígitos/letras. «1.004.997.858» y «1004997858» son la
 * misma persona; si la llave difiere, el paso de contratos crea un
 * propietario DUPLICADO del que terceros ya creó — dos fichas, dos pagos.
 */
export function documentoComoLlave(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
}
