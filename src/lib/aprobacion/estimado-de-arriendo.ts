/**
 * «¿Te podemos arrendar este inmueble?» — el estimado gratis de la ficha.
 *
 * Nico, 2026-09-14: en el marketplace, con datos pequeños, la persona tiene que
 * saber si puede arrendar ESTE inmueble antes de pagar el estudio real con
 * Fianly. La regla que dio: el ingreso tiene que ser al menos 1,5 veces el
 * canon. Con codeudor se suma su ingreso.
 *
 * No es una aprobación: no consulta centrales ni aseguradoras. La respuesta
 * de verdad la da el estudio (`/aprobacion`), al que se llega prellenado.
 */

import type { PropertyType } from '@/lib/types/property';

/** Ingreso mínimo = 1,5 × canon (Nico, 2026-09-14). */
export const MULTIPLO_INGRESO_CANON = 1.5;

export interface EstimadoDeArriendo {
  alcanza: boolean;
  /** Ingreso del titular más el de su codeudor. */
  ingresoTotal: number;
  /** El canon más alto que ese ingreso sostiene. */
  canonMaximo: number;
  /** Cuánto ingreso más haría falta para este canon. 0 si alcanza. */
  faltante: number;
}

export function estimarArriendo({
  canon,
  ingreso,
  ingresoCodeudor = 0,
  multiplo = MULTIPLO_INGRESO_CANON,
}: {
  canon: number;
  ingreso: number;
  ingresoCodeudor?: number;
  multiplo?: number;
}): EstimadoDeArriendo | null {
  // Sin canon o sin ingreso no hay nada que decir: ni «sí» ni «no».
  if (!(canon > 0) || !(ingreso > 0)) return null;
  const ingresoTotal = ingreso + Math.max(0, ingresoCodeudor || 0);
  const necesario = Math.ceil(canon * multiplo);
  const alcanza = ingresoTotal >= necesario;
  return {
    alcanza,
    ingresoTotal,
    canonMaximo: Math.floor(ingresoTotal / multiplo),
    faltante: alcanza ? 0 : necesario - ingresoTotal,
  };
}

export type TipoDelEstudio = 'apartamento' | 'casa' | 'local';

/** El tipo que entiende el estudio. `null` = no se prellena (parqueadero, lote). */
export function tipoParaElEstudio(tipo: PropertyType | null | undefined): TipoDelEstudio | null {
  switch (tipo) {
    case 'apartment':
    case 'studio':
    case 'room':
      return 'apartamento';
    case 'house':
      return 'casa';
    case 'commercial':
    case 'office':
    case 'warehouse':
      return 'local';
    default:
      return null;
  }
}

/** `/aprobacion` con el canon, la ciudad y el tipo de ESTE inmueble. */
export function enlaceAlEstudio({
  canon,
  ciudad,
  tipo,
  paso2 = false,
}: {
  canon: number;
  ciudad?: string | null;
  tipo?: PropertyType | null;
  /** Viene de «Verificar» con un ingreso que alcanza: el estudio es el paso 2. */
  paso2?: boolean;
}): string {
  const q = new URLSearchParams();
  if (paso2) q.set('paso', '2');
  if (canon > 0) q.set('canon', String(Math.round(canon)));
  if (ciudad?.trim()) q.set('ciudad', ciudad.trim());
  const t = tipoParaElEstudio(tipo);
  if (t) q.set('tipo', t);
  const s = q.toString();
  return s ? `/aprobacion?${s}` : '/aprobacion';
}
