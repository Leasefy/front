/**
 * geocodeImportRow — la ubicación de UNA fila del portafolio que se importa.
 *
 * Es una envoltura fina sobre `ubicarDireccion`, que es donde vive la regla y
 * el porqué. Acá sólo se traduce el vocabulario de la importación
 * (`propertyAddress`, `propertyCity`) y su forma de resultado.
 *
 * 🔴 Lo que había antes, y lo que costó (2026-09-12, sobre los 2.824
 * inmuebles reales de Nico): esto mandaba la dirección CRUDA, se quedaba con
 * el primer resultado y no miraba dónde había caído. 548 inmuebles quedaron
 * pinchados en otro departamento —uno de Amagá en Santa Marta, a 618 km— y
 * otros 1.442 sin punto, porque la red de seguridad era una tabla de 32
 * ciudades y ninguno de sus municipios estaba en ella.
 *
 * La correspondencia con `Ubicacion` es directa, y el vocabulario viejo se
 * mantiene porque `StepConfirmImport` cuenta con él para avisar cuántas filas
 * quedaron sin dirección exacta:
 *
 *   `direccion` → 'geocoded' · `municipio` → 'city' · `ninguna` → 'none'
 */

import { ubicarDireccion, ESPERA_ENTRE_BUSQUEDAS_MS } from '@/lib/inmuebles/ubicar-direccion';
import type { ImportProperty } from './importTypes';

/** ~2 req/sec, el techo de LocationIQ. Vive con la regla, no acá. */
export const GEOCODE_ROW_DELAY_MS = ESPERA_ENTRE_BUSQUEDAS_MS;

export interface GeocodeRowResult {
  lat?: number;
  lng?: number;
  source: 'geocoded' | 'city' | 'none';
}

export async function geocodeImportRow(
  p: Pick<ImportProperty, 'propertyAddress' | 'propertyCity' | 'propertyDepartment'>,
): Promise<GeocodeRowResult> {
  const u = await ubicarDireccion({
    direccion: p.propertyAddress,
    ciudad: p.propertyCity,
    // El departamento es lo que distingue a Rionegro (Antioquia) de Rionegro
    // (Santander): el portafolio real tiene inmuebles en los dos.
    departamento: p.propertyDepartment,
  });

  const source =
    u.precision === 'direccion' ? 'geocoded' : u.precision === 'municipio' ? 'city' : 'none';

  return { lat: u.lat, lng: u.lng, source };
}
