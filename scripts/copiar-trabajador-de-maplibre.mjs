#!/usr/bin/env node
/**
 * Copia el Web Worker de MapLibre a `public/maplibre/<versión>/`.
 *
 * 🔴 Por qué existe (23-09, subida a MapLibre 6 por el XSS crítico de
 * `DOM.sanitize()`, GHSA-jrc7-96c5-q579): desde la 5, MapLibre ya no mete su
 * worker como blob dentro del paquete; lo busca AL LADO de su propio archivo
 * con `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Empaquetado por
 * webpack, `import.meta.url` deja de ser una URL http, MapLibre se queda sin
 * worker y el mapa sale gris: «Worker failed to load» en la consola, sin
 * teselas, con los marcadores flotando en la nada. Ni `tsc`, ni el build, ni
 * las pruebas lo ven —sólo el navegador—.
 *
 * El arreglo es servir los dos archivos que el worker necesita (el worker y el
 * `maplibre-gl-shared.mjs` que importa por ruta relativa) desde nuestro origen,
 * y decirle a MapLibre dónde están (`src/components/map/trabajador-de-maplibre.ts`).
 * La carpeta lleva la versión para que un cambio de MapLibre nunca sirva un
 * worker viejo desde la caché, y NO va en git: la genera el `postinstall`.
 */

import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const raizDelPaquete = dirname(require.resolve('maplibre-gl/package.json'));
const { version } = JSON.parse(readFileSync(join(raizDelPaquete, 'package.json'), 'utf8'));

export const ARCHIVOS_DEL_TRABAJADOR = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

const destino = join(process.cwd(), 'public', 'maplibre', version);
mkdirSync(destino, { recursive: true });
for (const archivo of ARCHIVOS_DEL_TRABAJADOR) {
  const origen = join(raizDelPaquete, 'dist', archivo);
  if (!existsSync(origen)) {
    console.error(`MapLibre ${version} no trae dist/${archivo}: revisa cómo carga su worker esta versión.`);
    process.exit(1);
  }
  copyFileSync(origen, join(destino, archivo));
}
console.log(`Worker de MapLibre ${version} copiado a public/maplibre/${version}/`);
