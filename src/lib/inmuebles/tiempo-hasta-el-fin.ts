/**
 * Cuánto falta para que termine el arriendo, dicho como se lee de reojo:
 * «en 4 meses», «en 12 días», «termina hoy», «terminó hace 3 días».
 *
 * La ficha del inmueble mostraba «Fin del contrato 28 de feb de 2027» sin decir
 * que, el 21-10-2026, eso es dentro de cuatro meses (revisión de diseño de la
 * ficha, 21-10-2026). La fecha exacta va al lado; esto es sólo la distancia.
 *
 * Se cuenta por días de CALENDARIO en la hora de quien mira (mismo criterio que
 * `fecha-relativa.ts`, QA-CONT C-09): el back serializa una columna `date` como
 * la medianoche UTC, y contada como instante en Bogotá caía el día anterior.
 */

export type TonoDelFin = 'normal' | 'pronto' | 'vencido';

export interface TiempoHastaElFin {
  /** Días de calendario hasta el fin. Negativo = ya terminó. */
  dias: number;
  texto: string;
  /** `pronto` = faltan 30 días o menos: es lo que hay que mirar ya. */
  tono: TonoDelFin;
}

/** Desde 30 días antes del fin, la fecha pide atención. */
export const DIAS_PARA_QUE_SEA_PRONTO = 30;

function deCalendario(fecha: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Meses COMPLETOS entre dos fechas de calendario (a ≤ b). */
function mesesCompletos(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
}

function distancia(dias: number, meses: number, en: boolean): string {
  if (dias < 60) return en ? plural(dias, 'day', 'days') : plural(dias, 'día', 'días');
  if (meses < 12) return en ? plural(meses, 'month', 'months') : plural(meses, 'mes', 'meses');
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const enAnios = en ? plural(anios, 'year', 'years') : plural(anios, 'año', 'años');
  if (resto === 0) return enAnios;
  const enMeses = en ? plural(resto, 'month', 'months') : plural(resto, 'mes', 'meses');
  return en ? `${enAnios} and ${enMeses}` : `${enAnios} y ${enMeses}`;
}

export function tiempoHastaElFin(fecha: string, locale: string = 'es', ahora: Date = new Date()): TiempoHastaElFin | null {
  const fin = deCalendario(fecha);
  if (!fin) return null;
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const dias = Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
  const en = locale === 'en';

  if (dias === 0) return { dias, texto: en ? 'ends today' : 'termina hoy', tono: 'pronto' };
  if (dias < 0) {
    const texto = distancia(-dias, mesesCompletos(fin, hoy), en);
    return { dias, texto: en ? `ended ${texto} ago` : `terminó hace ${texto}`, tono: 'vencido' };
  }
  const texto = distancia(dias, mesesCompletos(hoy, fin), en);
  return {
    dias,
    texto: en ? `in ${texto}` : `en ${texto}`,
    tono: dias <= DIAS_PARA_QUE_SEA_PRONTO ? 'pronto' : 'normal',
  };
}
