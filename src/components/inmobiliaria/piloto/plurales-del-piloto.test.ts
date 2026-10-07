/**
 * QA-PILOTO-95 (TXT-02): los textos del Piloto no escriben el plural «a medias»
 * («1 depósito(s) conciliándose», «Ver sus 1 procesos»): cada cifra lleva su
 * singular y su plural.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const es = JSON.parse(readFileSync(join(__dirname, '../../../lib/i18n/locales/es.json'), 'utf8'))

function hojas(o: unknown, ruta = ''): Array<[string, string]> {
  if (typeof o === 'string') return [[ruta, o]]
  if (!o || typeof o !== 'object') return []
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => hojas(v, ruta ? `${ruta}.${k}` : k))
}

describe('TXT-02: el plural en los textos del Piloto', () => {
  it('ningún texto de inmobiliaria.piloto usa «(s)»', () => {
    const conS = hojas(es.inmobiliaria.piloto, 'inmobiliaria.piloto').filter(([, v]) => /\w\(s\)/.test(v))
    expect(conS).toEqual([])
  })
  // TXT-03 (06-10): la plata de la casa también en los textos fijos: «$ 0», nunca «$0».
  it('ningún texto de inmobiliaria.piloto escribe la plata pegada («$0»)', () => {
    const pegada = hojas(es.inmobiliaria.piloto, 'inmobiliaria.piloto').filter(([, v]) => /\$\d/.test(v))
    expect(pegada).toEqual([])
  })
  it('las cifras de «Ahora mismo» y «Ver sus procesos» tienen su singular', () => {
    expect(es.inmobiliaria.piloto.flota.conciliandoUno).toBe('1 depósito conciliándose')
    expect(es.inmobiliaria.piloto.flota.llamadasUna).toBe('1 llamada en curso')
    expect(es.inmobiliaria.piloto.flota.esperandoUno).toBe('1 depósito esperando tu visto bueno')
    expect(es.inmobiliaria.piloto.operaSola.verProcesosUno).toBe('Ver su proceso')
  })
})
