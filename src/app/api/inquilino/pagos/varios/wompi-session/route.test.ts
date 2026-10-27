/**
 * «Cambiar de cuenta»: el back exige el papel de inquilino en
 * `POST /portal/pago-en-linea/varios`. Quien además es de una inmobiliaria sólo
 * lo cumple si la ruta reenvía `x-cuenta` / `x-inmobiliaria` junto al JWT.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const realFetch = globalThis.fetch

beforeEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = 'secreto_de_prueba'
  process.env.WOMPI_PUBLIC_KEY = 'pub_test'
})
afterEach(() => {
  globalThis.fetch = realFetch
})

function pedido(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/inquilino/pagos/varios/wompi-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer jwt', ...headers },
    body: JSON.stringify({ arriendos: [{ leaseId: 'lease-1', cuotas: 1 }] }),
  })
}

function backResponde() {
  const f = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ reference: 'vencido-1', amountInCents: 100000, currency: 'COP', totalCop: 1000 }),
  } as unknown as Response)
  globalThis.fetch = f as unknown as typeof fetch
  return f
}

describe('POST /api/inquilino/pagos/varios/wompi-session — la cuenta viaja al back', () => {
  it('🔴 reenvía x-cuenta y x-inmobiliaria con el Authorization', async () => {
    const f = backResponde()
    const res = await POST(pedido({ 'x-cuenta': 'inquilino', 'x-inmobiliaria': 'alfa' }))
    expect(res.status).toBe(200)
    const init = f.mock.calls[0][1] as RequestInit
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer jwt',
      'x-cuenta': 'inquilino',
      'x-inmobiliaria': 'alfa',
    })
  })

  it('sin esas cabeceras no inventa ninguna (como antes)', async () => {
    const f = backResponde()
    await POST(pedido({}))
    const headers = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers).not.toHaveProperty('x-cuenta')
    expect(headers).not.toHaveProperty('x-inmobiliaria')
  })
})
