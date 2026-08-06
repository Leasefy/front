import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
})

afterEach(() => {
  vi.restoreAllMocks()
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
  })
})
