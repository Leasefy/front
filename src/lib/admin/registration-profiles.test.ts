/**
 * registration-profiles.test.ts (admin) — verifies the list/toggle method wraps
 * adminApi with the right path, method, and body. adminApi itself is mocked:
 * this asserts the contract MY method builds, not adminApi's fetch plumbing
 * (which has its own coverage).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({
  adminApi: vi.fn(),
}))

import { adminApi } from './api'
import {
  listRegistrationProfiles,
  setRegistrationProfileEnabled,
} from './registration-profiles'

const adminApiMock = vi.mocked(adminApi)

beforeEach(() => {
  adminApiMock.mockReset()
})

describe('listRegistrationProfiles', () => {
  it('GETs /registration-profiles and returns the rows', async () => {
    const ROWS = [
      { key: 'tenant', enabled: true, updated_at: null, updated_by: null },
      { key: 'landlord', enabled: false, updated_at: '2026-08-01T00:00:00Z', updated_by: 'a@b.co' },
    ]
    adminApiMock.mockResolvedValueOnce(ROWS)

    const signal = new AbortController().signal
    const result = await listRegistrationProfiles(signal)

    expect(adminApiMock).toHaveBeenCalledWith('/registration-profiles', { signal })
    expect(result).toEqual(ROWS)
  })
})

describe('setRegistrationProfileEnabled', () => {
  it('PATCHes /registration-profiles/:key with { enabled } and returns the updated row', async () => {
    const UPDATED = {
      key: 'landlord',
      enabled: false,
      updated_at: '2026-08-02T10:00:00Z',
      updated_by: 'admin@leasefy.co',
    }
    adminApiMock.mockResolvedValueOnce(UPDATED)

    const result = await setRegistrationProfileEnabled('landlord', false)

    expect(adminApiMock).toHaveBeenCalledWith('/registration-profiles/landlord', {
      method: 'PATCH',
      body: { enabled: false },
    })
    expect(result).toEqual(UPDATED)
  })

  it('propagates the backend guard error (e.g. 409 last-enabled)', async () => {
    const err = Object.assign(new Error('last profile'), { name: 'ApiError', status: 409 })
    adminApiMock.mockRejectedValueOnce(err)

    await expect(setRegistrationProfileEnabled('tenant', false)).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
    })
  })
})
