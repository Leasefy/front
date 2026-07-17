/**
 * role-routes.test.ts — single source of truth for the role -> panel base
 * route mapping used after login (AuthForm, ProtectedRoute) and by the
 * landing header CTA (LandingAuthCta).
 */

import { describe, it, expect } from 'vitest'
import { getRoleHomeRoute } from './role-routes'

describe('getRoleHomeRoute', () => {
  it('maps agency to the inmobiliaria panel', () => {
    expect(getRoleHomeRoute('agency')).toBe('/panel/inmobiliaria')
  })

  it('maps landlord to /panel', () => {
    expect(getRoleHomeRoute('landlord')).toBe('/panel')
  })

  it('maps tenant to /inquilino', () => {
    expect(getRoleHomeRoute('tenant')).toBe('/inquilino')
  })

  it('defaults unknown/undefined roles to /inquilino', () => {
    expect(getRoleHomeRoute(undefined)).toBe('/inquilino')
  })
})
