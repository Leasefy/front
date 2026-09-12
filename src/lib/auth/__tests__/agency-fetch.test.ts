/**
 * agency-fetch.test.ts — GET /inmobiliaria/agency parsing + failure visibility.
 *
 * Bug under test: auth-context's fetchAgency() used to swallow ANY failure
 * (network blip, malformed body, missing memberRole) into a silent
 * `{ agency: null, role: null }` with zero diagnostics — permanently wiping
 * a healthy account's agency for the rest of the session with no way to
 * know why. This module must:
 *   (1) tolerate legacy/partial response shapes (missing memberRole),
 *   (2) never throw,
 *   (3) log a diagnosable reason via console.warn instead of staying silent.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '@/lib/api/client'
import {
  parseAgencyResponse,
  describeAgencyFetchFailure,
  fetchAgencyProfile,
  agencyResultFromBootstrap,
} from '../agency-fetch'
import type { BootstrapAgency } from '@/lib/api/bootstrap.service'

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response)
}

function mockFetchStatus(status: number, body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response)
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseAgencyResponse', () => {
  it('splits memberRole/memberStatus from the agency fields on the canonical shape', () => {
    const result = parseAgencyResponse({
      id: 'agency-1',
      name: 'Inmobiliaria Test',
      memberRole: 'ADMIN',
      memberStatus: 'ACTIVE',
    })
    expect(result.agency).toEqual({ id: 'agency-1', name: 'Inmobiliaria Test' })
    expect(result.role).toBe('ADMIN')
    // memberStatus is surfaced so callers can gate access on ACTIVE membership.
    expect(result.memberStatus).toBe('ACTIVE')
  })

  it('surfaces an INVITED (not-yet-accepted) member status', () => {
    const result = parseAgencyResponse({ id: 'agency-1', name: 'X', memberStatus: 'INVITED' })
    expect(result.memberStatus).toBe('INVITED')
    expect(result.agency?.id).toBe('agency-1')
  })

  it('tolerates a legacy shape missing memberRole/memberStatus — agency populated, role & status null', () => {
    const result = parseAgencyResponse({ id: 'agency-1', name: 'Inmobiliaria Test' })
    expect(result.agency).toEqual({ id: 'agency-1', name: 'Inmobiliaria Test' })
    expect(result.role).toBeNull()
    expect(result.memberStatus).toBeNull()
  })

  it('returns all-null for a non-object payload', () => {
    expect(parseAgencyResponse(null)).toEqual({ agency: null, role: null, memberStatus: null })
    expect(parseAgencyResponse(undefined)).toEqual({ agency: null, role: null, memberStatus: null })
    expect(parseAgencyResponse('oops')).toEqual({ agency: null, role: null, memberStatus: null })
    expect(parseAgencyResponse([])).toEqual({ agency: null, role: null, memberStatus: null })
  })

  it('returns all-null when the payload has no string id', () => {
    expect(parseAgencyResponse({ name: 'No id here' })).toEqual({ agency: null, role: null, memberStatus: null })
  })
})

describe('describeAgencyFetchFailure', () => {
  it('formats an ApiError with status + message', () => {
    expect(describeAgencyFetchFailure(new ApiError(500, 'Internal error'))).toBe('500 Internal error')
  })

  it('formats a plain Error with its message', () => {
    expect(describeAgencyFetchFailure(new Error('network blip'))).toBe('network blip')
  })

  it('stringifies anything else', () => {
    expect(describeAgencyFetchFailure('weird')).toBe('weird')
  })
})

describe('fetchAgencyProfile', () => {
  it('resolves agency + role + memberStatus on success (neither confirmed-none nor transient)', async () => {
    globalThis.fetch = mockFetchOk({ id: 'agency-1', name: 'Test', memberRole: 'ADMIN', memberStatus: 'ACTIVE' }) as typeof globalThis.fetch
    const result = await fetchAgencyProfile('token-123')
    expect(result).toEqual({
      agency: { id: 'agency-1', name: 'Test' },
      role: 'ADMIN',
      memberStatus: 'ACTIVE',
      confirmedNoMembership: false,
      transientFailure: false,
    })
  })

  it('flags a transient 500 as transientFailure (keep last state) and warns', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    globalThis.fetch = mockFetchStatus(500, { message: 'boom' }) as typeof globalThis.fetch

    const result = await fetchAgencyProfile('token-123')

    expect(result).toEqual({
      agency: null, role: null, memberStatus: null,
      confirmedNoMembership: false, transientFailure: true,
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('500')
    expect(warnSpy.mock.calls[0][0]).toContain('boom')
  })

  it('flags 404/403 as confirmedNoMembership (safe to downgrade) without warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    globalThis.fetch = mockFetchStatus(404, { message: 'no membership' }) as typeof globalThis.fetch

    const result = await fetchAgencyProfile('token-123')

    expect(result).toEqual({
      agency: null, role: null, memberStatus: null,
      confirmedNoMembership: true, transientFailure: false,
    })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('flags a real network failure as transientFailure and warns', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')) as typeof globalThis.fetch

    const result = await fetchAgencyProfile('token-123')

    expect(result).toEqual({
      agency: null, role: null, memberStatus: null,
      confirmedNoMembership: false, transientFailure: true,
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})

describe('agencyResultFromBootstrap — T-0082 WU-2b, contract.md §3.2', () => {
  it('agency present → success, memberRole/memberStatus/permissions split off like parseAgencyResponse', () => {
    const agency: BootstrapAgency = {
      id: 'agency-1',
      name: 'Test',
      memberRole: 'ADMIN',
      memberStatus: 'ACTIVE',
      permissions: { memberId: 'm1', role: 'ADMIN', isAdmin: true, permissions: null, effectivePermissions: 'FULL_ACCESS', usingDefaults: false },
    }
    const result = agencyResultFromBootstrap(agency, [])
    expect(result).toEqual({
      agency: { id: 'agency-1', name: 'Test' },
      role: 'ADMIN',
      memberStatus: 'ACTIVE',
      confirmedNoMembership: false,
      transientFailure: false,
    })
  })

  it('agency: null, errors: [] → CONFIRMED no membership (resolved, no re-probe)', () => {
    const result = agencyResultFromBootstrap(null, [])
    expect(result).toEqual({
      agency: null, role: null, memberStatus: null,
      confirmedNoMembership: true, transientFailure: false,
    })
  })

  it("agency: null, errors: ['agency_unavailable'] → TRANSIENT (arms the standalone self-heal)", () => {
    const result = agencyResultFromBootstrap(null, ['agency_unavailable'])
    expect(result).toEqual({
      agency: null, role: null, memberStatus: null,
      confirmedNoMembership: false, transientFailure: true,
    })
  })

  it('an unrelated error code alongside a null agency does NOT count as agency_unavailable', () => {
    const result = agencyResultFromBootstrap(null, ['subscription_unavailable'])
    expect(result.confirmedNoMembership).toBe(true)
    expect(result.transientFailure).toBe(false)
  })
})
