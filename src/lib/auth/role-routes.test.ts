/**
 * role-routes.test.ts — single source of truth for the role -> panel base
 * route mapping used after login (AuthForm, ProtectedRoute) and by the
 * landing header CTA (LandingAuthCta).
 */

import { describe, it, expect } from 'vitest'
import { getRoleHomeRoute, getUserHomeRoute, isPanelRoleAllowed } from './role-routes'
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

describe('getUserHomeRoute — dual-context disambiguation (active context)', () => {
  it("routes to the agency panel when the active context is 'agency'", () => {
    expect(getUserHomeRoute({ role: 'tenant' }, 'agency')).toBe('/panel/inmobiliaria')
    expect(getUserHomeRoute({ role: 'landlord' }, 'agency')).toBe('/panel/inmobiliaria')
  })

  it("routes to the personal home when the active context is 'personal'", () => {
    expect(getUserHomeRoute({ role: 'tenant' }, 'personal')).toBe('/inquilino')
    expect(getUserHomeRoute({ role: 'landlord' }, 'personal')).toBe('/panel')
  })

  it('falls back to the role route when no active context is passed (single-context, unchanged)', () => {
    expect(getUserHomeRoute({ role: 'tenant' })).toBe('/inquilino')
    expect(getUserHomeRoute({ role: 'agency' })).toBe('/panel/inmobiliaria')
  })

  it('anonymous still goes to / regardless of context', () => {
    expect(getUserHomeRoute(null, 'agency')).toBe('/')
  })
})

describe('isPanelRoleAllowed — agency panel admission', () => {
  it('admits a role listed in allowedRoles (pure agency unchanged)', () => {
    expect(isPanelRoleAllowed('agency', ['agency'])).toBe(true)
  })

  it('admits a personal-role user with an ACTIVE membership when allowAgencyMembers is set', () => {
    expect(
      isPanelRoleAllowed('tenant', ['agency'], { allowAgencyMembers: true, hasActiveAgencyMembership: true }),
    ).toBe(true)
    expect(
      isPanelRoleAllowed('landlord', ['agency'], { allowAgencyMembers: true, hasActiveAgencyMembership: true }),
    ).toBe(true)
  })

  it('blocks an invited-only / non-member personal-role user', () => {
    // hasActiveAgencyMembership false = INVITED or none → NOT admitted.
    expect(
      isPanelRoleAllowed('tenant', ['agency'], { allowAgencyMembers: true, hasActiveAgencyMembership: false }),
    ).toBe(false)
  })

  it('blocks a personal-role user when allowAgencyMembers is NOT set (single-context routes unchanged)', () => {
    expect(
      isPanelRoleAllowed('tenant', ['agency'], { hasActiveAgencyMembership: true }),
    ).toBe(false)
    expect(isPanelRoleAllowed('tenant', ['landlord'])).toBe(false)
  })

  it('no allowedRoles = unrestricted', () => {
    expect(isPanelRoleAllowed('tenant', undefined)).toBe(true)
    expect(isPanelRoleAllowed('tenant', [])).toBe(true)
  })
})
