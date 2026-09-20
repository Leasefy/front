/**
 * bootstrap.service.test.ts — GET /users/me/bootstrap client.
 *
 * Covers the one behavior this thin wrapper owns: normalizing a missing
 * `errors` key to `[]` (contract.md §3.2 back-compat rule) without touching
 * anything else in the response. Everything else (field shapes, degradation)
 * is a pass-through validated by the auth-context tests that consume it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getMock = vi.fn()

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

import { getBootstrap } from './bootstrap.service'

beforeEach(() => {
  getMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getBootstrap', () => {
  it('calls GET /users/me/bootstrap with the given token', async () => {
    getMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'a@b.com', firstName: 'Ana', lastName: 'G' },
      role: 'TENANT',
      agency: null,
      subscription: null,
      onboarding: { complete: true },
      errors: [],
    })
    await getBootstrap('tok-1')
    expect(getMock).toHaveBeenCalledWith('/users/me/bootstrap', 'tok-1')
  })

  it('passes `errors` through unchanged when present', async () => {
    getMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'a@b.com', firstName: '', lastName: '' },
      role: 'AGENT',
      agency: null,
      subscription: null,
      onboarding: null,
      errors: ['agency_unavailable'],
    })
    const result = await getBootstrap()
    expect(result.errors).toEqual(['agency_unavailable'])
  })

  it('defaults `errors` to [] when the key is missing — never throws', async () => {
    getMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'a@b.com', firstName: '', lastName: '' },
      role: 'TENANT',
      agency: null,
      subscription: null,
      onboarding: null,
      // no `errors` key at all — an old back build
    })
    const result = await getBootstrap()
    expect(result.errors).toEqual([])
  })

  it('T-0099: passes `segundoFactor` through unchanged when present', async () => {
    getMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'a@b.com', firstName: '', lastName: '' },
      role: 'AGENT',
      agency: null,
      subscription: null,
      onboarding: null,
      errors: [],
      segundoFactor: { exigido: true },
    })
    const result = await getBootstrap()
    expect(result.segundoFactor).toEqual({ exigido: true })
  })

  it('T-0099: defaults `segundoFactor` to { exigido: false } when the key is missing (older back build) — never throws', async () => {
    getMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'a@b.com', firstName: '', lastName: '' },
      role: 'TENANT',
      agency: null,
      subscription: null,
      onboarding: null,
      errors: [],
      // no `segundoFactor` key at all — an old back build
    })
    const result = await getBootstrap()
    expect(result.segundoFactor).toEqual({ exigido: false })
  })

  it('propagates a rejected apiClient.get (401/409/5xx) unchanged', async () => {
    const err = new Error('boom')
    getMock.mockRejectedValueOnce(err)
    await expect(getBootstrap('tok')).rejects.toBe(err)
  })
})
