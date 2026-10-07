/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · CB-J-04: la alerta de la portada decía
 * «Ciérralo hasta el 30 de sept de 2026…». En una frase, el día va largo, como
 * en el resto de los mensajes de la contabilidad: «30 de septiembre de 2026».
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { diaEnFrase } from './alertas'

describe('🔴 CB-J-04 · el día en una frase va largo', () => {
  it('«30 de septiembre de 2026»', () => {
    expect(diaEnFrase('2026-09-30')).toBe('30 de septiembre de 2026')
    expect(diaEnFrase('2026-09-30T00:00:00.000Z')).toBe('30 de septiembre de 2026')
  })

  it('la alerta de cerrar el mes lo usa', () => {
    const fuente = readFileSync(join(__dirname, 'alertas.ts'), 'utf8')
    expect(fuente).toMatch(/Ciérralo hasta el \$\{diaEnFrase\(alerta\.hasta\)\}/)
  })
})
