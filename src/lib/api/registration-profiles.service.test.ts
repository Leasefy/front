/**
 * registration-profiles.service.test.ts — public read of enabled signup profiles.
 *
 * Covers:
 *   - happy path: GETs the public config path (no Authorization header) and
 *     returns only the enabled keys
 *   - drops unknown keys the backend might send (forward-compat)
 *   - propagates ApiError so the caller (hook) can decide the fail-open fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { setAccessToken } from './client'
import { fetchEnabledRegistrationProfiles } from './registration-profiles.service'

// client.ts captures NEXT_PUBLIC_BACKEND_URL at import time, so we assert on the
// request path suffix rather than the origin (which the test can't override here).
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response
}

function mockFetchOnce(response: Response) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response)
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
  return fetchMock
}

beforeEach(() => {
  setAccessToken(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchEnabledRegistrationProfiles', () => {
  it('GETs the public config path without an Authorization header', async () => {
    const fetchMock = mockFetchOnce(
      jsonResponse([
        { key: 'tenant', enabled: true },
        { key: 'landlord', enabled: true },
        { key: 'agency', enabled: true },
      ]),
    )

    await fetchEnabledRegistrationProfiles()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/config\/registration-profiles$/)
    expect(init.method).toBe('GET')
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('returns only the enabled keys', async () => {
    mockFetchOnce(
      jsonResponse([
        { key: 'tenant', enabled: true },
        { key: 'landlord', enabled: false },
        { key: 'agency', enabled: true },
      ]),
    )

    const result = await fetchEnabledRegistrationProfiles()

    expect(result).toEqual(['tenant', 'agency'])
  })

  it('drops unknown keys the backend might add later', async () => {
    mockFetchOnce(
      jsonResponse([
        { key: 'tenant', enabled: true },
        { key: 'broker', enabled: true },
      ]),
    )

    const result = await fetchEnabledRegistrationProfiles()

    expect(result).toEqual(['tenant'])
  })

  it('propagates an ApiError on a non-2xx response (caller decides fallback)', async () => {
    mockFetchOnce(jsonResponse({ message: 'boom' }, 500))

    await expect(fetchEnabledRegistrationProfiles()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    })
  })
})
