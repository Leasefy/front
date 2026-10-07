/**
 * QA-IA-A (04-10-2026), medido en el laboratorio: la reconexión del stream de
 * una cotización mandaba la cabecera `Last-Event-ID`, que el micro no permite
 * en CORS (`allowHeaders: ['Content-Type', 'Authorization']`, server/index.ts).
 * El preflight fallaba y la ficha decía «Conexión interrumpida» con los tres
 * veredictos ya en pantalla. El cursor va por `?lastEventId=`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const fuente = readFileSync(join(__dirname, 'use-quote-stream.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')

describe('use-quote-stream — sólo cabeceras que el micro permite en CORS', () => {
  it('no pone la cabecera Last-Event-ID (bloqueada por CORS)', () => {
    expect(fuente).not.toMatch(/headers\.set\(\s*['"]Last-Event-ID['"]/i)
    expect(fuente).not.toMatch(/['"]Last-Event-ID['"]\s*:/i)
  })
  it('el cursor viaja en la URL (?lastEventId=)', () => {
    expect(fuente).toContain('?lastEventId=')
  })
})
