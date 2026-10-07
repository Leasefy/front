/**
 * CF-07 (04-10-2026): «Plan y facturación» decía «No hay facturas
 * disponibles» siempre: el back responde `{ invoices, total }` y el cliente
 * sólo miraba `data`.
 */
import { describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./client', async (importar) => {
  const real = await importar<typeof import('./client')>()
  return { ...real, apiClient: { ...real.apiClient, get } }
})

import { inmobiliariaConfigApi } from './inmobiliaria.service'

describe('inmobiliariaConfigApi.getInvoices', () => {
  it('lee `invoices` del back', async () => {
    get.mockResolvedValue({
      invoices: [{ id: 'c-1', date: '2026-09-03T15:00:00.000Z', amount: 999000, status: 'paid' }],
      total: 1,
    })
    const r = await inmobiliariaConfigApi.getInvoices()
    expect(r).toEqual([{ id: 'c-1', date: '2026-09-03T15:00:00.000Z', amount: 999000, status: 'paid' }])
  })

  it('sigue aceptando `data` o un arreglo', async () => {
    get.mockResolvedValue({ data: [{ id: 'x' }] })
    expect(await inmobiliariaConfigApi.getInvoices()).toEqual([{ id: 'x' }])
    get.mockResolvedValue([{ id: 'y' }])
    expect(await inmobiliariaConfigApi.getInvoices()).toEqual([{ id: 'y' }])
  })
})
