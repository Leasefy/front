/**
 * Vigencia del contrato en la pantalla — ¿corre, venció, o lo terminaron?
 *
 * 🔴 Es el ESPEJO de `src/contracts/vigencia/vigencia-del-contrato.ts` en el
 * back, con la misma regla y los mismos nombres. Se replica —y no se pide por
 * API— porque el listado pinta 2.800 filas de una lectura que ya tiene la
 * fecha de fin: una llamada más por fila para saber si un número es menor que
 * otro sería absurdo. Si la regla cambia, cambian los DOS archivos; hay un
 * test de cada lado.
 *
 * ── El caso que esto arregla (auditoría del 2026-09-13, N2) ────────────────
 *
 * Un contrato cuya fecha de fin ya pasó se queda `active` y la pantalla lo
 * pinta «Activo» en verde para siempre: no hay ningún proceso que lo mueva, y
 * mientras tanto se le sigue generando cobro. No se vence solo a propósito (la
 * prórroga tácita es la regla en Colombia), pero tiene que VERSE.
 */

import type { Contract, ContractStatus } from '@/lib/types/contract';

export type EstadoDeVigencia =
  | 'VIGENTE'
  | 'VENCIDO_SIN_RENOVAR'
  | 'TERMINADO_POR_VENCIMIENTO'
  | 'TERMINADO_ANTICIPADAMENTE'
  | 'NO_VIGENTE';

export interface Vigencia {
  estado: EstadoDeVigencia;
  /** Lo único que la tabla necesita para resaltar la fila. */
  vencidoSinRenovar: boolean;
  /** `'2026-08-31'`, o `null` si no está vencido. */
  vencidoDesde: string | null;
  diasVencido: number;
  /** Una línea lista para mostrar. */
  leyenda: string;
}

/** Lo mínimo que hace falta saber. El listado no trae el contrato entero. */
export interface ContratoParaVigencia {
  status: ContractStatus;
  /** ISO del back (`'2026-08-31'` o `'...T00:00:00.000Z'`). */
  endDate?: string | null;
  /** Con fecha, lo terminaron antes de tiempo. Ausente = la columna no viajó. */
  terminadoEn?: string | null;
  /** D8: el inicio, para saber si el fin cae en su aniversario. */
  startDate?: string | null;
  /** D8: la fecha de cartera, la otra base del aniversario. */
  fechaDeCartera?: string | null;
}

const ESTADOS_QUE_CORREN: ContractStatus[] = ['active', 'signed'];
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * 🔴 Se compara por DÍA, nunca por instante. `endDate` es una columna `@db.Date`
 * y el back la serializa como `...T00:00:00.000Z`; en Bogotá (UTC−5) un
 * `new Date(...)` leído en hora local devuelve el día anterior, y un contrato
 * que vence hoy aparecería vencido desde ayer.
 */
function comoDiaUtc(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00.000Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** `'2026-08-31'` — el mismo formato con el que viaja. */
function dia(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function diasDelMesUtc(anio: number, mes0: number): number {
  return new Date(Date.UTC(anio, mes0 + 1, 0)).getUTCDate();
}

/** ¿`fin` es aniversario mensual de `base`? Mismo criterio que `esAniversarioMensual` del back. */
function esAniversarioMensual(base: number, fin: number): boolean {
  if (fin <= base) return false;
  const b = new Date(base);
  const f = new Date(fin);
  if (f.getUTCDate() === b.getUTCDate()) return true;
  const ultimo = diasDelMesUtc(f.getUTCFullYear(), f.getUTCMonth());
  return b.getUTCDate() > ultimo && f.getUTCDate() === ultimo;
}

/**
 * 🔴 D8 (Nico, 17-09): el ÚLTIMO día que rige el contrato. Un fin que cae en el
 * aniversario del inicio (o de la fecha de cartera) termina un día antes: «del
 * 5-dic-2025 al 5-dic-2026» rige hasta el 4-dic-2026. Espejo de
 * `ultimoDiaDelContrato` (back, `vigencia/termino-del-contrato.ts`).
 */
export function ultimoDiaDelContrato(contrato: {
  endDate?: string | null;
  startDate?: string | null;
  fechaDeCartera?: string | null;
}): string | null {
  const fin = comoDiaUtc(contrato.endDate);
  if (fin === null) return null;
  const inicio = comoDiaUtc(contrato.startDate);
  const cartera = comoDiaUtc(contrato.fechaDeCartera) ?? inicio;
  const bases = [inicio, cartera].filter((x): x is number => x !== null);
  return bases.some((b) => esAniversarioMensual(b, fin)) ? dia(fin - MS_POR_DIA) : dia(fin);
}

export function vigenciaDelContrato(
  contrato: ContratoParaVigencia,
  hoy: Date = new Date(),
): Vigencia {
  const quieto = { vencidoSinRenovar: false, vencidoDesde: null, diasVencido: 0 };

  const terminado = comoDiaUtc(contrato.terminadoEn);
  if (terminado !== null) {
    return {
      ...quieto,
      estado: 'TERMINADO_ANTICIPADAMENTE',
      leyenda: `Terminado el ${dia(terminado)}`,
    };
  }

  const fin = comoDiaUtc(contrato.endDate);
  // D8: vigente hasta el último día que rige, no hasta el fin como está escrito.
  const ultimoDia = comoDiaUtc(ultimoDiaDelContrato(contrato));

  if (contrato.status === 'expired') {
    return {
      ...quieto,
      estado: 'TERMINADO_POR_VENCIMIENTO',
      leyenda: fin !== null ? `Terminado el ${dia(fin)}` : 'Terminado',
    };
  }

  if (!ESTADOS_QUE_CORREN.includes(contrato.status)) {
    return { ...quieto, estado: 'NO_VIGENTE', leyenda: 'Sin vigencia' };
  }

  // Un contrato migrado puede no tener fecha de fin: sin ella no hay de qué
  // decir que venció.
  if (ultimoDia === null) {
    return { ...quieto, estado: 'VIGENTE', leyenda: 'Vigente' };
  }

  const ahora = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  if (ultimoDia >= ahora) {
    return { ...quieto, estado: 'VIGENTE', leyenda: `Vigente hasta el ${dia(ultimoDia)}` };
  }

  const diasVencido = Math.max(1, Math.floor((ahora - ultimoDia) / MS_POR_DIA));
  return {
    estado: 'VENCIDO_SIN_RENOVAR',
    vencidoSinRenovar: true,
    vencidoDesde: dia(ultimoDia),
    diasVencido,
    leyenda: `Vencido desde el ${dia(ultimoDia)} (${diasVencido} ${
      diasVencido === 1 ? 'día' : 'días'
    })`,
  };
}

/**
 * La etiqueta del estado, ya corregida por la vigencia.
 *
 * `CONTRACT_STATUS_LABELS` sigue siendo la fuente para el estado crudo; esto
 * es lo que la persona tiene que leer: un `active` vencido dice «Vencido», no
 * «Activo», y un `expired` que alguien terminó dice «Terminado», no «Expirado».
 */
export function etiquetaDeVigencia(v: Vigencia, etiquetaDelEstado: string): string {
  if (v.estado === 'VENCIDO_SIN_RENOVAR') return 'Vencido';
  if (v.estado === 'TERMINADO_ANTICIPADAMENTE') return 'Terminado';
  if (v.estado === 'TERMINADO_POR_VENCIMIENTO') return 'Terminado';
  return etiquetaDelEstado;
}

/** El color del chip. Un vencido es un aviso, no un estado neutro. */
export function colorDeVigencia(v: Vigencia, colorDelEstado: string): string {
  return v.vencidoSinRenovar
    ? 'bg-plan-status-yellow-bg text-plan-status-yellow'
    : colorDelEstado;
}

/** ¿Este contrato puede terminarse antes de tiempo? */
export function puedeTerminarse(contrato: Pick<Contract, 'status'>): boolean {
  return contrato.status === 'active';
}

/** ¿Se le puede registrar una cesión? Sólo sobre uno que está corriendo. */
export function puedeCederse(contrato: Pick<Contract, 'status'>): boolean {
  return contrato.status === 'active' || contrato.status === 'signed';
}
