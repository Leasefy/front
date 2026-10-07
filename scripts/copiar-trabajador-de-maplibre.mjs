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
 * worker viejo desde la caché, y NO va en git.
 *
 * 🔴 Quién la genera (03-10-2026, Nico: «el mapa no carga… se ve como gris»):
 * antes SÓLO el `postinstall`, y un árbol que reusa `node_modules` sin correr
 * `npm install` (el local de Nico, los worktrees, las copias de los agentes)
 * no la tenía → 404 → mapa gris. Ahora también `next.config.mjs` llama a
 * `asegurarElTrabajadorDeMaplibre()` al cargar, que es lo que leen `next dev`,
 * `next build` y `next start` —también los que arrancan `next` sin pasar por
 * los scripts del package.json—. Es idempotente y barata: si los archivos ya
 * están con el mismo tamaño no escribe nada (un disco de sólo lectura en
 * producción tampoco la rompe).
 */

import { copyFileSync, mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ARCHIVOS_DEL_TRABAJADOR = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

function mismoTamano(a, b) {
  try {
    return statSync(a).size === statSync(b).size;
  } catch {
    return false;
  }
}

/**
 * Deja el worker de la versión instalada en `<raiz>/public/maplibre/<versión>/`.
 * Devuelve `{ version, copiados }` (`copiados` = cuántos archivos escribió: 0 si
 * ya estaban). Lanza si el paquete no trae los archivos.
 */
export function asegurarElTrabajadorDeMaplibre(raiz = process.cwd()) {
  const require = createRequire(join(resolve(raiz), 'package.json'));
  const raizDelPaquete = dirname(require.resolve('maplibre-gl/package.json'));
  const { version } = JSON.parse(readFileSync(join(raizDelPaquete, 'package.json'), 'utf8'));
  const destino = join(resolve(raiz), 'public', 'maplibre', version);
  let copiados = 0;
  for (const archivo of ARCHIVOS_DEL_TRABAJADOR) {
    const origen = join(raizDelPaquete, 'dist', archivo);
    if (!existsSync(origen)) {
      throw new Error(`MapLibre ${version} no trae dist/${archivo}: revisa cómo carga su worker esta versión.`);
    }
    const copia = join(destino, archivo);
    if (mismoTamano(origen, copia)) continue;
    mkdirSync(destino, { recursive: true });
    copyFileSync(origen, copia);
    copiados += 1;
  }
  return { version, copiados };
}

// Por línea de comandos (el `postinstall`): `node scripts/copiar-trabajador-de-maplibre.mjs`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { version, copiados } = asegurarElTrabajadorDeMaplibre();
    console.log(
      copiados > 0
        ? `Worker de MapLibre ${version} copiado a public/maplibre/${version}/`
        : `Worker de MapLibre ${version} ya estaba en public/maplibre/${version}/`,
    );
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
