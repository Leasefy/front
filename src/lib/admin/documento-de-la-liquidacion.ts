/**
 * La liquidación del recaudo de UNA inmobiliaria, en Excel y en PDF (Nico,
 * C2-AGREGADOR Q4, ola E). Sale SIEMPRE del detalle que guardó el back —qué
 * pagos incluye, el bruto y lo que se descontó TAL COMO VINO—, nunca
 * recalculado aquí: las tarifas son modelo de negocio y esta pantalla no las
 * decide.
 *
 * `seccionesDeLaLiquidacion` es puro (lo prueban sus pruebas); exportar carga
 * `xlsx` y `jspdf` sólo al apretar el botón.
 */

import { decimalesEnDocumento, decimalesEnPantalla, seMuestranLosCentavos } from '@/lib/plata/escribir-plata'
import { aCentavos } from '@/lib/plata/plata'
import {
  NOMBRE_DE_QUIEN_CONCILIO,
  NOMBRE_DEL_ESTADO,
  type DetalleDeLaLiquidacion,
} from './recaudo-en-linea'

/**
 * $1.234.567 (con signo menos tipográfico). P8 a («centavos en todo»): los
 * centavos SÓLO si el valor los tiene ($1.234.567,29); un entero, como
 * siempre. Ya no redondea: la plata se trae tal cual, como vino del back.
 */
export function pesos(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const cifra = seMuestranLosCentavos(n)
    ? Math.abs(n).toLocaleString('es-CO', decimalesEnPantalla(n))
    : Math.abs(Math.round(n)).toLocaleString('es-CO')
  const s = `$${cifra}`
  return n < 0 ? `−${s}` : s
}

/**
 * En el PDF el menos va con el guion de siempre: la letra estándar de jsPDF
 * (Helvetica, WinAnsi) no trae el «−» tipográfico y lo pinta como basura.
 *
 * Es un DOCUMENTO (P8 a): con la llave de la tesorería (`conCentavos`), SIEMPRE
 * dos decimales ($1.234.567,00); sin ella, como `pesos`.
 */
export function pesosEnPdf(n: number | null | undefined, conCentavos = false): string {
  if (!conCentavos || n === null || n === undefined || !Number.isFinite(n)) return pesos(n).replace('−', '-')
  const s = `$${Math.abs(n).toLocaleString('es-CO', decimalesEnDocumento(n, true))}`
  return n < 0 ? `-${s}` : s
}

/**
 * La suma exacta al centavo de una columna (con pesos enteros, la de siempre).
 * Un valor que no es número suma como antes (en flotante): nada nuevo se rompe.
 */
function sumaExacta(valores: readonly number[]): number {
  if (!valores.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return valores.reduce((s, v) => s + v, 0)
  }
  return valores.reduce((s, v) => s + aCentavos(v), 0) / 100
}

/** Lo que dice la pantalla, el Excel y el PDF sobre la frecuencia (Nico: «POR DEFINIR»). */
export const FRECUENCIA_POR_DEFINIR = 'Frecuencia del giro: por definir'

export const NOTA_DE_LOS_DESCUENTOS =
  'Los descuentos son los que trae el reporte de Wompi y los que informa Leasefy, tal como vienen: aquí no se calcula ninguna tarifa.'

export interface SeccionDeLaLiquidacion {
  titulo: string
  filas: (string | number)[][]
}

function estadoEnPalabras(l: DetalleDeLaLiquidacion): string {
  if (l.estado === 'conciliada') {
    const quien = l.conciliadaPor ? NOMBRE_DE_QUIEN_CONCILIO[l.conciliadaPor] ?? l.conciliadaPor : null
    const dia = l.conciliadaAt ? l.conciliadaAt.slice(0, 10) : null
    return `Conciliada en el banco de la inmobiliaria${dia ? ` el ${dia}` : ''}${quien ? ` (${quien})` : ''}`
  }
  if (l.estado === 'girada') {
    return `Girada el ${l.giradaEl ?? '—'}${l.referenciaBancariaDelGiro ? ` · comprobante ${l.referenciaBancariaDelGiro}` : ''}`
  }
  return 'Generada: todavía no se ha girado'
}

/** La liquidación en secciones (el mismo contenido para el Excel y el PDF). */
export function seccionesDeLaLiquidacion(l: DetalleDeLaLiquidacion): SeccionDeLaLiquidacion[] {
  const resumen: (string | number)[][] = [
    ['Inmobiliaria', l.inmobiliaria ?? 'Sin nombre'],
    ['NIT', l.nit ?? 'Sin registrar'],
    ['Liquidación', l.numero],
    ['Referencia del giro', l.referenciaDelGiro],
    ['Fecha del giro', l.fechaDelGiro ?? '—'],
    ['Estado', estadoEnPalabras(l)],
    ['Pagos en línea', l.cantidadDePagos],
    ['Generada por', l.creadaPor],
    ['Frecuencia del giro', 'Por definir'],
  ]
  const cuentas: (string | number)[][] = [
    ['Concepto', 'Fuente', 'Valor'],
    ['Recaudado (bruto)', '', l.brutoCop],
    ...l.descuentos.map((d) => [
      d.concepto,
      d.fuente === 'leasefy' ? 'Leasefy' : 'Reporte de Wompi',
      -d.valorCop,
    ]),
    ['Neto que se gira', '', l.netoCop],
  ]
  const pagos: (string | number)[][] = [
    ['Fecha', 'Transacción', 'Referencia', 'Medio', 'Recibo', 'Bruto', 'Comisión', 'IVA', 'Retenciones', 'Neto de Wompi'],
    ...l.pagos.map((p) => [
      p.fecha ?? '—',
      p.transaccionId,
      p.referencia ?? '',
      p.medio ?? '',
      p.reciboNumero ?? '',
      p.brutoCop,
      p.comisionCop,
      p.ivaCop,
      p.retencionesCop,
      p.netoCop,
    ]),
    [
      'Total',
      '',
      '',
      '',
      '',
      // Exactas al centavo («centavos en todo»): en flotante, la suma de
      // valores con centavos llegaba al Excel como 1500000.2900000001.
      sumaExacta(l.pagos.map((p) => p.brutoCop)),
      sumaExacta(l.pagos.map((p) => p.comisionCop)),
      sumaExacta(l.pagos.map((p) => p.ivaCop)),
      sumaExacta(l.pagos.map((p) => p.retencionesCop)),
      sumaExacta(l.pagos.map((p) => p.netoCop)),
    ],
  ]
  return [
    { titulo: 'Resumen', filas: resumen },
    { titulo: 'Bruto, descuentos y neto', filas: [...cuentas, [], [NOTA_DE_LOS_DESCUENTOS]] },
    { titulo: 'Pagos incluidos', filas: pagos },
  ]
}

export function nombreDelArchivoDeLaLiquidacion(l: DetalleDeLaLiquidacion, extension: 'xlsx' | 'pdf'): string {
  const inmobiliaria = (l.inmobiliaria ?? 'inmobiliaria')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `liquidacion-${l.numero}-${inmobiliaria || 'inmobiliaria'}.${extension}`
}

/** El Excel: una hoja por sección, la plata como número (para que sume). */
export async function exportarLiquidacionAExcel(l: DetalleDeLaLiquidacion): Promise<void> {
  const XLSX = await import('xlsx')
  const libro = XLSX.utils.book_new()
  for (const s of seccionesDeLaLiquidacion(l)) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(s.filas), s.titulo.slice(0, 31))
  }
  XLSX.writeFile(libro, nombreDelArchivoDeLaLiquidacion(l, 'xlsx'))
}

/**
 * El PDF: el resumen, las cuentas y la tabla de pagos con columnas alineadas.
 * `conCentavos`: la llave de la tesorería (`usePlataConCentavos`); con ella,
 * toda cifra con dos decimales (P8 a).
 */
export async function exportarLiquidacionAPdf(
  l: DetalleDeLaLiquidacion,
  { conCentavos = false }: { conCentavos?: boolean } = {},
): Promise<void> {
  const { default: JsPdf } = await import('jspdf')
  const doc = new JsPdf({ unit: 'pt', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const margen = 40
  let y = margen
  const pie = () => {
    doc.setFontSize(7)
    doc.text(`Leasefy · liquidación ${l.numero} · ${FRECUENCIA_POR_DEFINIR.toLowerCase()}`, margen, alto - 22)
  }
  const salto = (h: number) => {
    if (y + h > alto - 44) {
      pie()
      doc.addPage()
      y = margen
    }
  }
  const [resumen, cuentas, pagos] = seccionesDeLaLiquidacion(l)

  doc.setFontSize(15)
  doc.text('Liquidación del recaudo en línea', margen, y)
  y += 20
  doc.setFontSize(10)
  doc.text(`${l.inmobiliaria ?? 'Inmobiliaria'} · NIT ${l.nit ?? 'sin registrar'}`, margen, y)
  y += 18

  doc.setFontSize(9)
  for (const [k, v] of resumen.filas) {
    salto(13)
    doc.text(String(k), margen, y)
    const lineas = doc.splitTextToSize(String(v), ancho - margen * 2 - 140) as string[]
    doc.text(lineas, margen + 140, y)
    y += 13 * Math.max(1, lineas.length)
  }
  y += 8

  doc.setFontSize(11)
  salto(16)
  doc.text(cuentas.titulo, margen, y)
  y += 14
  doc.setFontSize(9)
  for (const fila of cuentas.filas) {
    if (fila.length === 0) continue
    if (fila.length === 1) {
      const lineas = doc.splitTextToSize(String(fila[0]), ancho - margen * 2) as string[]
      salto(lineas.length * 11)
      doc.text(lineas, margen, y)
      y += lineas.length * 11
      continue
    }
    salto(13)
    const [concepto, fuente, valor] = fila
    doc.text(String(concepto), margen, y)
    doc.text(String(fuente), margen + 250, y)
    doc.text(typeof valor === 'number' ? pesosEnPdf(valor, conCentavos) : String(valor), ancho - margen, y, { align: 'right' })
    y += 13
  }
  y += 10

  doc.setFontSize(11)
  salto(16)
  doc.text(pagos.titulo, margen, y)
  y += 14
  // Fecha, transacción, recibo y las cinco cifras (la referencia y el medio van en el Excel).
  const columnas = [
    { i: 0, x: margen, alinear: 'left' as const },
    { i: 1, x: margen + 58, alinear: 'left' as const },
    { i: 4, x: margen + 178, alinear: 'left' as const },
    { i: 5, x: margen + 302, alinear: 'right' as const },
    { i: 6, x: margen + 358, alinear: 'right' as const },
    { i: 7, x: margen + 408, alinear: 'right' as const },
    { i: 8, x: margen + 466, alinear: 'right' as const },
    { i: 9, x: ancho - margen, alinear: 'right' as const },
  ]
  doc.setFontSize(7.5)
  pagos.filas.forEach((fila, k) => {
    salto(11)
    for (const c of columnas) {
      const v = fila[c.i]
      const texto = k > 0 && typeof v === 'number' ? pesosEnPdf(v, conCentavos) : String(v ?? '')
      const corto = c.i === 1 && texto.length > 22 ? `${texto.slice(0, 21)}…` : texto
      doc.text(corto, c.x, y, c.alinear === 'right' ? { align: 'right' } : undefined)
    }
    y += 11
  })
  pie()
  doc.save(nombreDelArchivoDeLaLiquidacion(l, 'pdf'))
}
