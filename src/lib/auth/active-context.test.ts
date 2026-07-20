/**
 * active-context — per-user-scoped persistence of the dual-context choice, and
 * the dual-context predicate that gates the header switcher.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  readActiveContext,
  writeActiveContext,
  clearActiveContext,
  isDualContextUser,
} from './active-context'

beforeEach(() => {
  localStorage.clear()
})

describe('read/writeActiveContext (userId-scoped)', () => {
  it('round-trips the chosen context for the owning user', () => {
    writeActiveContext('u1', 'agency')
    expect(readActiveContext('u1')).toBe('agency')
    writeActiveContext('u1', 'personal')
    expect(readActiveContext('u1')).toBe('personal')
  })

  it("treats another user's entry as absent (no cross-account leak)", () => {
    writeActiveContext('u1', 'agency')
    expect(readActiveContext('other-user')).toBeNull()
  })

  it('returns null when unset, for a null/undefined userId, or on corrupt JSON', () => {
    expect(readActiveContext('u1')).toBeNull()
    expect(readActiveContext(null)).toBeNull()
    expect(readActiveContext(undefined)).toBeNull()
    localStorage.setItem('leasefy:active-context', '{not json')
    expect(readActiveContext('u1')).toBeNull()
  })

  it('ignores an unrecognized stored context value', () => {
    localStorage.setItem('leasefy:active-context', JSON.stringify({ userId: 'u1', context: 'bogus' }))
    expect(readActiveContext('u1')).toBeNull()
  })

  it('clearActiveContext removes the entry', () => {
    writeActiveContext('u1', 'agency')
    clearActiveContext()
    expect(readActiveContext('u1')).toBeNull()
  })
})

describe('isDualContextUser', () => {
  it('true only for a personal role (tenant/landlord) with ACTIVE membership', () => {
    expect(isDualContextUser({ role: 'tenant' }, true)).toBe(true)
    expect(isDualContextUser({ role: 'landlord' }, true)).toBe(true)
  })

  it('false for a personal role without active membership', () => {
    expect(isDualContextUser({ role: 'tenant' }, false)).toBe(false)
    expect(isDualContextUser({ role: 'landlord' }, false)).toBe(false)
  })

  it('false for a pure-agency user (single-context)', () => {
    expect(isDualContextUser({ role: 'agency' }, true)).toBe(false)
  })

  it('false for null/undefined user', () => {
    expect(isDualContextUser(null, true)).toBe(false)
    expect(isDualContextUser(undefined, true)).toBe(false)
  })
})
