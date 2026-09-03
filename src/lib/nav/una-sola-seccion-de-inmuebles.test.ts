/**
 * «Consignaciones» e «Inmuebles · catálogo» son UNA sección.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * Eran dos entradas del menú sobre la misma lista. Medido antes de unificarlas:
 * 10 consignaciones, 10 inmuebles, correspondencia 1:1, ningún huérfano de
 * ningún lado y el mismo permiso (`portafolio`) protegiendo las dos. Las 6
 * filas que mostraba una contra las 10 de la otra no eran conjuntos distintos:
 * era el filtro «disponibles» que venía puesto de fábrica.
 *
 * Lo que este test cuida no es el nombre, es que no vuelvan a ser dos. Agregar
 * un `href` a `/panel/inmobiliaria/propiedades` compila, pasa `tsc` y se ve
 * bien: la redirección lo lleva a `/inmuebles` y nadie nota nada… hasta que
 * alguien agrega también la entrada del menú, y volvemos al principio.
 *
 * Estático a propósito: son rutas en strings, que es justo lo que el
 * compilador no mira.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

import { RUTAS_UNIFICADAS_DEL_PANEL } from './rutas-unificadas-del-panel'
import { modulosDelPanel } from './arquitectura-del-panel'

const RAIZ = join(process.cwd(), 'src')

/**
 * Los únicos a los que les toca nombrar las rutas viejas: el que redirige, y
 * este test.
 */
const PUEDEN_NOMBRARLAS = new Set([
  'lib/nav/rutas-unificadas-del-panel.data.mjs',
  'lib/nav/una-sola-seccion-de-inmuebles.test.ts',
])

function archivosDeCodigo(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      archivosDeCodigo(ruta, encontrados)
    } else if (/\.(tsx?|mjs|json)$/.test(entrada.name)) {
      encontrados.push(ruta)
    }
  }
  return encontrados
}

describe('una sola sección de inmuebles', () => {
  it('nadie enlaza ya a /portafolio ni a /propiedades del panel', () => {
    const culpables = archivosDeCodigo(RAIZ)
      // Separadores a '/': `relative` devuelve '\' en Windows y la allowlist
      // está escrita con '/', así que sin normalizar el test se acusaba A SÍ
      // MISMO — verde en el CI (Linux) y rojo en cualquier máquina Windows.
      // Mismo criterio que `cuatro-estados.test.ts`.
      .map((ruta) => ({
        ruta: relative(RAIZ, ruta).replace(/\\/g, '/'),
        texto: readFileSync(ruta, 'utf8'),
      }))
      .filter(({ ruta }) => !PUEDEN_NOMBRARLAS.has(ruta))
      .filter(({ texto }) =>
        texto.includes('panel/inmobiliaria/portafolio') ||
        texto.includes('panel/inmobiliaria/propiedades'),
      )
      .map(({ ruta }) => ruta)

    expect(culpables).toEqual([])
  })

  it('las dos rutas viejas redirigen, con sus sub-rutas', () => {
    const fuentes = RUTAS_UNIFICADAS_DEL_PANEL.map((r) => r.source)
    expect(fuentes).toContain('/panel/inmobiliaria/portafolio/:path*')
    expect(fuentes).toContain('/panel/inmobiliaria/propiedades/:path*')
    for (const r of RUTAS_UNIFICADAS_DEL_PANEL) {
      expect(r.destination).toBe('/panel/inmobiliaria/inmuebles/:path*')
      // 307, no 301: un permanente lo cachea el navegador para siempre.
      expect(r.permanent).toBe(false)
    }
  })

  it('no toca el buscador PÚBLICO de /propiedades', () => {
    // El marketplace vive en `/propiedades` a secas, sin `/panel/`. Si alguna
    // regla arrancara ahí, el sitio público entero se iría al panel.
    for (const r of RUTAS_UNIFICADAS_DEL_PANEL) {
      expect(r.source.startsWith('/panel/inmobiliaria/')).toBe(true)
    }
  })

  it('el menú tiene UNA entrada de inmuebles, no dos', () => {
    // El sidebar sale de `arquitectura-del-panel.ts` (datos, no regex sobre el
    // layout): se cuenta la fila de nivel módulo; la pestaña «Inmuebles» de
    // SeccionesDelModulo es la misma fila vista desde adentro y no cuenta.
    const filas = modulosDelPanel().filter((m) => m.href === '/panel/inmobiliaria/inmuebles')
    expect(filas).toHaveLength(1)
  })

  it('la ruta vieja ya no existe como carpeta — la redirección es la única puerta', () => {
    expect(existsSync(join(RAIZ, 'app/panel/inmobiliaria/portafolio'))).toBe(false)
    expect(existsSync(join(RAIZ, 'app/panel/inmobiliaria/propiedades'))).toBe(false)
    expect(existsSync(join(RAIZ, 'app/panel/inmobiliaria/inmuebles/page.tsx'))).toBe(true)
  })

  it('la lista abre mostrando TODOS, no sólo los disponibles', () => {
    // Este valor era la diferencia entera entre las dos pantallas: 6 filas
    // contra 10, con los mismos inmuebles detrás.
    const lista = readFileSync(
      join(RAIZ, 'app/panel/inmobiliaria/inmuebles/page.tsx'),
      'utf8',
    )
    expect(lista).toMatch(/search: '',\s*\n\s*availability: 'all',/)
  })
})
