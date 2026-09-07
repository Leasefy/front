import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EVENTO_DECISION_DE_MIGRACION,
  guardarDecisionDeMigracion,
  leerDecisionDeMigracion,
  migracionPendienteDeRecordar,
} from './decision-de-migracion'

describe('decisión de migración', () => {
  beforeEach(() => localStorage.clear())

  it('se guarda por agencia y se relee', () => {
    guardarDecisionDeMigracion('a1', 'luego')
    expect(leerDecisionDeMigracion('a1')).toBe('luego')
    expect(leerDecisionDeMigracion('a2')).toBeNull()
  })

  it('sólo «en otro momento» deja el recordatorio del sidebar', () => {
    guardarDecisionDeMigracion('a1', 'luego')
    expect(migracionPendienteDeRecordar('a1')).toBe(true)
    guardarDecisionDeMigracion('a1', 'nunca')
    expect(migracionPendienteDeRecordar('a1')).toBe(false)
    guardarDecisionDeMigracion('a1', 'ahora')
    expect(migracionPendienteDeRecordar('a1')).toBe(false)
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
