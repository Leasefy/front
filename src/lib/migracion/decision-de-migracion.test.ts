import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EVENTO_DECISION_DE_MIGRACION,
  guardarDecisionDeMigracion,
  leerDecisionDeMigracion,
  eligioMigrar,
  marcarQueEligioMigrar,
} from './decision-de-migracion'

describe('decisión de migración', () => {
  beforeEach(() => localStorage.clear())

  it('se guarda por agencia y se relee', () => {
    guardarDecisionDeMigracion('a1', 'luego')
    expect(leerDecisionDeMigracion('a1')).toBe('luego')
    expect(leerDecisionDeMigracion('a2')).toBeNull()
  })

  it('🔴 «le dio Migrar» es una marca aparte: la ✕ del muro (que escribe «luego») no la borra', () => {
    expect(eligioMigrar('a1')).toBe(false)
    marcarQueEligioMigrar('a1')
    guardarDecisionDeMigracion('a1', 'luego')
    expect(eligioMigrar('a1')).toBe(true)
    expect(eligioMigrar('a2')).toBe(false)
  })

  it('marcar avisa con el mismo evento, para que la tarjeta del menú aparezca sin recargar', () => {
    const oido = vi.fn()
    window.addEventListener(EVENTO_DECISION_DE_MIGRACION, oido)
    marcarQueEligioMigrar('a1')
    expect(oido).toHaveBeenCalledTimes(1)
    window.removeEventListener(EVENTO_DECISION_DE_MIGRACION, oido)
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
