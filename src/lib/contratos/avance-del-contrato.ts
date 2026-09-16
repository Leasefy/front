/**
 * Cuánto va del contrato, contado por FECHAS.
 *
 * Nico (2026-09-16), mirando la ficha: «algo más visual en cuánto va de avance
 * de su contrato». La respuesta es «mes 13 de 24» con una línea que va del
 * inicio al fin y dice dónde está hoy.
 *
 * ── Por qué por fechas y no por cuotas pagadas ──────────────────────────────
 * Las fechas son exactas y existen en todo contrato que las tenga cargadas.
 * «Cuotas pagadas de N» es otra pregunta —cómo va con la plata— y vive en el
 * estado de cuenta, que puede no haber llegado o no existir todavía (un
 * contrato sin activar no tiene cuotas). Mezclarlas en una sola barra diría
 * que un inquilino atrasado va «por la mitad del contrato» cuando lo que va
 * por la mitad es el tiempo.
 *
 * ── Cómo se cuentan los meses ───────────────────────────────────────────────
 * Por PERÍODOS de calendario desde el inicio, no dividiendo días entre 30:
 * un contrato del 21-ago-2025 al 20-ago-2027 tiene 24 períodos (21-ago,
 * 21-sep, …, 21-jul-2027) y el 16-sep-2026 cae en el 13.º. Un período que
 * empieza el mismo día del fin no cuenta: el contrato ya terminó ese día.
 *
 * Puro y sin `new Date()` adentro: `hoy` entra por parámetro, como en
 * `vigencia.ts`, para poder fijar los bordes con números a mano.
 */

export type TramoDelContrato =
  /** Sin inicio o sin fin cargados (un migrado incompleto), o con el fin antes del inicio. */
  | 'SIN_FECHAS'
  /** Hoy es anterior al inicio. */
  | 'POR_EMPEZAR'
  /** Hoy está entre el inicio y el fin, los dos incluidos. */
  | 'EN_CURSO'
  /** Hoy es posterior al fin. */
  | 'CUMPLIDO';

export interface AvanceDelContrato {
  tramo: TramoDelContrato;
  /** `YYYY-MM-DD`. */
  inicio: string | null;
  /** `YYYY-MM-DD`. */
  fin: string | null;
  /** Períodos mensuales del contrato. `0` sin fechas. */
  meses: number;
  /** El período en que cae hoy (1…`meses`). `0` antes de empezar; `meses` después del fin. */
  mesActual: number;
  /** Los períodos que quedan después del actual. */
  mesesRestantes: number;
  /** 0–1: la fracción del tiempo del contrato que ya pasó. */
  fraccion: number;
  /** Días de hoy al fin. Negativo cuando el fin ya pasó. `null` sin fechas. */
  diasParaElFin: number | null;
  /** Días de hoy al inicio. Positivo cuando todavía no empieza. `null` sin fechas. */
  diasParaEmpezar: number | null;
}

const UN_DIA = 24 * 60 * 60 * 1000;
/** 100 años de períodos: un tope para no girar para siempre sobre un dato roto. */
const TOPE_DE_MESES = 1200;

/** `'2027-08-20'` o `'2027-08-20T00:00:00.000Z'` → `'2027-08-20'`. */
export function soloElDia(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** El día como número, sin huso horario: se arma en UTC a mano. */
function numeroDeDia(dia: string): number {
  const [a, m, d] = dia.split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / UN_DIA);
}

/** Días entre dos `YYYY-MM-DD` (`hasta − desde`). */
export function diasEntreFechas(desde: string, hasta: string): number {
  return numeroDeDia(hasta) - numeroDeDia(desde);
}

/**
 * El inicio del período `k`: `k` meses después del inicio, con el día
 * recortado al último del mes (un contrato del 31 cae el 28 en febrero).
 */
function inicioDelPeriodo(inicio: string, k: number): number {
  const [a, m, d] = inicio.split('-').map(Number);
  const mesesDesdeCero = m - 1 + k;
  const anio = a + Math.floor(mesesDesdeCero / 12);
  const mes = ((mesesDesdeCero % 12) + 12) % 12;
  const ultimoDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(anio, mes, Math.min(d, ultimoDelMes)) / UN_DIA);
}

const SIN_FECHAS = (inicio: string | null, fin: string | null): AvanceDelContrato => ({
  tramo: 'SIN_FECHAS',
  inicio,
  fin,
  meses: 0,
  mesActual: 0,
  mesesRestantes: 0,
  fraccion: 0,
  diasParaElFin: null,
  diasParaEmpezar: null,
});

export function avanceDelContrato(args: {
  inicio: string | null | undefined;
  fin: string | null | undefined;
  /** `YYYY-MM-DD`: el día civil de hoy. */
  hoy: string;
}): AvanceDelContrato {
  const inicio = soloElDia(args.inicio);
  const fin = soloElDia(args.fin);
  if (!inicio || !fin) return SIN_FECHAS(inicio, fin);

  const nInicio = numeroDeDia(inicio);
  const nFin = numeroDeDia(fin);
  const nHoy = numeroDeDia(args.hoy);
  if (nFin < nInicio) return SIN_FECHAS(inicio, fin);

  // Períodos que empiezan ANTES del fin. Uno de un solo día (inicio = fin) es 1.
  let meses = 0;
  while (meses < TOPE_DE_MESES && inicioDelPeriodo(inicio, meses) < nFin) meses += 1;
  meses = Math.max(1, meses);

  // El período de hoy: cuántos ya empezaron, sin pasarse de los que hay.
  let empezados = 0;
  while (empezados < meses && inicioDelPeriodo(inicio, empezados) <= nHoy) empezados += 1;

  const tramo: TramoDelContrato =
    nHoy < nInicio ? 'POR_EMPEZAR' : nHoy > nFin ? 'CUMPLIDO' : 'EN_CURSO';

  const duracion = nFin - nInicio;
  const fraccion =
    duracion === 0
      ? nHoy >= nInicio ? 1 : 0
      : Math.min(1, Math.max(0, (nHoy - nInicio) / duracion));

  const mesActual = tramo === 'POR_EMPEZAR' ? 0 : tramo === 'CUMPLIDO' ? meses : empezados;

  return {
    tramo,
    inicio,
    fin,
    meses,
    mesActual,
    mesesRestantes: Math.max(0, meses - mesActual),
    fraccion,
    diasParaElFin: nFin - nHoy,
    diasParaEmpezar: nInicio - nHoy,
  };
}
