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
  if (fin === null) {
    return { ...quieto, estado: 'VIGENTE', leyenda: 'Vigente' };
  }

  const ahora = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  if (fin >= ahora) {
    return { ...quieto, estado: 'VIGENTE', leyenda: `Vigente hasta el ${dia(fin)}` };
  }

  const diasVencido = Math.max(1, Math.floor((ahora - fin) / MS_POR_DIA));
  return {
    estado: 'VENCIDO_SIN_RENOVAR',
    vencidoSinRenovar: true,
    vencidoDesde: dia(fin),
    diasVencido,
    leyenda: `Vencido desde el ${dia(fin)} (${diasVencido} ${
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
