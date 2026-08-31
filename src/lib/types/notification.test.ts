import { describe, it, expect } from 'vitest'
import { getNotificationIcon } from './notification'

/**
 * contract.md §3.2.C / §5 P11 — `CONTRACT_MIGRATION_COMPLETED`, ícono
 * frozen: `FileArrowUp`. Cualquier código no mapeado cae a `'Bell'`
 * (fallback ya existente) — así que un mapa desactualizado degrada, nunca
 * crashea; este test cierra ese mapa para el código nuevo específicamente.
 */
describe('getNotificationIcon', () => {
  it('CONTRACT_MIGRATION_COMPLETED mapea a FileArrowUp (contrato §3.2.C2)', () => {
    expect(getNotificationIcon('CONTRACT_MIGRATION_COMPLETED')).toBe('FileArrowUp')
  })

  it('un código desconocido sigue cayendo a Bell', () => {
    expect(getNotificationIcon('ALGO_QUE_NO_EXISTE')).toBe('Bell')
  })
})
