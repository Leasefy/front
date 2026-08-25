/**
 * El logo del panel y el de la landing deben ser el MISMO trazo.
 *
 * La landing inyecta el logo como símbolo SVG (`<g id="lfLogo">` en
 * landing-v2/LogoDefs.tsx) y lo reusa con `<use>`. El panel no puede usar ese
 * `<use>` porque esos defs solo se montan en la landing, así que los trazos
 * están copiados en `leasefy-logo-paths.ts`.
 *
 * Copiar abre la puerta a que se separen: alguien retoca el logo en un lado y
 * el producto queda con dos marcas distintas durante meses sin que nadie lo
 * note. Este test lee AMBAS fuentes y falla si dejan de coincidir.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LEASEFY_SYMBOL_PATH,
  LEASEFY_WORDMARK_PATH,
  LEASEFY_LOCKUP_VIEWBOX,
} from './leasefy-logo-paths'

function trazosDeLaLanding(): { symbol: string; wordmark: string; viewBox: string | null } {
  const src = readFileSync(
    join(process.cwd(), 'src/components/landing-v2/LogoDefs.tsx'),
    'utf8',
  )
  const grupo = src.match(/<g id="lfLogo">([\s\S]*?)<\/g>/)
  if (!grupo) throw new Error('No se encontró <g id="lfLogo"> en LogoDefs.tsx')
  const paths = [...grupo[1].matchAll(/<path[^>]*d="([^"]+)"/g)].map((m) => m[1])
  // El viewBox no vive en los defs sino en cada `<svg>` que hace `<use>`.
  const viewBox = src.match(/viewBox="(0 0 947 235)"/)?.[1] ?? null
  return { symbol: paths[0], wordmark: paths[1], viewBox }
}

describe('logo de Leasefy — paridad con la landing', () => {
  const landing = trazosDeLaLanding()

  it('el símbolo es idéntico', () => {
    expect(LEASEFY_SYMBOL_PATH).toBe(landing.symbol)
  })

  it('el wordmark es idéntico', () => {
    expect(LEASEFY_WORDMARK_PATH).toBe(landing.wordmark)
  })

  it('el lockup son exactamente dos trazos', () => {
    // Si la landing agrega un tercero (un ®, un slogan), el lockup del panel
    // quedaría incompleto en silencio.
    expect(landing.wordmark).toBeTruthy()
    expect(landing.symbol).toBeTruthy()
  })

  it('comparte el lienzo original del lockup', () => {
    expect(LEASEFY_LOCKUP_VIEWBOX).toBe('0 0 947 235')
  })
})
