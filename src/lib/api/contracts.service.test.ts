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

/**
 * T-0033 contract.md §3.2.G1 — `GET /contracts/migrar/filas/ids`, el read
 * nuevo que hace posible "seleccionar las {total} del lote": trae sólo ids
 * (nunca el `datos` JSON completo de cada fila), en el MISMO orden que
 * `filas()`.
 */
describe('contractsApi.migracion.idsDeFilas', () => {
  it('pega a GET /contracts/migrar/filas/ids?lote=... y devuelve el IdsDeFilas tal cual', async () => {
    const body = { ids: ['f-1', 'f-2'], total: 2, truncado: false }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.migracion.idsDeFilas('lote-1')

    expect(result).toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/migrar/filas/ids?lote=lote-1`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('agrega `estado` a la query cuando se pide', async () => {
    const body = { ids: [], total: 0, truncado: false }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    await contractsApi.migracion.idsDeFilas('lote-1', 'PENDIENTE')

    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/migrar/filas/ids?lote=lote-1&estado=PENDIENTE`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('un lote truncado (§3.2.G1, MAX_IDS_MASIVA) se refleja tal cual — el front NO debe silenciarlo', async () => {
    const body = { ids: Array.from({ length: 5_000 }, (_, i) => `f-${i}`), total: 6_500, truncado: true }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.migracion.idsDeFilas('lote-1')

    expect(result.truncado).toBe(true)
    expect(result.ids).toHaveLength(5_000)
    expect(result.total).toBe(6_500)
  })
})

/** Un `BackendContract` MIGRADO sin inmueble — el mínimo que exige el tipo. */
function contratoSinInmueble() {
  return {
    id: 'c-1',
    propertyId: null,
    tenantId: null,
    landlordId: 'land-1',
    status: 'ACTIVE',
    landlordName: 'Propietario X',
    landlordEmail: 'land@x.co',
    landlordDocument: null,
    tenantName: null,
    tenantEmail: null,
    tenantPhone: null,
    tenantDocument: null,
    propertyAddress: 'Dirección del archivo migrado',
    propertyCity: null,
    propertyAdminFee: null,
    monthlyRent: 2_000_000,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDay: 5,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
  }
}

/**
 * T-0033 contract.md §3.2.E1/E2 (Q1/Q2) — `propertyId` se vuelve `string |
 * null` en `BackendContract` y en `Contract`, y el mapper lo reenvía tal
 * cual sin necesitar edición.
 */
describe('mapBackendContract — contrato sin inmueble (T-0033)', () => {
  it('getById reenvía propertyId: null sin explotar', async () => {
    const fetchMock = mockApiGet(contratoSinInmueble())
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const contract = await contractsApi.getById('c-1')

    expect(contract.propertyId).toBeNull()
    // El snapshot del contrato manda sobre el fallback '' — nunca se pierde.
    expect(contract.propertyAddress).toBe('Dirección del archivo migrado')
  })
})

/**
 * T-0033 contract.md §3.2.D2 (Q8) — `PATCH /contracts/:id/inmueble`, nuevo
 * en los dos lados. La respuesta reusa el mismo shape que `getById`.
 */
describe('contractsApi.asignarInmueble', () => {
  it('pega a PATCH /contracts/:id/inmueble con { propertyId } y mapea la respuesta', async () => {
    const body = { ...contratoSinInmueble(), propertyId: 'prop-1' }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.asignarInmueble('c-1', 'prop-1')

    expect(result.propertyId).toBe('prop-1')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/c-1/inmueble`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ propertyId: 'prop-1' }),
      }),
    )
  })
})
