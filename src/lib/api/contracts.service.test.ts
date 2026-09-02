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
 * T-0036 contract.md §3.2.C6 — `DELETE /contracts/migrar/lotes/:lote`, el
 * botón para cancelar un lote entero en vez de descartar fila por fila.
 */
describe('contractsApi.migracion.descartarLote', () => {
  it('pega a DELETE /contracts/migrar/lotes/:lote y devuelve el DescarteDeLote tal cual', async () => {
    const body = {
      lote: 'lote-20260827-abc12345',
      descartadas: 1362,
      activadas: 3,
      yaDescartadas: 0,
    }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.migracion.descartarLote('lote-20260827-abc12345')

    expect(result).toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/migrar/lotes/lote-20260827-abc12345`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('codifica el lote en la URL — los lotes de antes de T-0031 no están garantizados URL-safe', async () => {
    const body = { lote: 'lote raro/1', descartadas: 1, activadas: 0, yaDescartadas: 0 }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    await contractsApi.migracion.descartarLote('lote raro/1')

    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/migrar/lotes/${encodeURIComponent('lote raro/1')}`,
      expect.objectContaining({ method: 'DELETE' }),
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

/**
 * T-0036 contract.md §3.2.B6 — `POST /contracts/:id/invitar-inquilino`, la
 * salida de un contrato migrado sin inquilino. A diferencia de
 * `asignarInmueble`, esta llamada NO mapea `contrato` acá adentro: el wire
 * trae `{ invitado, tenantId, contrato }` y `contrato` es el `BackendContract`
 * crudo — el caller (la pantalla) es quien llama `mapBackendContract` sobre
 * `res.contrato`, porque `invitado`/`tenantId` viajan junto a él y no hay
 * un segundo shape para el endpoint.
 */
describe('contractsApi.invitarInquilino', () => {
  it('pega a POST /contracts/:id/invitar-inquilino con {} y devuelve el ResultadoInvitacion tal cual (contrato SIN mapear)', async () => {
    const body = {
      invitado: true,
      tenantId: 'usuario-1',
      contrato: { ...contratoSinInmueble(), tenantId: 'usuario-1' },
    }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.invitarInquilino('c-1')

    expect(result).toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/contracts/c-1/invitar-inquilino`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    )
  })

  it('invitado:false cuando el correo ya tenía cuenta — se vincula, sin mandar nada', async () => {
    const body = {
      invitado: false,
      tenantId: 'usuario-existente',
      contrato: { ...contratoSinInmueble(), tenantId: 'usuario-existente' },
    }
    const fetchMock = mockApiGet(body)
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    const result = await contractsApi.invitarInquilino('c-1')

    expect(result.invitado).toBe(false)
    expect(result.tenantId).toBe('usuario-existente')
  })
})

/**
 * T-0036 contract.md §3.2.B6 — `mapBackendContract` tiene que quedar
 * exportado: la pantalla del detalle lo llama directo sobre
 * `res.contrato` después de invitar, sin pasar por un segundo `getById`.
 */
describe('mapBackendContract (exportado)', () => {
  it('mapea el contrato crudo de ResultadoInvitacion igual que getById', async () => {
    const { mapBackendContract } = await import('./contracts.service')
    const crudo = { ...contratoSinInmueble(), tenantId: 'usuario-1' }

    const mapeado = mapBackendContract(crudo as never)

    expect(mapeado.tenantId).toBe('usuario-1')
  })
})

/**
 * T-0040 — el consecutivo del contrato, del lado del front del borde.
 *
 * Este borde no tiene codegen (C4/C18): el back y estos cuatro archivos
 * re-declaran el mismo wire a mano. El gate del back
 * (`contract-code-wire.spec.ts`) prueba que `GET /contracts` EMITE `code`,
 * pero sus payloads son literales escritos dentro del propio spec del back —
 * no ve un renombre de este lado. Ese es exactamente el hueco que dejó pasar
 * F-1/F-2 en T-0038 durante seis unidades de trabajo (VERIFY-2, N-4). Estas
 * pruebas son la mitad que falta.
 */
describe('mapBackendContract — code (T-0040)', () => {
  it('pasa el consecutivo al dominio', async () => {
    const { mapBackendContract } = await import('./contracts.service')

    const mapeado = mapBackendContract({ ...contratoSinInmueble(), code: 14 } as never)

    expect(mapeado.code).toBe(14)
  })

  it('deja pasar `undefined` sin coalescer — un back anterior a T-0040', async () => {
    /*
     * NADA de `?? 0`: los códigos arrancan en 1, así que un 0 coalescido se
     * renderizaría como «#0», un código que no existe. La degradación
     * congelada es no renderizar nada, y eso sólo funciona si `undefined`
     * sobrevive el mapper.
     */
    const { mapBackendContract } = await import('./contracts.service')
    const crudo = contratoSinInmueble() as Record<string, unknown>
    delete crudo.code

    const mapeado = mapBackendContract(crudo as never)

    expect(mapeado.code).toBeUndefined()
    expect(mapeado.code).not.toBe(0)
    expect(mapeado.code).not.toBeNull()
  })

  it('la clave se llama `code` — ni codigo, ni contractCode, ni numero', async () => {
    /*
     * La aserción que un gate del lado del back NO puede hacer. Renombrar la
     * clave acá deja los dos repos en verde y la columna vacía.
     */
    const { mapBackendContract } = await import('./contracts.service')
    const mapeado = mapBackendContract({ ...contratoSinInmueble(), code: 7 } as never) as unknown as Record<
      string,
      unknown
    >

    expect('code' in mapeado).toBe(true)
    expect('codigo' in mapeado).toBe(false)
    expect('contractCode' in mapeado).toBe(false)
    expect('numero' in mapeado).toBe(false)
    expect('consecutivo' in mapeado).toBe(false)
  })
})
