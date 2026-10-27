/**
 * «Cambiar de cuenta»: todas las rutas de pago del inquilino reenvían
 * `x-cuenta` / `x-inmobiliaria` al back (que exige el papel de inquilino) en la
 * PRIMERA petición que le hacen, la que decide el monto.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as unaCuota } from './wompi-session/route'
import { POST as loVencido } from './vencido/wompi-session/route'
import { POST as unAcuerdo } from '../acuerdos/wompi-session/route'

const realFetch = globalThis.fetch

beforeEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = 'secreto_de_prueba'
  process.env.WOMPI_PUBLIC_KEY = 'pub_test'
})
afterEach(() => {
  globalThis.fetch = realFetch
})

const RUTAS: [string, (r: Request) => Promise<Response>, Record<string, unknown>][] = [
  ['pagos/wompi-session', unaCuota, { leaseId: 'lease-1' }],
  ['pagos/vencido/wompi-session', loVencido, { leaseId: 'lease-1', cuotas: 1 }],
  ['acuerdos/wompi-session', unAcuerdo, { planId: 'plan-1', cuotaNumber: 1 }],
]

function pedido(body: unknown, headers: Record<string, string>): Request {
  return new Request('http://localhost/api/inquilino/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer jwt', ...headers },
    body: JSON.stringify(body),
  })
}

function backNoEncuentra() {
  const f = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as unknown as Response)
  globalThis.fetch = f as unknown as typeof fetch
  return f
}

describe.each(RUTAS)('%s', (_nombre, POST, body) => {
  it('🔴 reenvía x-cuenta y x-inmobiliaria al back', async () => {
    const f = backNoEncuentra()
    await POST(pedido(body, { 'x-cuenta': 'inquilino', 'x-inmobiliaria': 'alfa' }))
    const headers = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers).toMatchObject({ Authorization: 'Bearer jwt', 'x-cuenta': 'inquilino', 'x-inmobiliaria': 'alfa' })
  })

  it('sin esas cabeceras no inventa ninguna', async () => {
    const f = backNoEncuentra()
    await POST(pedido(body, {}))
    const headers = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers).not.toHaveProperty('x-cuenta')
  })
})
