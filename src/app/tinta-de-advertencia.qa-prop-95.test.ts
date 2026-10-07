/**
 * QA-PROP-95 G-14 (04-10-2026): el TEXTO de advertencia se pintaba con el color
 * de relleno (`--warning`, #C07A2D): 3,23:1 sobre su fondo suave (#FBF1DD) y
 * 3,24:1 sobre --surface-muted. AA pide 4,5:1. El tono vive en UN lugar
 * (`--warning-ink`, globals.css) y todo `text-warning` del tema claro lo lee.
 * Estático: lee globals.css y mide el contraste con la fórmula de WCAG.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

/** «25 64% 33%» → [r, g, b] 0–255. */
function hslARgb(triplete: string): [number, number, number] {
  const [h, s, l] = triplete.replace(/%/g, '').trim().split(/\s+/).map(Number)
  const S = s / 100, L = l / 100
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r, g, b].map((v) => Math.round((v + m) * 255)) as [number, number, number]
}
const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
const luz = ([r, g, b]: [number, number, number]) => {
  const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
const contraste = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('G-14 · la tinta de advertencia', () => {
  it('el tema claro define `--warning-ink` con el tono de texto (-700) y todo `text-warning` lo lee', () => {
    expect(css).toMatch(/--warning-ink:\s*hsl\(var\(--warning-700\)\)/)
    expect(css).toMatch(/\n\.text-warning \{\s*color: var\(--warning-ink\);\s*\}/)
  })

  it('esa tinta pasa AA (4,5:1) sobre el fondo suave de advertencia y sobre --surface-muted', () => {
    const tinta = hslARgb(css.match(/--warning-700:\s*([^;]+);/)![1])
    const suave = hex(css.match(/--warning-soft:\s*(#[0-9a-f]{6});/i)![1])
    const muted = hex(css.match(/--surface-muted:\s*(#[0-9a-f]{6});/i)![1])
    expect(contraste(tinta, suave)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(tinta, muted)).toBeGreaterThanOrEqual(4.5)
    // Y el relleno, que era la tinta, no pasaba: por eso existe esto.
    const relleno = hslARgb(css.match(/--warning-500:\s*([^;]+);/)![1])
    expect(contraste(relleno, suave)).toBeLessThan(4.5)
  })

  it('en oscuro el ámbar suelto se queda y sobre su fondo suave va la tinta clara', () => {
    expect(css).toMatch(/\.dark \.text-warning \{\s*color: var\(--warning\);\s*\}/)
    expect(css).toMatch(/--warning-ink:\s*hsl\(var\(--warning-100\)\)/)
  })

  it('peligro: la tinta pasa AA con la opacidad 0,9 del texto de la alerta', () => {
    const tinta = hex(css.match(/--danger-ink:\s*(#[0-9a-f]{6});/i)![1])
    const suave = hex(css.match(/--danger-soft:\s*(#[0-9a-f]{6});/i)![1])
    const mezcla = tinta.map((v, i) => Math.round(0.9 * v + 0.1 * suave[i])) as [number, number, number]
    expect(contraste(mezcla, suave)).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.text-danger\.bg-danger-soft,\s*\.bg-danger-soft \.text-danger \{\s*color: var\(--danger-ink\);/)
  })

  it('información: el texto pasa AA sobre --info-soft y en oscuro el título lee la tinta clara', () => {
    const tinta = hex(css.match(/--info-ink:\s*(#[0-9a-f]{6});/i)![1])
    const suave = hex(css.match(/--info-soft:\s*(#[0-9a-f]{6});/i)![1])
    const mezcla = tinta.map((v, i) => Math.round(0.9 * v + 0.1 * suave[i])) as [number, number, number]
    expect(contraste(mezcla, suave)).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.dark \.bg-info-soft \.alert-title \{\s*color: var\(--info-ink\);/)
  })
})
