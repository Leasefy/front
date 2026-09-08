import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EVENTO_DECISION_DE_MIGRACION,
  guardarDecisionDeMigracion,
  leerDecisionDeMigracion,
  recordatorioDeMigracionDescartado,
} from './decision-de-migracion'

describe('decisión de migración', () => {
  beforeEach(() => localStorage.clear())

  it('se guarda por agencia y se relee', () => {
    guardarDecisionDeMigracion('a1', 'luego')
    expect(leerDecisionDeMigracion('a1')).toBe('luego')
    expect(leerDecisionDeMigracion('a2')).toBeNull()
  })

  it('sólo «no requiero migración» (o la ✕ del recordatorio) apaga el recordatorio del sidebar', () => {
    expect(recordatorioDeMigracionDescartado('a1')).toBe(false)
    guardarDecisionDeMigracion('a1', 'luego')
    expect(recordatorioDeMigracionDescartado('a1')).toBe(false)
    guardarDecisionDeMigracion('a1', 'ahora')
    expect(recordatorioDeMigracionDescartado('a1')).toBe(false)
    guardarDecisionDeMigracion('a1', 'nunca')
    expect(recordatorioDeMigracionDescartado('a1')).toBe(true)
    expect(recordatorioDeMigracionDescartado('a2')).toBe(false)
  })

  it('avisa con un evento para que el sidebar reaccione sin recargar', () => {
    const oido = vi.fn()
    window.addEventListener(EVENTO_DECISION_DE_MIGRACION, oido)
    guardarDecisionDeMigracion('a1', 'luego')
    expect(oido).toHaveBeenCalledTimes(1)
    window.removeEventListener(EVENTO_DECISION_DE_MIGRACION, oido)
  })

  it('ignora basura guardada', () => {
    localStorage.setItem('leasefy:migracion:decision:a1', 'quizás')
    expect(leerDecisionDeMigracion('a1')).toBeNull()
  })
})
