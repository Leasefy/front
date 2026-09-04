/**
 * Las líneas de la cuenta de cobro — lo que se le muestra al inquilino.
 *
 * Es la misma aritmética que `DesgloseAdeudado`, sacada a una función pura
 * para poder imprimirla en un documento y probarla sin pintar nada:
 *
 *   - Con `conceptos` del back (agencia con el motor v2) cada línea es un
 *     concepto: canon, administración, lo que agrega el contrato, IVA,
 *     retenciones, intereses y gasto administrativo de mora.
 *   - Sin `conceptos` (agencia sin el motor) NO se inventan líneas: se
 *     separa lo único que el cobro ya trae suelto — canon, administración y
 *     lo que haya de mora en `lateFee`.
 *
 * 🔴 `valorCop` viene SIEMPRE positivo. El signo lo decide `resta`. Acá el
 * `valorCop` de la línea que sale YA lleva el signo, para que quien pinte
 * la cuenta no tenga que volver a acordarse de la bandera.
 */

import type { Cobro } from '@/lib/types/inmobiliaria';
import {
  enOrden,
  sumarConceptos,
  type ConceptoDelCobro,
  type TipoDeConcepto,
} from '@/lib/api/recibos-de-caja.types';

/** Un peso de diferencia es redondeo; más que eso es un cobro que no cuadra. */
const TOLERANCIA_COP = 1;

const TIPOS_DE_MORA: ReadonlySet<TipoDeConcepto> = new Set<TipoDeConcepto>([
  'INTERES_DE_MORA',
  'GASTO_ADMINISTRATIVO',
]);

export interface LineaDeLaCuenta {
  id: string;
  tipo: TipoDeConcepto;
  /**
   * El nombre que viene del back; vacío si la línea no lo trae (entonces el
   * que pinta usa la etiqueta del tipo, que vive en i18n).
   */
  nombre: string;
  /** CON signo: negativo si la línea resta (prorrateo, retenciones). */
  valorCop: number;
  resta: boolean;
  /** Intereses o gasto administrativo: se marca aparte en el documento. */
  esDeMora: boolean;
}

export interface CuentaDeCobroCalculada {
  lineas: LineaDeLaCuenta[];
  /** Si las líneas salieron de `conceptos` o de los enteros del cobro. */
  detallada: boolean;
  /** Lo que suma (sin las que restan). */
  subtotalCop: number;
  /** Lo que resta, en positivo. */
  descuentosCop: number;
  /** Suma − descuentos: el total de la cuenta. */
  totalCop: number;
  abonadoCop: number;
  saldoCop: number;
  /**
   * Las líneas no cuadran con `totalWithFees` del cobro. Se dice, no se
   * esconde: un documento que muestra un total que no es el que se cobra es
   * peor que ninguno.
   */
  descuadra: boolean;
}

function lineaDeConcepto(c: ConceptoDelCobro): LineaDeLaCuenta {
  return {
    id: c.id,
    tipo: c.tipo,
    nombre: c.nombre?.trim() ?? '',
    valorCop: c.resta ? -c.valorCop : c.valorCop,
    resta: c.resta,
    esDeMora: TIPOS_DE_MORA.has(c.tipo),
  };
}

/** Lo que se puede separar de un cobro que no trae desglose. */
function lineasDeRespaldo(cobro: Cobro): LineaDeLaCuenta[] {
  const lineas: LineaDeLaCuenta[] = [
    {
      id: 'canon',
      tipo: 'CANON',
      nombre: '',
      valorCop: cobro.rentAmount,
      resta: false,
      esDeMora: false,
    },
  ];
  if (cobro.adminAmount > 0) {
    lineas.push({
      id: 'administracion',
      tipo: 'ADMINISTRACION',
      nombre: '',
      valorCop: cobro.adminAmount,
      resta: false,
      esDeMora: false,
    });
  }
  if (cobro.lateFee > 0) {
    lineas.push({
      id: 'mora',
      tipo: 'INTERES_DE_MORA',
      nombre: '',
      valorCop: cobro.lateFee,
      resta: false,
      esDeMora: true,
    });
  }
  return lineas;
}

/**
 * Arma la cuenta a partir del cobro y sus conceptos (si los tiene).
 *
 * `abonadoCop` y `saldoCop` salen de `paidAmount` / `pendingAmount` del
 * cobro, no de sumar recibos: el back ya recompuso el cobro con cada recibo
 * (y con cada anulación), y es la cifra contra la que se concilia.
 */
export function lineasDeLaCuenta(
  cobro: Cobro,
  conceptos?: readonly ConceptoDelCobro[] | null,
): CuentaDeCobroCalculada {
  const detallada = Array.isArray(conceptos) && conceptos.length > 0;

  if (!detallada) {
    const lineas = lineasDeRespaldo(cobro);
    const subtotalCop = lineas.reduce((s, l) => s + l.valorCop, 0);
    return {
      lineas,
      detallada: false,
      subtotalCop,
      descuentosCop: 0,
      totalCop: cobro.totalWithFees,
      abonadoCop: cobro.paidAmount,
      saldoCop: cobro.pendingAmount,
      // Sin desglose el total ES el del cobro: no hay contra qué descuadrar.
      descuadra: false,
    };
  }

  const ordenados = enOrden(conceptos as readonly ConceptoDelCobro[]);
  const { suma, resta, total } = sumarConceptos(ordenados);
  return {
    lineas: ordenados.map(lineaDeConcepto),
    detallada: true,
    subtotalCop: suma,
    descuentosCop: resta,
    totalCop: total,
    abonadoCop: cobro.paidAmount,
    saldoCop: cobro.pendingAmount,
    descuadra: Math.abs(total - cobro.totalWithFees) > TOLERANCIA_COP,
  };
}

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MESES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * «Septiembre de 2026» a partir de `'2026-09'`. Sin `Date`: un `new Date('2026-09')`
 * cae en UTC y en Colombia (UTC−5) se convierte en agosto a la noche.
 */
export function periodoEnPalabras(month: string, locale: 'es' | 'en' = 'es'): string {
  const [anio, mes] = month.split('-').map(Number);
  const nombres = locale === 'en' ? MESES_EN : MESES_ES;
  const nombre = nombres[(mes ?? 0) - 1];
  if (!nombre || !Number.isFinite(anio)) return month;
  const capitalizado = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return locale === 'en' ? `${capitalizado} ${anio}` : `${capitalizado} de ${anio}`;
}

/**
 * «4 de septiembre de 2026» a partir de `'2026-09-04'` (o de un ISO con hora).
 * Se lee la fecha por partes por la misma razón: un `Date` de una fecha sin
 * hora se interpreta en UTC y en Colombia amanece un día antes.
 */
export function fechaEnPalabras(fecha: string, locale: 'es' | 'en' = 'es'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  const [, a, mm, d] = m;
  const nombres = locale === 'en' ? MESES_EN : MESES_ES;
  const nombre = nombres[Number(mm) - 1];
  if (!nombre) return fecha;
  return locale === 'en'
    ? `${nombre} ${Number(d)}, ${a}`
    : `${Number(d)} de ${nombre} de ${a}`;
}
