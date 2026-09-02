/**
 * Las fotos de los inmuebles traídos por enlace, DESPUÉS de que el lote los
 * creó.
 *
 * ── Por qué existe (2026-09-02) ───────────────────────────────────────────
 * El lector de enlaces traía las URLs de las fotos de la ficha
 * (`ImportProperty.imagenes`), el paso de enlaces las contaba en pantalla
 * («12 fotos»), y ahí terminaba: `traerFotoComoArchivo` existía y nadie la
 * llamaba. Cada inmueble importado por link nacía sin una sola foto — el
 * apartaestudio de Nico entre ellos.
 *
 * El lote se crea en el servidor (`preparar` → job → `activar`) y el back no
 * ve archivos (regla del importador), así que las fotos se suben desde acá
 * una vez que cada fila tiene su `propertyId`: se baja cada imagen por el
 * proxy (`/api/inmuebles/imagen-remota`, que valida firma y tamaño) y se
 * sube por el endpoint real de fotos (`POST /properties/:id/images`).
 *
 * Fail-soft por foto y por inmueble: una foto que no baja no tumba el resto,
 * y nada de esto puede hacer fallar una importación que ya está hecha.
 */

import type { FilaDeImportacion } from '@/lib/api/inmuebles-importacion.service';
import type { ImportProperty } from './importTypes';

export interface ResultadoFotosDelLote {
  /** Inmuebles a los que se les intentó subir al menos una foto. */
  inmuebles: number;
  subidas: number;
  fallidas: number;
}

export interface DependenciasFotos {
  /** Baja la imagen remota y la deja como archivo; `null` si no se pudo. */
  traer: (url: string, nombre: string) => Promise<File | null>;
  /** Sube los archivos al inmueble; devuelve cuántos entraron y cuáles no. */
  subir: (
    propertyId: string,
    files: File[],
  ) => Promise<{ uploaded: number; failed: { name: string; reason: string }[] }>;
  /** Avance para la pantalla: cuántos inmuebles van de cuántos. */
  alAvanzar?: (hechos: number, total: number) => void;
}

/**
 * Empareja cada fila ACTIVADA con el inmueble del asistente que la originó.
 * El back numera `fila` en el orden en que `preparar()` recibió los DTOs, y
 * ese orden es el de `importables` — el mismo array del que salieron.
 */
export function emparejarFilasConFotos(
  filas: readonly FilaDeImportacion[],
  importables: readonly ImportProperty[],
): Array<{ propertyId: string; imagenes: string[] }> {
  const pares: Array<{ propertyId: string; imagenes: string[] }> = [];
  for (const fila of filas) {
    if (!fila.propertyId) continue;
    const origen = importables[fila.fila - 1];
    const imagenes = origen?.imagenes?.filter((u) => typeof u === 'string' && u.length > 0) ?? [];
    if (imagenes.length === 0) continue;
    pares.push({ propertyId: fila.propertyId, imagenes });
  }
  return pares;
}

/**
 * Sube las fotos de los inmuebles emparejados. `yaSubidos` evita repetir un
 * inmueble cuando se activa el lote en más de una tanda (las filas ACTIVADAS
 * de la primera tanda vuelven a aparecer en la segunda).
 */
export async function subirFotosDelLote(
  pares: readonly { propertyId: string; imagenes: string[] }[],
  deps: DependenciasFotos,
  yaSubidos: Set<string> = new Set(),
): Promise<ResultadoFotosDelLote> {
  const resultado: ResultadoFotosDelLote = { inmuebles: 0, subidas: 0, fallidas: 0 };
  const pendientes = pares.filter((p) => !yaSubidos.has(p.propertyId));
  let hechos = 0;
  for (const par of pendientes) {
    resultado.inmuebles += 1;
    yaSubidos.add(par.propertyId);
    // Las fotos de UN inmueble se bajan en paralelo (son pocas y de un CDN);
    // los inmuebles van en serie para no abrir cien descargas a la vez.
    const archivos = await Promise.all(
      par.imagenes.map((url, i) => deps.traer(url, `foto-${i + 1}`).catch(() => null)),
    );
    const listos = archivos.filter((f): f is File => f !== null);
    resultado.fallidas += archivos.length - listos.length;
    if (listos.length > 0) {
      try {
        const r = await deps.subir(par.propertyId, listos);
        resultado.subidas += r.uploaded;
        resultado.fallidas += r.failed.length;
      } catch {
        resultado.fallidas += listos.length;
      }
    }
    hechos += 1;
    deps.alAvanzar?.(hechos, pendientes.length);
  }
  return resultado;
}
