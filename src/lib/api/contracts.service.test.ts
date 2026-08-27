import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { contractsApi } from './contracts.service'

function mockApiGet(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response)
}

// `contracts.service.ts` lee `NEXT_PUBLIC_BACKEND_URL` en una constante de
// módulo (no por llamada), así que en test siempre pega al default
// 'http://localhost:3000' — seteando la env var en `beforeEach` no lo cambia
// porque el módulo ya se importó.
const BACKEND_URL = 'http://localhost:3000'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * contract.md §3.2.A2 — `GET /contracts/migrar/lotes/:lote` es la única
 * ruta nueva de sondeo (§11-J9: 3s/10min). El front no la tenía expuesta
 * todavía en `contractsApi.migracion` — sin esto WU-4 no puede sondear
 * nada.
 */
describe('contractsApi.migracion.estadoDeLote', () => {
  it('pega a GET /contracts/migrar/lotes/:lote y devuelve el EstadoDeLote tal cual', async () => {
    const body = {
      lote: 'lote-20260827-abc12345',
      estado: 'PROCESANDO',
      total: 10,
      procesadas: 4,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
      jobId: 'job-1',
      error: null,
      creadoEn: '2026-08-27T10:00:00.000Z',
    }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.migracion.estadoDeLote('lote-20260827-abc12345')

    expect(result).toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/migrar/lotes/lote-20260827-abc12345`,
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
