import { propertiesApi } from '@/lib/api/properties.service';
import { absorber, type Busqueda, type FiltrosEntendidos } from './busqueda';

/**
 * Afinar una búsqueda en la conversación (opción 1, 09-10-2026): lo ÚLTIMO
 * que se dice gana. «Casa» después de «apartamento en Laureles» cambia el
 * tipo; «en Belén» cambia el barrio; «con parqueadero» se suma.
 *
 * Mandar el texto nuevo junto con los filtros de antes no sirve: en el back
 * lo explícito gana sobre lo entendido, así que «casa» se perdía. Por eso se
 * le pregunta primero al back qué entiende del texto nuevo SOLO (una consulta
 * de un resultado) y se mezcla aquí: lo nuevo reemplaza, las comodidades se
 * suman. Si no se entiende nada (o falla), va como texto, como antes.
 */
export function mezclar(base: Busqueda, nuevos: FiltrosEntendidos): Busqueda {
  const deLoNuevo = absorber({}, nuevos);
  const comodidades = [...new Set([...(base.comodidades ?? []), ...(deLoNuevo.comodidades ?? [])])];
  const mezcla: Busqueda = { ...base, ...deLoNuevo };
  if (comodidades.length > 0) mezcla.comodidades = comodidades;
  return mezcla;
}

type Pedir = (f: { naturalQuery: string; limit: number }) => Promise<{ meta: { filtrosEntendidos?: FiltrosEntendidos } }>;

export async function afinarCon(
  previa: Busqueda,
  entendidosPrevios: FiltrosEntendidos | null | undefined,
  texto: string,
  pedir: Pedir = (f) => propertiesApi.list(f),
): Promise<Busqueda> {
  const base = absorber(previa, entendidosPrevios);
  let nuevos: FiltrosEntendidos | null = null;
  try {
    nuevos = (await pedir({ naturalQuery: texto, limit: 1 })).meta.filtrosEntendidos ?? null;
  } catch {
    nuevos = null;
  }
  if (!nuevos || Object.keys(nuevos).length === 0) return { ...base, q: texto };
  return mezclar(base, nuevos);
}
