/**
 * huellaDelArchivo — una huella determinista de las primeras filas del archivo
 * (T-0130, revisión M1).
 *
 * Retomar una subida con OTRO archivo de la misma cantidad de filas mezclaba dos
 * archivos en un lote, sin que nada lo notara. Cada tanda manda esta huella y el
 * back responde 409 `ARCHIVO_DISTINTO` si no es la de la carga. Son las primeras
 * 50 filas normalizadas (dirección + ciudad + código): bastan para distinguir un
 * archivo de otro y no dependen del orden de columnas ni de mayúsculas.
 *
 * `null` si el navegador no tiene Web Crypto (contexto no seguro): entonces no
 * se manda ni se compara nada, y la protección queda en el conteo de filas.
 */

import type { ImportarInmuebleDto } from '@/lib/api/inmuebles-importacion.service';

const FILAS_DE_LA_HUELLA = 50;

const normal = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export async function huellaDelArchivo(filas: readonly ImportarInmuebleDto[]): Promise<string | null> {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  if (!subtle) return null;
  const texto = filas
    .slice(0, FILAS_DE_LA_HUELLA)
    .map((f) => `${normal(f.address)}|${normal(f.city)}|${normal(f.externalId)}`)
    .join('\n');
  const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
