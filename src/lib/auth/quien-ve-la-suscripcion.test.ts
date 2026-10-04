/**
 * COBRANZA-MANUAL (04-10-2026): el auxiliar de cartera recibía un 403 en
 * `GET /inmobiliaria/subscription` al entrar. Sólo la pide quien la ve.
 */
import { describe, it, expect } from 'vitest'

import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { laSuscripcionSePideConElRol, puedeVerLaSuscripcion } from './quien-ve-la-suscripcion'

describe('quién pide la suscripción', () => {
  it('con los permisos: el administrador y quien tiene `subscription:view`', () => {
    expect(puedeVerLaSuscripcion({ isAdmin: true, canAccess: () => false })).toBe(true)
    expect(puedeVerLaSuscripcion({ isAdmin: false, canAccess: (m, a) => m === 'subscription' && a === 'view' })).toBe(true)
    expect(puedeVerLaSuscripcion({ isAdmin: false, canAccess: (m) => m === 'cobros' })).toBe(false)
  })

  it('sólo con el rol (el guard): el auxiliar de cartera y el abogado no; mientras no se sabe el rol, tampoco', () => {
    expect(laSuscripcionSePideConElRol(AGENCY_ROLES.AUXILIAR_CARTERA)).toBe(false)
    expect(laSuscripcionSePideConElRol(AGENCY_ROLES.ABOGADO_EXTERNO)).toBe(false)
    expect(laSuscripcionSePideConElRol(null)).toBe(false)
    for (const rol of [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR, AGENCY_ROLES.AGENTE, AGENCY_ROLES.VIEWER, AGENCY_ROLES.COORDINADOR]) {
      expect([rol, laSuscripcionSePideConElRol(rol)]).toEqual([rol, true])
    }
  })
})
