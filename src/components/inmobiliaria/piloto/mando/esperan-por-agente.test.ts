import { describe, expect, it } from 'vitest'
import { esperanPorAgenteDe } from './DireccionCabina'
import { TEXTOS } from './textos'

// CONTR-2 (QA de agentes 17-10): «Sin acciones recientes» con una prórroga suya esperando.
describe('esperanPorAgenteDe', () => {
  it('cuenta los casos de la Bandeja por agente', () => {
    const m = esperanPorAgenteDe([{ agente: 'contratos' }, { agente: 'calidad' }, { agente: 'calidad' }])!
    expect(m.get('contratos')).toBe(1)
    expect(m.get('calidad')).toBe(2)
    expect(m.get('cobranza')).toBeUndefined()
  })
  it('sin Bandeja no inventa ceros', () => expect(esperanPorAgenteDe(null)).toBeNull())
  it('la frase con su número gramatical', () => {
    expect(TEXTOS.tripulacion.esperan(1)).toBe('1 decisión espera tu clic en la Bandeja')
    expect(TEXTOS.tripulacion.esperan(3)).toBe('3 decisiones esperan tu clic en la Bandeja')
  })
})
