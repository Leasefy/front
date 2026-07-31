import { describe, it, expect, vi, beforeEach } from 'vitest'

// The client is a thin wrapper over `adminApi` — mock it and assert the exact
// path + query object it forwards (state filter, page).
vi.mock('@/lib/admin/api', () => ({
  adminApi: vi.fn(),
}))

import { adminApi } from '@/lib/admin/api'
import { fetchAvaluoList } from '../avaluos'

const adminApiMock = vi.mocked(adminApi)

beforeEach(() => {
  adminApiMock.mockReset()
  adminApiMock.mockResolvedValue({ items: [], total: 0, page: 0, pageSize: 100 })
})

describe('fetchAvaluoList', () => {
  it('calls GET /avaluos with no state (todos) and no page by default', async () => {
    await fetchAvaluoList({})
    expect(adminApiMock).toHaveBeenCalledWith('/avaluos', {
      query: { state: undefined, page: undefined },
      signal: undefined,
    })
  })

  it('forwards the state filter and page when set', async () => {
    await fetchAvaluoList({ state: 'firmado', page: 2 })
    expect(adminApiMock).toHaveBeenCalledWith('/avaluos', {
      query: { state: 'firmado', page: 2 },
      signal: undefined,
    })
  })

  it('advances the page (page number is forwarded, including 0)', async () => {
    await fetchAvaluoList({ state: 'entregado', page: 0 })
    expect(adminApiMock).toHaveBeenCalledWith('/avaluos', {
      query: { state: 'entregado', page: 0 },
      signal: undefined,
    })
  })

  it('treats an empty state as "todos" (omits the filter)', async () => {
    await fetchAvaluoList({ state: '', page: 1 })
    expect(adminApiMock).toHaveBeenCalledWith('/avaluos', {
      query: { state: undefined, page: 1 },
      signal: undefined,
    })
  })

  it('passes the AbortSignal through', async () => {
    const controller = new AbortController()
    await fetchAvaluoList({ state: 'borrador' }, controller.signal)
    expect(adminApiMock).toHaveBeenCalledWith('/avaluos', {
      query: { state: 'borrador', page: undefined },
      signal: controller.signal,
    })
  })
})
