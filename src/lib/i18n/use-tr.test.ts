import { describe, expect, it } from 'vitest'

import { traducir } from './use-tr'
import { FRASES_EN } from './frases-en'

describe('tr: el español tal cual y el inglés por frase (16-10-2026)', () => {
  it('en español devuelve la frase igual, con sus variables', () => {
    expect(traducir('Recaudo', 'es')).toBe('Recaudo')
    expect(traducir('{n} cuotas', 'es', { n: 12 })).toBe('12 cuotas')
  })

  it('en inglés busca la frase; si falta, queda el español', () => {
    const [es, en] = Object.entries(FRASES_EN)[0] ?? ['Recaudo', 'Recaudo']
    expect(traducir(es, 'en')).toBe(en)
    expect(traducir('Una frase que nadie tradujo', 'en')).toBe('Una frase que nadie tradujo')
  })
})
