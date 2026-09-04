/**
 * coordenadas.ts — ¿este par de números es una ubicación real?
 *
 * Un inmueble sin geocodificar llega del back con `latitude`/`longitude` en
 * `null`; durante mucho tiempo el mapper los convertía en `0`, así que hay
 * (0,0) guardados que son «sin ubicación», no un punto en el golfo de Guinea.
 * Este helper es la única regla para decidir si se pinta un mapa: finitos,
 * dentro del rango geográfico y distintos de (0,0).
 */

export function tieneCoordenadas(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}
