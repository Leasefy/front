import type { Pastilla } from './busqueda';
import type { Property } from '@/lib/types/property';

/**
 * La pastilla de la inmobiliaria con su nombre: la búsqueda sólo guarda el id,
 * y el nombre llega con sus inmuebles. Sin inmuebles queda «De una inmobiliaria».
 */
export function conNombres(lista: Pastilla[], propiedades: readonly Property[]): Pastilla[] {
  const nombre = propiedades.find((p) => p.agencyName)?.agencyName;
  return lista.map((p) => (p.clave === 'inmobiliaria' && nombre ? { ...p, etiqueta: `De ${nombre}` } : p));
}
