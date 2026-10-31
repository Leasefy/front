import type { PortafolioRow } from '@/lib/types/inmobiliaria';

/**
 * Las especificaciones del inmueble en la tabla del portafolio (Nico, 31-10-2026: «una columna con especificaciones…
 * mostrarlas todas» y «más filtros, muchos más»). Viajan planas con cada fila (back `especificaciones-del-inmueble.ts`).
 */
export interface EspecificacionesDelInmueble {
  habitaciones: number | null;
  banos: number | null;
  areaM2: number | null;
  parqueaderos: number | null;
  estrato: number | null;
  /** Llaves de las características (`lib/inmuebles/caracteristicas.ts`). */
  caracteristicas: string[];
}

/** «3 hab · 2 baños · 84 m² · 1 parq. · Estrato 4»; sin datos, vacío. */
export function resumenDeEspecificaciones(e: EspecificacionesDelInmueble | null | undefined): string {
  if (!e) return '';
  const partes: string[] = [];
  if (e.habitaciones != null) partes.push(`${e.habitaciones} hab`);
  if (e.banos != null) partes.push(`${e.banos} ${e.banos === 1 ? 'baño' : 'baños'}`);
  if (e.areaM2 != null) partes.push(`${e.areaM2.toLocaleString('es-CO')} m²`);
  if (e.parqueaderos != null && e.parqueaderos > 0) partes.push(`${e.parqueaderos} parq.`);
  if (e.estrato != null) partes.push(`Estrato ${e.estrato}`);
  return partes.join(' · ');
}

const PARQUEADERO = new Set(['parking', 'parking_private', 'parking_communal']);
const CUARTO_UTIL = new Set(['storage', 'storage_private', 'storage_communal']);

/** Los filtros de especificaciones (en «Filtros (n)» de la tabla). Todo opcional: sin poner, no filtra. */
export interface FiltrosDeEspecificaciones {
  negocio?: 'rent' | 'sale';
  habitacionesMin?: number;
  banosMin?: number;
  estrato?: number;
  areaMin?: number;
  canonMin?: number;
  canonMax?: number;
  parqueadero?: boolean;
  cuartoUtil?: boolean;
  amoblado?: boolean;
  /** Una característica cualquiera (llave). */
  caracteristica?: string;
}

export function cuantosFiltrosDeEspecificaciones(f: FiltrosDeEspecificaciones | undefined): number {
  if (!f) return 0;
  return Object.values(f).filter((v) => v !== undefined && v !== false && v !== '').length;
}

/** ¿La fila cumple los filtros? Un dato que no está (sin habitaciones registradas) NO cumple un mínimo. */
export function cumpleLasEspecificaciones(row: PortafolioRow, f: FiltrosDeEspecificaciones | undefined): boolean {
  if (!f || cuantosFiltrosDeEspecificaciones(f) === 0) return true;
  const e = row.especificaciones ?? null;
  const caracteristicas = new Set(e?.caracteristicas ?? []);
  const negocio = row.listingType ?? 'rent';
  if (f.negocio && negocio !== f.negocio) return false;
  if (f.habitacionesMin != null && !(e?.habitaciones != null && e.habitaciones >= f.habitacionesMin)) return false;
  if (f.banosMin != null && !(e?.banos != null && e.banos >= f.banosMin)) return false;
  if (f.estrato != null && e?.estrato !== f.estrato) return false;
  if (f.areaMin != null && !(e?.areaM2 != null && e.areaM2 >= f.areaMin)) return false;
  const canon = row.monthlyRent && row.monthlyRent > 0 ? row.monthlyRent : null;
  if (f.canonMin != null && !(canon != null && canon >= f.canonMin)) return false;
  if (f.canonMax != null && !(canon != null && canon <= f.canonMax)) return false;
  if (f.parqueadero && !((e?.parqueaderos ?? 0) > 0 || [...caracteristicas].some((c) => PARQUEADERO.has(c)))) return false;
  if (f.cuartoUtil && ![...caracteristicas].some((c) => CUARTO_UTIL.has(c))) return false;
  if (f.amoblado && !caracteristicas.has('furnished')) return false;
  if (f.caracteristica && !caracteristicas.has(f.caracteristica)) return false;
  return true;
}
