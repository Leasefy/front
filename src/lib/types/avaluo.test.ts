/**
 * avaluo.test.ts — el conjunto cerrado de estados del avalúo.
 *
 * `pagado` NO existe en la máquina de estados real del micro
 * (`avaluo/src/avaluo/signoff/state-machine.ts` — cinco estados, el reorder
 * pay-at-intake lo eliminó). `AvaluoStatus` traía un sexto valor de más:
 * dead code en `AvaluoEstadoCard.tsx:160` (T-0007). Mismo precedente ya
 * corregido del lado admin: `src/lib/admin/avaluo-states.ts`.
 */

import { describe, it, expect } from 'vitest'
import { STATUS_BADGE, TERMINAL_STATUSES } from './avaluo'

describe('AvaluoStatus — el conjunto cerrado real (cinco estados, sin `pagado`)', () => {
  it('STATUS_BADGE sólo tiene los cinco estados reales', () => {
    expect(Object.keys(STATUS_BADGE).sort()).toEqual(
      ['borrador', 'en_revisión', 'entregado', 'firmado', 'rechazado'].sort(),
    )
    expect(STATUS_BADGE).not.toHaveProperty('pagado')
  })

  it('TERMINAL_STATUSES sigue siendo entregado/rechazado', () => {
    expect(TERMINAL_STATUSES).toEqual(['entregado', 'rechazado'])
  })
})
