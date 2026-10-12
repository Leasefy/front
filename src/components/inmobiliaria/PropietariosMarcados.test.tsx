import { describe, expect, it } from 'vitest'

import type { Propietario } from '@/lib/types/inmobiliaria'
import { aQuienesLesLlega, mesPasado } from './PropietariosMarcados'

describe('mesPasado', () => {
  it('el mes que cerró, también en enero', () => {
    expect(mesPasado(new Date(2026, 9, 10))).toBe('2026-09')
    expect(mesPasado(new Date(2026, 0, 5))).toBe('2025-12')
  })
})

describe('aQuienesLesLlega', () => {
  it('el extracto a quien tiene correo; la invitación además sólo a quien no tiene cuenta', () => {
    const r = aQuienesLesLlega([
      { id: 'a', email: 'a@x.co', cuentaDePortalId: null },
      { id: 'b', email: 'b@x.co', cuentaDePortalId: 'u-b' },
      { id: 'c', email: ' ', cuentaDePortalId: null },
    ] as Propietario[])
    expect(r.extracto.map((p) => p.id)).toEqual(['a', 'b'])
    expect(r.sinCorreo).toBe(1)
    expect(r.invitacion.map((p) => p.id)).toEqual(['a'])
    expect(r.yaTienenCuenta).toBe(1)
  })
})
