/**
 * Le dice a MapLibre dónde está su Web Worker.
 *
 * Desde MapLibre 5 el worker se busca al lado del archivo de la librería
 * (`import.meta.url`), y empaquetado por webpack esa URL no es http: sin esto
 * el mapa sale gris («Worker failed to load»). El `postinstall` copia el worker
 * a `public/maplibre/<versión>/` (`scripts/copiar-trabajador-de-maplibre.mjs`);
 * acá sólo se apunta a esa copia. Se importa por efecto desde cada componente
 * de mapa, antes de montar el primer `<Map>`.
 */

import { getVersion, setWorkerUrl } from 'maplibre-gl';

export function urlDelTrabajador(version: string): string {
  return `/maplibre/${version}/maplibre-gl-worker.mjs`;
}

if (typeof window !== 'undefined') {
  setWorkerUrl(urlDelTrabajador(getVersion()));
}
