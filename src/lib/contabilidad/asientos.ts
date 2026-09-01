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
