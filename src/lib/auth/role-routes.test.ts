/**
 * role-routes.test.ts — single source of truth for the role -> panel base
 * route mapping used after login (AuthForm, ProtectedRoute) and by the
 * landing header CTA (LandingAuthCta).
 */

import { describe, it, expect } from 'vitest'
import { getRoleHomeRoute, getUserHomeRoute } from './role-routes'
import { toFrontendRole } from './types'

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

describe('getUserHomeRoute — user-aware home/dashboard destination (logged in → dashboard, everywhere)', () => {
  it('routes a TENANT to /inquilino', () => {
    expect(getUserHomeRoute({ role: 'tenant' })).toBe('/inquilino')
  })

  it('routes a LANDLORD to /panel', () => {
    expect(getUserHomeRoute({ role: 'landlord' })).toBe('/panel')
  })

  it('routes agency users (frontend role) to /panel/inmobiliaria', () => {
    expect(getUserHomeRoute({ role: 'agency' })).toBe('/panel/inmobiliaria')
  })

  it('routes agency MEMBERS mapped from backend AGENT/INMOBILIARIA roles to /panel/inmobiliaria', () => {
    // toFrontendRole is how the auth context derives user.role — the helper
    // needs no separate membership detection.
    expect(getUserHomeRoute({ role: toFrontendRole('AGENT') })).toBe('/panel/inmobiliaria')
    expect(getUserHomeRoute({ role: toFrontendRole('INMOBILIARIA') })).toBe('/panel/inmobiliaria')
  })

  it('works for session-degraded profiles (they still carry a role)', () => {
    // mapSupabaseUser fallback: role 'tenant', profileSource 'session'.
    expect(getUserHomeRoute({ role: 'tenant' })).toBe('/inquilino')
  })

  it('only a truly anonymous visitor goes to the public landing', () => {
    expect(getUserHomeRoute(null)).toBe('/')
    expect(getUserHomeRoute(undefined)).toBe('/')
  })

  it('an authenticated user with a missing role still lands on a dashboard, never on /', () => {
    expect(getUserHomeRoute({})).toBe('/inquilino')
  })
})
