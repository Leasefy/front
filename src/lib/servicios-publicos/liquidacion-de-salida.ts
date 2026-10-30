/**
 * LA LIQUIDACIÓN DE SERVICIOS AL ENTREGAR EL INMUEBLE (Portofino, 29-10-2026), lado de la pantalla. PURO.
 *
 * Su Excel «Liquidación entrega inmueble»: cada corte pendiente hasta la fecha de entrega (los que no han llegado,
 * ESTIMADOS con el promedio de las facturas anteriores) + trámites bancarios − saldo a favor = el anticipo de
 * servicios que se le carga al contrato. El back arma las filas (`GET …/liquidacion-de-salida`); aquí la persona las
 * corrige y el total se recalcula en vivo con la MISMA regla del back (`liquidacion-de-salida.ts` del back):
 *   · si cambian los días, valor = días × tarifa por día (la fila deja de estar «a mano»);
 *   · si escribe el valor, ese valor manda («corregido a mano»);
 *   · total = subtotal + trámites − saldo a favor; nunca negativo: lo que sobra es para DEVOLVERLE.
 * Al cargar, el back vuelve a hacer la cuenta con las filas tal cual (`valorCop` manda).
 */
import { formatCurrency } from '@/lib/format';
import type { CargaDeLaSalida, FilaDeLaSalida, GrupoDeLaSalida } from '@/lib/api/servicios-publicos.service';
import { diasEntre, mesSiguiente } from './corte-de-la-factura';

/** Un corte de más de dos meses en una fila es un error de digitación (el tope del back). */
export const DIAS_MAXIMOS_DE_UNA_FILA = 62;
/** El tope de los trámites bancarios del back. */
export const TRAMITES_MAXIMOS_COP = 10_000_000;
/** El tope de una fila y del saldo a favor (el valor máximo de una factura del back). */
export const VALOR_MAXIMO_COP = 100_000_000;

/** Una fila en la pantalla: la del back con su llave y si la agregó la persona. */
export interface FilaEditable extends FilaDeLaSalida {
  clave: string;
  /** La agregó la persona (sin historial con qué estimar). */
  agregada?: boolean;
}

export function filasEditables(filas: readonly FilaDeLaSalida[]): FilaEditable[] {
  return filas.map((f, i) => ({ ...f, clave: `${f.grupo}|${f.corteDesde}|${i}` }));
}

/** Por qué no sirven esos días, o `null`. */
export function problemaDeLosDias(dias: number): string | null {
  if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_MAXIMOS_DE_UNA_FILA) return `Los días van de 1 a ${DIAS_MAXIMOS_DE_UNA_FILA}.`;
  return null;
}

/** Cambia los días: con tarifa por día, el valor = días × tarifa. */
export function conDias(f: FilaEditable, dias: number): FilaEditable {
  if (f.tarifaDiariaCop !== null && f.tarifaDiariaCop > 0) return { ...f, dias, valorCop: dias * f.tarifaDiariaCop, valorAMano: false };
  return { ...f, dias };
}

/** Escribe el valor a mano: ese manda. */
export function conValor(f: FilaEditable, valorCop: number): FilaEditable {
  const calculado = f.tarifaDiariaCop !== null && f.tarifaDiariaCop > 0 ? f.dias * f.tarifaDiariaCop : null;
  return { ...f, valorCop, valorAMano: calculado === null ? f.valorAMano || f.agregada === true : calculado !== valorCop };
}

/** Una fila que agrega la persona (sin historial): el corte y el valor que tiene en la mano. */
export function filaAgregada(p: { corteDesde: string; corteHasta: string; valorCop: number; grupo?: GrupoDeLaSalida | null }, n: number): FilaEditable {
  const servicios = p.grupo?.servicios ?? [];
  return {
    clave: `a-mano|${p.corteDesde}|${n}`,
    agregada: true,
    grupo: p.grupo?.grupo ?? 'A_MANO',
    servicios,
    nombreDelServicio: p.grupo?.nombreDelServicio ?? 'Servicios públicos',
    mesFacturado: mesSiguiente(p.corteHasta.slice(0, 7)),
    corteDesde: p.corteDesde,
    corteHasta: p.corteHasta,
    dias: diasEntre(p.corteDesde, p.corteHasta),
    tarifaDiariaCop: null,
    valorCop: p.valorCop,
    estimado: true,
    valorAMano: true,
    facturaId: null,
  };
}

export interface TotalDeLaSalida {
  subtotalCop: number;
  tramitesCop: number;
  saldoAFavorCop: number;
  /** Lo que se le cobra al inquilino (nunca negativo). */
  totalCop: number;
  /** Lo que hay que devolverle si el saldo a favor pasa lo demás. */
  aDevolverCop: number;
}

/** Subtotal + trámites − saldo a favor (la regla del back). */
export function totalDeLaSalida(filas: ReadonlyArray<Pick<FilaDeLaSalida, 'valorCop'>>, tramitesCop: number, saldoAFavorCop: number): TotalDeLaSalida {
  const subtotalCop = filas.reduce((s, f) => s + f.valorCop, 0);
  const neto = subtotalCop + tramitesCop - saldoAFavorCop;
  return { subtotalCop, tramitesCop, saldoAFavorCop, totalCop: Math.max(0, neto), aDevolverCop: Math.max(0, -neto) };
}

/** La frase del total, con las cifras de la pantalla. */
export function fraseDelTotal(t: TotalDeLaSalida, meses: number): string {
  const cuantos = meses === 1 ? '1 mes de servicios' : `${meses} meses de servicios`;
  const partes = [`${cuantos} (${formatCurrency(t.subtotalCop)})`];
  if (t.tramitesCop > 0) partes.push(`trámites bancarios ${formatCurrency(t.tramitesCop)}`);
  if (t.aDevolverCop > 0) {
    return `No hay nada que cobrarle: su saldo a favor (${formatCurrency(t.saldoAFavorCop)}) pasa lo que debe (${partes.join(' + ')}). Hay que devolverle ${formatCurrency(t.aDevolverCop)}.`;
  }
  const saldo = t.saldoAFavorCop > 0 ? ` − su saldo a favor ${formatCurrency(t.saldoAFavorCop)}` : '';
  return `Se le cobran al inquilino ${formatCurrency(t.totalCop)}: ${partes.join(' + ')}${saldo}.`;
}

/** «Promedio de 6 facturas anteriores: $ 6.893 por día (± $ 410)», o por qué no hay con qué estimar. */
export function explicacionDelEstimado(g: Pick<GrupoDeLaSalida, 'tarifa'> | null | undefined): string {
  if (!g || g.tarifa.tarifaDiariaCop === null) return 'Sin facturas anteriores con qué estimar: escribe el valor.';
  const n = g.tarifa.facturasUsadas;
  const cuantas = n === 1 ? 'la factura anterior' : `${n} facturas anteriores`;
  const desviacion = g.tarifa.desviacionCop && g.tarifa.desviacionCop > 0 ? ` (± ${formatCurrency(g.tarifa.desviacionCop)})` : '';
  return `Promedio de ${cuantas}: ${formatCurrency(g.tarifa.tarifaDiariaCop)} por día${desviacion}.`;
}

/** La fila tal cual la espera el POST (las claves del GET van de vuelta; `valorCop` manda). */
export function filaParaCargar(f: FilaEditable): CargaDeLaSalida['filas'][number] {
  return {
    grupo: f.grupo,
    servicios: f.servicios.length > 0 ? f.servicios : undefined,
    nombreDelServicio: f.nombreDelServicio,
    mesFacturado: f.mesFacturado,
    corteDesde: f.corteDesde,
    corteHasta: f.corteHasta,
    dias: f.dias,
    tarifaDiariaCop: f.tarifaDiariaCop,
    valorCop: f.valorCop,
    estimado: f.estimado,
    valorAMano: f.valorAMano,
    facturaId: f.facturaId,
  };
}
