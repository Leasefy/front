/**
 * cotizador.test.ts (admin) — verifies the carrier registry methods wrap
 * adminApi with the right path, method, body and `noForbiddenRedirect`
 * (this is a proxy to the cotizador micro; a 403 is a domain error, not an
 * allowlist rejection — see FRONT.md and `ApiOptions.noForbiddenRedirect`).
 * adminApi itself is mocked: this asserts the contract MY methods build, not
 * adminApi's fetch plumbing (which has its own coverage).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({
  adminApi: vi.fn(),
}))

import { adminApi } from './api'
import {
  listCarriers,
  getCarrier,
  createCarrier,
  updateCarrier,
  deleteCarrier,
  getPreScoringConfig,
  updatePreScoringConfig,
  type CarrierRow,
} from './cotizador'

const adminApiMock = vi.mocked(adminApi)

const FIANLY: CarrierRow = {
  id: 'c-1',
  name: 'fianly',
  displayName: 'Fianly',
  productType: 'fianza',
  route: 'direct',
  mode: 'rest',
  enabled: true,
  priority: 1,
  maxCanonCop: null,
  has_config: true,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}

beforeEach(() => {
  adminApiMock.mockReset()
})

describe('listCarriers', () => {
  it('GETs /cotizador/registry with noForbiddenRedirect and unwraps .registry', async () => {
    adminApiMock.mockResolvedValueOnce({ success: true, registry: [FIANLY] })

    const signal = new AbortController().signal
    const result = await listCarriers(signal)

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/registry', {
      signal,
      noForbiddenRedirect: true,
    })
    expect(result).toEqual([FIANLY])
  })
})

describe('getCarrier', () => {
  it('GETs /cotizador/registry/:name and unwraps .carrier', async () => {
    adminApiMock.mockResolvedValueOnce({ success: true, carrier: FIANLY })

    const result = await getCarrier('fianly')

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/registry/fianly', {
      signal: undefined,
      noForbiddenRedirect: true,
    })
    expect(result).toEqual(FIANLY)
  })
})

describe('createCarrier', () => {
  it('POSTs the snake_case body and unwraps .carrier', async () => {
    adminApiMock.mockResolvedValueOnce({ success: true, carrier: FIANLY })

    const body = {
      name: 'fianly',
      route: 'direct',
      mode: 'rest' as const,
      product_type: 'fianza' as const,
      enabled: true,
      config: { base_url: 'https://fianly.example', username: 'leasify', password: 'secret' },
    }
    const result = await createCarrier(body)

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/registry', {
      method: 'POST',
      body,
      noForbiddenRedirect: true,
    })
    expect(result).toEqual(FIANLY)
  })
})

describe('updateCarrier', () => {
  it('PATCHes /cotizador/registry/:name with only the given fields', async () => {
    adminApiMock.mockResolvedValueOnce({ success: true, carrier: { ...FIANLY, enabled: false } })

    const body = { enabled: false }
    const result = await updateCarrier('fianly', body)

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/registry/fianly', {
      method: 'PATCH',
      body,
      noForbiddenRedirect: true,
    })
    expect(result).toEqual({ ...FIANLY, enabled: false })
  })
})

describe('deleteCarrier', () => {
  it('DELETEs /cotizador/registry/:name (soft-delete)', async () => {
    adminApiMock.mockResolvedValueOnce(undefined)

    await deleteCarrier('fianly')

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/registry/fianly', {
      method: 'DELETE',
      noForbiddenRedirect: true,
    })
  })
})

describe('getPreScoringConfig', () => {
  it('GETs /cotizador/prescoring-config with noForbiddenRedirect and unwraps .config', async () => {
    const config = { authorizationWaitHours: 48, resultReuseTtlHours: 48 }
    adminApiMock.mockResolvedValueOnce({ success: true, config })

    const signal = new AbortController().signal
    const result = await getPreScoringConfig(signal)

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/prescoring-config', {
      signal,
      noForbiddenRedirect: true,
    })
    expect(result).toEqual(config)
  })
})

describe('updatePreScoringConfig', () => {
  it('PATCHes /cotizador/prescoring-config with the given fields and unwraps .config', async () => {
    const config = { authorizationWaitHours: 72, resultReuseTtlHours: 24 }
    adminApiMock.mockResolvedValueOnce({ success: true, config })

    const body = { authorizationWaitHours: 72, resultReuseTtlHours: 24 }
    const result = await updatePreScoringConfig(body)

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/prescoring-config', {
      method: 'PATCH',
      body,
      noForbiddenRedirect: true,
    })
    expect(result).toEqual(config)
  })

  it('sends a partial body when only one field changed', async () => {
    adminApiMock.mockResolvedValueOnce({
      success: true,
      config: { authorizationWaitHours: 48, resultReuseTtlHours: 24 },
    })

    await updatePreScoringConfig({ resultReuseTtlHours: 24 })

    expect(adminApiMock).toHaveBeenCalledWith('/cotizador/prescoring-config', {
      method: 'PATCH',
      body: { resultReuseTtlHours: 24 },
      noForbiddenRedirect: true,
    })
  })
})

describe('error propagation', () => {
  it('propagates the micro error envelope ({ success:false, error }) via ApiError.body', async () => {
    const err = Object.assign(new Error('Error 400'), {
      name: 'ApiError',
      status: 400,
      body: { success: false, error: 'route is required' },
    })
    adminApiMock.mockRejectedValueOnce(err)

    await expect(
      createCarrier({ name: 'fianly', route: '', mode: 'rest', product_type: 'fianza' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      body: { error: 'route is required' },
    })
  })
})
