/**
 * T-0168 §3.1: las dos rutas de la cartera por factura. Sólo el cable: método,
 * ruta y cuerpo (la lista entera en UNA llamada, nunca en tandas).
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

const LINEAS = [
  { fila: 2, fecha: '2026-01-05', documento: '900111222', nombre: null, concepto: 'Canon', valorCop: 1_500_000.5 },
]

describe('contractsApi.migracion.carteraPorFactura', () => {
  it('la vista previa va a .../vista-previa con { lineas }', async () => {
    const f = respuesta({})
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.migracion.carteraPorFactura(LINEAS, true)
    expect(llamada(f)).toEqual({
      url: `${BACKEND_URL}/contracts/migrar/cartera-por-factura/vista-previa`,
      method: 'POST',
      body: { lineas: LINEAS },
    })
  })

  it('la carga va a .../cartera-por-factura con { lineas }', async () => {
    const f = respuesta({})
    globalThis.fetch = f as typeof globalThis.fetch
    await contractsApi.migracion.carteraPorFactura(LINEAS, false)
    expect(llamada(f)).toEqual({
      url: `${BACKEND_URL}/contracts/migrar/cartera-por-factura`,
      method: 'POST',
      body: { lineas: LINEAS },
    })
  })
})
