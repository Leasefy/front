/**
 * 🔴 TODO MAPA LE DICE A MAPLIBRE DÓNDE ESTÁ SU WORKER.
 *
 * Al subir a MapLibre 6 (23-09, XSS crítico en `DOM.sanitize()`), el mapa de
 * /propiedades salió GRIS en el build de producción: marcadores flotando, sin
 * teselas, y «Worker failed to load» en la consola. MapLibre 5+ busca su worker
 * al lado de su propio archivo (`import.meta.url`), y webpack rompe esa URL.
 * `tsc`, el build y las pruebas pasaban; sólo el navegador lo vio.
 *
 * El arreglo tiene tres piezas y esta prueba exige las tres: el `postinstall`
 * copia el worker a `public/`, el paquete instalado trae los archivos que se
 * copian, y cada componente que monta un mapa importa el módulo que apunta a
 * esa copia.
 */

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) archivos(p, out)
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

describe('el worker de MapLibre', () => {
  it('el postinstall lo copia a public/', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.postinstall).toContain('scripts/copiar-trabajador-de-maplibre.mjs')
  })

  it('el paquete instalado trae los archivos que se copian', () => {
    for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
      expect(existsSync(join('node_modules/maplibre-gl/dist', f)), f).toBe(true)
    }
  })

  it('todo archivo que monta un mapa importa trabajador-de-maplibre', () => {
    const sinTrabajador = archivos('src')
      .filter((p) => /from ['"]react-map-gl\/maplibre['"]/.test(readFileSync(p, 'utf8')))
      .filter((p) => !/import ['"](\.\/|@\/components\/map\/)trabajador-de-maplibre['"]/.test(readFileSync(p, 'utf8')))
    expect(sinTrabajador).toEqual([])
  })
})
