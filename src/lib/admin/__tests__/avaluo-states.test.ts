import { describe, it, expect } from 'vitest'
import { AVALUO_STATES, avaluoStateMeta } from '../avaluo-states'

describe('avaluo-states', () => {
  it('AVALUO_STATES is the closed real state set (no `pagado`)', () => {
    expect([...AVALUO_STATES]).toEqual([
      'borrador',
      'en_revisión',
      'firmado',
      'rechazado',
      'entregado',
    ])
    // WU2 removed `pagado` from the lifecycle — the micro 422s on it.
    expect([...AVALUO_STATES]).not.toContain('pagado')
  })

  it('maps each real state to a user-facing label + pill tone', () => {
    expect(avaluoStateMeta('borrador')).toEqual({ label: 'Borrador', tone: 'neutral' })
    expect(avaluoStateMeta('en_revisión')).toEqual({ label: 'En revisión', tone: 'warn' })
    expect(avaluoStateMeta('firmado')).toEqual({ label: 'Firmado', tone: 'ok' })
    expect(avaluoStateMeta('rechazado')).toEqual({ label: 'Rechazado', tone: 'bad' })
    expect(avaluoStateMeta('entregado')).toEqual({ label: 'Entregado', tone: 'info' })
  })

  it('degrades an unknown state to a neutral pill showing the raw value', () => {
    expect(avaluoStateMeta('pagado')).toEqual({ label: 'pagado', tone: 'neutral' })
    expect(avaluoStateMeta('')).toEqual({ label: '', tone: 'neutral' })
  })
})
