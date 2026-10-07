/**
 * El placeholder se ve como placeholder, no como un dato ya escrito.
 *
 * Nico, 01-10: «esos inputs como el de código de tu sistema y dígito de
 * verificación se ven hasta como si fueran fill, que estuvieran llenos, y eso
 * nos generó confusión a nosotros, y al usuario me imagino».
 *
 * El placeholder vestía `fg-subtle`: el gris de las ayudas y de las cabeceras
 * de tabla, que en oscuro se subió a 4.5:1 para que ESOS textos se lean. Con
 * ese contraste un «050» en un campo vacío era indistinguible de un valor.
 *
 * Esta prueba es estática a propósito — mide el CSS y las clases, no monta
 * pantallas — y congela tres cosas:
 *  1. `--fg-placeholder` existe en los dos temas y es más claro que cualquier
 *     texto real (el más tenue es `fg-subtle`), sin volverse invisible.
 *  2. Las reglas que redirigen el `placeholder:text-fg-subtle` horneado en
 *     @leasefy/cadence van DESPUÉS de las utilidades (ganan por orden).
 *  3. Ningún campo del front vuelve a pintar su placeholder con un gris de
 *     texto real.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = join(process.cwd(), 'src')
const GLOBALS = readFileSync(join(RAIZ, 'app/globals.css'), 'utf8')

/**
 * Superficie de un campo en cada paleta (`--surface`). La tercera es la de
 * grises NEUTROS del chat en oscuro (`.dark .chat-grises`, 02-10): redefine los
 * mismos tokens sólo dentro de la conversación, sobre el mismo negro.
 */
const FONDO = { claro: '#ffffff', oscuro: '#0a0a0a', 'oscuro del chat': '#0a0a0a' } as const

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lineal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b)
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Los valores del token en el bloque puente: el primero es el claro, el segundo el oscuro. */
function valores(token: string): string[] {
  return [...GLOBALS.matchAll(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`, 'g'))].map((m) => m[1])
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(tsx?|css)$/.test(nombre) ? [ruta] : []
  })
}

describe('el placeholder se ve como placeholder', () => {
  it('🔴 tiene su propio token, en el tema claro, en el oscuro y en la paleta neutra del chat', () => {
    expect(valores('--fg-placeholder')).toHaveLength(3)
    // El tercero es el de `.chat-grises`, y esa paleta trae su propio `fg-subtle`
    // para comparar (si no, la comparación de abajo mezclaría paletas).
    const chat = GLOBALS.slice(GLOBALS.indexOf('.dark .chat-grises {'))
    const bloque = chat.slice(0, chat.indexOf('}'))
    expect(bloque).toContain(`--fg-placeholder: ${valores('--fg-placeholder')[2]}`)
    expect(bloque).toContain(`--fg-subtle: ${valores('--fg-subtle')[2]}`)
  })

  it.each([
    ['claro', 0],
    ['oscuro', 1],
    ['oscuro del chat', 2],
  ] as const)('🔴 en %s es más tenue que cualquier texto real, sin volverse invisible', (tema, i) => {
    const fondo = FONDO[tema]
    const placeholder = valores('--fg-placeholder')[i]
    const textoMasTenue = valores('--fg-subtle')[i]

    expect(contraste(placeholder, fondo)).toBeLessThan(contraste(textoMasTenue, fondo))
    // Una pista se tiene que poder leer: por debajo de esto ya no ayuda.
    expect(contraste(placeholder, fondo)).toBeGreaterThanOrEqual(2.5)
  })

  it('las reglas que corrigen los campos de cadence van después de las utilidades', () => {
    const utilidades = GLOBALS.indexOf('@tailwind utilities')
    expect(utilidades).toBeGreaterThanOrEqual(0)
    for (const regla of [
      '.placeholder\\:text-fg-subtle::placeholder {',
      '.placeholder\\:text-fg-subtle::-moz-placeholder {',
      "[role='combobox'] > span[data-placeholder] {",
    ]) {
      expect(GLOBALS.indexOf(regla), regla).toBeGreaterThan(utilidades)
    }
  })

  it('el selector de Firefox no comparte lista con el estándar (un navegador que no lo conoce tira la lista entera)', () => {
    expect(GLOBALS).not.toMatch(/::placeholder\s*,[^{]*::-moz-placeholder/)
    expect(GLOBALS).not.toMatch(/::-moz-placeholder\s*,[^{]*::placeholder/)
  })

  it('🔴 ningún campo del front pinta su placeholder con un gris de texto real', () => {
    const culpables = archivos(RAIZ)
      // El backoffice tiene su propio sistema de diseño (admin.css): otro `fg-subtle`.
      .filter((ruta) => !ruta.includes(`${join('app', 'admin')}`))
      .filter((ruta) => !ruta.endsWith(join('app', 'globals.css')))
      .filter((ruta) => !ruta.endsWith('.test.ts') && !ruta.endsWith('.test.tsx'))
      .filter((ruta) =>
        /placeholder:text-(?:fg-subtle|fg-muted|muted-foreground)\b/.test(readFileSync(ruta, 'utf8')),
      )
      .map((ruta) => relative(RAIZ, ruta))

    expect(culpables, 'Usa `placeholder:text-fg-placeholder`.').toEqual([])
  })
})
