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

export function textoOpcional(v: unknown): string | undefined {
  const s = v == null ? '' : String(v).trim()
  return s === '' ? undefined : s
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

  const limpio = String(v ?? '').replace(/[^\d,.-]/g, '')
  if (limpio === '') return undefined

  const negativo = limpio.startsWith('-')
  const sinSigno = negativo ? limpio.slice(1) : limpio

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
    parteEntera = parteEntera.replace(/[.,]/g, '')
  }

  const parteEnteraValida = /^\d+$/.test(parteEntera)
  const parteDecimalValida = parteDecimal === '' || /^\d+$/.test(parteDecimal)
  if (!parteEnteraValida || !parteDecimalValida) return undefined

  const n = Number(`${parteEntera}.${parteDecimal || '0'}`)
  if (!Number.isFinite(n)) return undefined
  return negativo ? -Math.round(n) : Math.round(n)
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

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
export function comoFecha(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  const conBarras = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (conBarras) {
    const [, d, m, a] = conBarras
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return FECHA_ISO.test(s) ? s : undefined
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
