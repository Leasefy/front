/**
 * T-0163 §3.1: las rutas de los inquilinos del contrato y del reparto de la
 * factura. Sólo el cable: método, ruta y cuerpo (sin claves de más).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { contractsApi } from './contracts.service'

const BACKEND_URL = 'http://localhost:3000'

function respuesta(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response)
}

function llamada(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined }
}

afterEach(() => vi.restoreAllMocks())

describe('contractsApi: reparto de la factura entre inquilinos', () => {
  it('repartirFactura -> PUT .../inquilinos/participaciones con la lista tal cual', async () => {
    const f = respuesta([])
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.repartirFactura('c-1', [
      { inquilinoId: null, participacionBps: 6000 },
      { inquilinoId: 'ci-1', participacionBps: 4000 },
    ])
    expect(llamada(f)).toEqual({
      url: `${BACKEND_URL}/contracts/c-1/inquilinos/participaciones`,
      method: 'PUT',
      body: {
        participaciones: [
          { inquilinoId: null, participacionBps: 6000 },
          { inquilinoId: 'ci-1', participacionBps: 4000 },
        ],
      },
    })
  })

  it('quitarReparto -> DELETE .../inquilinos/participaciones', async () => {
    const f = respuesta([])
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.quitarReparto('c-1')
    expect(llamada(f)).toMatchObject({
      url: `${BACKEND_URL}/contracts/c-1/inquilinos/participaciones`,
      method: 'DELETE',
    })
  })

  it('actualizarInquilino -> PATCH con tipoDocumento como ÚNICA clave', async () => {
    const f = respuesta([])
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.actualizarInquilino('c-1', 'ci-9', { tipoDocumento: 'CE' })
    expect(llamada(f)).toEqual({
      url: `${BACKEND_URL}/contracts/c-1/inquilinos/ci-9`,
      method: 'PATCH',
      body: { tipoDocumento: 'CE' },
    })
  })

  it('agregarInquilino sin tipo no manda la clave (un back anterior la rechaza)', async () => {
    const f = respuesta([])
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.agregarInquilino('c-1', { nombre: 'A', documento: '1' })
    expect(llamada(f).body).toEqual({ nombre: 'A', documento: '1' })
  })

  it('agregarInquilino con tipo elegido lo manda', async () => {
    const f = respuesta([])
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.agregarInquilino('c-1', { nombre: 'A', documento: '1', tipoDocumento: 'NIT' })
    expect(llamada(f).body).toEqual({ nombre: 'A', documento: '1', tipoDocumento: 'NIT' })
  })
})
