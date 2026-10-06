/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · CB-I-06: a 390 px la tarjeta del balance de
 * prueba ponía dos columnas y la cifra con centavos («$ 57.488.579,28») se montaba
 * sobre la etiqueta «Débitos» o se cortaba contra el borde.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('🔴 CB-I-06 · las tarjetas del balance de prueba en el celular', () => {
  const fuente = readFileSync(join(__dirname, 'BalanceDePrueba.tsx'), 'utf8')
  it('una columna en el celular y dos desde 640 px', () => {
    expect(fuente).toContain('grid grid-cols-1 gap-x-4 gap-y-1 text-caption sm:grid-cols-2')
    expect(fuente).not.toContain('<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption">')
  })
  it('los totales del período tampoco se montan: una columna en el celular', () => {
    expect(fuente).toContain('<dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">')
    expect(fuente).toContain('<dd className="whitespace-nowrap" data-testid="total-debitos">')
  })
  it('las cuatro cifras de la tarjeta no se parten', () => {
    expect(fuente.match(/<dd className="whitespace-nowrap"><Monto/g)?.length).toBe(4)
  })
})
