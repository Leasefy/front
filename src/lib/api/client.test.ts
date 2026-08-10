import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
<<<<<<< HEAD
import {
  apiClient,
  ApiError,
  setAccessToken,
  setUnauthorizedHandler,
} from './client'

// ---------------------------------------------------------------------------
// Stub global fetch so we can drive status/body per test.
// ---------------------------------------------------------------------------

function stubFetch(status: number, body: unknown) {
  const res = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => (body == null ? '' : JSON.stringify(body)),
    blob: async () => new Blob(),
  }
  return vi.fn().mockResolvedValue(res as unknown as Response)
}

beforeEach(() => {
  setAccessToken('token-abc')
  setUnauthorizedHandler(null)
=======
import { apiClient, ApiError } from './client'

const realLocation = window.location

function setLocation(pathname: string) {
  Object.defineProperty(window, 'location', {
    value: { href: '', pathname },
    writable: true,
    configurable: true,
  })
}

function mockFetch(status: number, body: unknown = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as typeof fetch
}

beforeEach(() => {
  setLocation('/panel/inmobiliaria/dashboard')
>>>>>>> 13b40359396a512482c95389a446af7e7ff3a125
})

afterEach(() => {
  vi.restoreAllMocks()
<<<<<<< HEAD
  setUnauthorizedHandler(null)
})

describe('apiClient 401 handling', () => {
  it('invokes the unauthorized handler when a 401 carries code SESSION_SUPERSEDED', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'sesión cerrada', code: 'SESSION_SUPERSEDED' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(apiClient.get('/x')).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_SUPERSEDED',
    })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledWith('SESSION_SUPERSEDED')
  })

  it('does NOT invoke the handler on an ordinary 401 (e.g. onboarding "User not found")', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'User not found' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    const err = (await apiClient.get('/users/me').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.code).toBeUndefined()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('preserves the backend message on a 401', async () => {
    vi.stubGlobal('fetch', stubFetch(401, { message: 'User not found' }))
    const err = (await apiClient.get('/users/me').catch((e) => e)) as ApiError
    expect(err.message).toBe('User not found')
=======
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
})

describe('apiClient 402 backstop', () => {
  it('redirects agency /inmobiliaria/* 402 to the upgrade flow', async () => {
    mockFetch(402, { message: 'Plan required' })

    await expect(apiClient.get('/inmobiliaria/cobros')).rejects.toBeInstanceOf(ApiError)
    expect(window.location.href).toBe('/panel/inmobiliaria/upgrade')
  })

  it('still throws ApiError(402) so callers can react', async () => {
    mockFetch(402, { message: 'Plan required' })

    await expect(apiClient.get('/inmobiliaria/cobros')).rejects.toMatchObject({
      status: 402,
    })
  })

  it('does not redirect when already on the upgrade page (no loop)', async () => {
    setLocation('/panel/inmobiliaria/upgrade')
    mockFetch(402, { message: 'Plan required' })

    await expect(apiClient.get('/inmobiliaria/subscription')).rejects.toBeInstanceOf(ApiError)
    expect(window.location.href).toBe('')
  })

  it('does not redirect when already on the checkout page (no loop)', async () => {
    setLocation('/panel/inmobiliaria/checkout')
    mockFetch(402, { message: 'Plan required' })

    await expect(apiClient.get('/inmobiliaria/subscription')).rejects.toBeInstanceOf(ApiError)
    expect(window.location.href).toBe('')
  })

  it('does not redirect for a 402 on a non-agency endpoint', async () => {
    mockFetch(402, { message: 'Plan required' })

    await expect(apiClient.get('/subscriptions/me')).rejects.toBeInstanceOf(ApiError)
    expect(window.location.href).toBe('')
  })

  it('leaves a normal 200 response untouched', async () => {
    mockFetch(200, { ok: true })

    await expect(apiClient.get('/inmobiliaria/cobros')).resolves.toEqual({ ok: true })
    expect(window.location.href).toBe('')
>>>>>>> 13b40359396a512482c95389a446af7e7ff3a125
  })
})
