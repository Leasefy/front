/** Helpers puros sobre un asiento ya cargado. */

import type { AsientoContable, OrigenDelAsiento } from '@/lib/api/contabilidad.service';

export const NOMBRE_DE_ORIGEN: Record<OrigenDelAsiento, string> = {
  MANUAL: 'Manual',
  COBRO: 'Cobro',
  RECIBO_DE_CAJA: 'Recibo de caja',
  DISPERSION: 'Dispersión',
  MIGRACION: 'Migración',
};

export const ORIGENES: readonly OrigenDelAsiento[] = [
  'MANUAL',
  'COBRO',
  'RECIBO_DE_CAJA',
  'DISPERSION',
  'MIGRACION',
];

export function totalesDeAsiento(a: Pick<AsientoContable, 'movimientos'>): {
  debitos: number;
  creditos: number;
} {
  let debitos = 0;
  let creditos = 0;
  for (const m of a.movimientos ?? []) {
    debitos += m.debitoCop ?? 0;
    creditos += m.creditoCop ?? 0;
  }
  return { debitos, creditos };
}

/**
 * El color del origen en la tabla, sólo con tokens. Lo hecho a mano se
 * distingue (es lo que alguien decidió); lo automático y lo migrado van en
 * neutro: es el sistema haciendo lo suyo.
 */
export const CLASE_DE_ORIGEN: Record<OrigenDelAsiento, string> = {
  MANUAL: 'bg-primary/10 text-primary',
  COBRO: 'bg-surface-muted text-fg-muted',
  RECIBO_DE_CAJA: 'bg-surface-muted text-fg-muted',
  DISPERSION: 'bg-surface-muted text-fg-muted',
  MIGRACION: 'bg-surface-muted text-fg-muted',
};

/** «2 líneas» / «1 línea», para el sufijo de la descripción. */
export function textoDeLineas(cantidad: number): string {
  return cantidad === 1 ? '1 línea' : `${cantidad} líneas`;
}
