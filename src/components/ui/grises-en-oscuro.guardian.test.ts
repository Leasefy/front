/**
 * Los grises del tema oscuro son la paleta NEUTRA del chat que eligió Nico
 * (02-10-2026) para toda la plataforma.
 *
 * Antes había tres familias de grises en oscuro: los cálidos de Cadence
 * (#24221c, #b3aea5…), que sobre el negro se leían amarillentos («unos grises
 * como amarillos súper feos»); los azulados del bloque shadcn (240 6% …); y
 * hex sueltos en las pantallas (`dark:bg-[#1a1a1c]`, `#2a2a2c`…). Esta
 * compuerta deja los tokens en la paleta, sin tinte, con el contraste medido,
 * y no deja volver un gris a mano en un `dark:`.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(process.cwd(), 'src')
const GLOBALS = readFileSync(join(RAIZ, 'app/globals.css'), 'utf8')

/** El `.dark` de la capa base (tokens shadcn en canales HSL). */
const OSCURO_BASE = /\n {2}\.dark \{([\s\S]*?)\n {2}\}/.exec(GLOBALS)?.[1] ?? ''
/** El `.dark` del puente de Cadence (tokens en hex). */
const OSCURO_CADENCE = /\n\.dark \{([\s\S]*?)\n\}/.exec(GLOBALS)?.[1] ?? ''

function valor(bloque: string, nombre: string): string | undefined {
  return new RegExp(`${nombre}:\\s*([^;]+);`).exec(bloque)?.[1].trim()
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const canal = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('grises del tema oscuro', () => {
  it('encuentra los dos bloques oscuros', () => {
    expect(OSCURO_BASE).toContain('--background:')
    expect(OSCURO_CADENCE).toContain('--surface-muted:')
  })

  it('los tokens del puente de Cadence son la paleta del chat', () => {
    expect({
      bg: valor(OSCURO_CADENCE, '--bg'),
      surfaceMuted: valor(OSCURO_CADENCE, '--surface-muted'),
      borderFaint: valor(OSCURO_CADENCE, '--border-faint'),
      borderStrong: valor(OSCURO_CADENCE, '--border-strong'),
      fgMuted: valor(OSCURO_CADENCE, '--fg-muted'),
      fgSubtle: valor(OSCURO_CADENCE, '--fg-subtle'),
      fgPlaceholder: valor(OSCURO_CADENCE, '--fg-placeholder'),
    }).toEqual({
      bg: '#0a0a0a',
      surfaceMuted: '#1a1a1a',
      borderFaint: '#1f1f1f',
      borderStrong: '#3a3a3a',
      fgMuted: '#a6a6a6',
      fgSubtle: '#8a8a8a',
      fgPlaceholder: '#5f5f5f',
    })
  })

  it('`--border` va en canales HSL, 0 0% 15%', () => {
    expect(valor(OSCURO_BASE, '--border')).toBe('0 0% 15%')
  })

  it('ningún gris HSL del bloque base trae tinte (saturación 0)', () => {
    const grises = ['--secondary', '--muted', '--muted-foreground', '--border', '--input']
    for (const n of [100, 200, 300, 400, 500, 600, 700, 800, 900]) grises.push(`--neutral-${n}`)
    const conTinte = grises.filter((g) => {
      const v = valor(OSCURO_BASE, g)
      return !v || !/^\d+ 0% \d+%$/.test(v)
    })
    expect(conTinte).toEqual([])
  })

  it('el texto tenue pasa AA (4,5:1) sobre el fondo y sobre surface-muted', () => {
    for (const texto of ['--fg-muted', '--fg-subtle']) {
      for (const fondo of ['--bg', '--surface-muted']) {
        const c = contraste(valor(OSCURO_CADENCE, texto)!, valor(OSCURO_CADENCE, fondo)!)
        expect(c, `${texto} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('ninguna pantalla pinta un gris a mano en oscuro (`dark:bg-[#1a1a1c]`…)', () => {
    const GRIS_A_MANO = /dark:(?:[a-z-]+:)*(?:bg|text|border|divide|ring)-\[#([0-9a-fA-F]{6})\]/g
    const culpables: string[] = []
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre)
        if (statSync(ruta).isDirectory()) recorrer(ruta)
        else if (/\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre)) {
          for (const m of readFileSync(ruta, 'utf8').matchAll(GRIS_A_MANO)) {
            const n = parseInt(m[1], 16)
            const canales = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
            if (Math.max(...canales) - Math.min(...canales) <= 12) culpables.push(`${ruta.slice(RAIZ.length + 1)}: ${m[0]}`)
          }
        }
      }
    }
    recorrer(RAIZ)
    expect(culpables, 'Usa los tokens: bg, surface-muted, border-faint, border, border-strong.').toEqual([])
  })
})
