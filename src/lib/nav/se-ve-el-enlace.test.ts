/** FA-R31 (QA de Facturación, 03-10-2026): «Hoy» sólo ofrece Facturación a quien entra. */
import { describe, it, expect } from 'vitest'

import { seVeElEnlace } from './se-ve-el-enlace'

const FACTURACION = { roles: ['ADMIN', 'CONTADOR'] }

describe('seVeElEnlace', () => {
  it('🔴 la asesora no ve Facturación; el administrador y el contador sí', () => {
    expect(seVeElEnlace(FACTURACION, { isAdmin: false, agencyRole: 'AGENTE', isLoading: false })).toBe(false)
    expect(seVeElEnlace(FACTURACION, { isAdmin: false, agencyRole: 'VIEWER', isLoading: false })).toBe(false)
    expect(seVeElEnlace(FACTURACION, { isAdmin: false, agencyRole: 'CONTADOR', isLoading: false })).toBe(true)
    expect(seVeElEnlace(FACTURACION, { isAdmin: false, agencyRole: 'ADMIN', isLoading: false })).toBe(true)
    expect(seVeElEnlace(FACTURACION, { isAdmin: true, agencyRole: null, isLoading: false })).toBe(true)
  })

  it('mientras no se sabe el rol, no se ofrece; un enlace sin roles es de todos', () => {
    expect(seVeElEnlace(FACTURACION, { isAdmin: false, agencyRole: null, isLoading: true })).toBe(false)
    expect(seVeElEnlace({}, { isAdmin: false, agencyRole: 'AGENTE', isLoading: false })).toBe(true)
  })
})
