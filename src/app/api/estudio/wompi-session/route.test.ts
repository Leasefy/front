/**
 * La sesión de pago del estudio.
 *
 * Lo que se protege: que **nunca se cobre un precio inventado**. Si
 * `ESTUDIO_PRECIO_COP` no está definido, el endpoint tiene que negarse — no
 * caer en un default silencioso que le saque plata a alguien.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { POST } from './route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/estudio/wompi-session', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

afterEach(() => vi.unstubAllEnvs())

function conWompi() {
  vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'secreto-de-prueba')
  vi.stubEnv('WOMPI_PUBLIC_KEY', 'pub_test_123')
}

describe('POST /api/estudio/wompi-session', () => {
  it('exige solicitudId', async () => {
    conWompi()
    vi.stubEnv('ESTUDIO_PRECIO_COP', '55000')
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('rechaza un body que no es JSON', async () => {
    conWompi()
    const res = await POST(req('no-json'))
    expect(res.status).toBe(400)
  })

  it('sin credenciales de Wompi no arma la sesión', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', '')
    vi.stubEnv('WOMPI_PUBLIC_KEY', '')
    const res = await POST(req({ solicitudId: 's1' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('wompi_not_configured')
  })

  describe('el precio no se inventa', () => {
    it('sin ESTUDIO_PRECIO_COP responde 503, no cobra un default', async () => {
      conWompi()
      vi.stubEnv('ESTUDIO_PRECIO_COP', undefined)
      const res = await POST(req({ solicitudId: 's1' }))
      expect(res.status).toBe(503)
      expect((await res.json()).error).toBe('estudio_precio_no_configurado')
    })

    it.each(['0', '-1', 'gratis', ''])('un precio inválido (%s) tampoco pasa', async (v) => {
      conWompi()
      vi.stubEnv('ESTUDIO_PRECIO_COP', v)
      const res = await POST(req({ solicitudId: 's1' }))
      expect(res.status).toBe(503)
    })
  })

  it('con todo configurado devuelve la sesión y el hash correcto', async () => {
    conWompi()
    vi.stubEnv('ESTUDIO_PRECIO_COP', '55000')
    const res = await POST(req({ solicitudId: 'abc' }))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.reference).toBe('estudio-abc')
    expect(body.amountInCents).toBe(5_500_000) // pesos → centavos
    expect(body.currency).toBe('COP')
    expect(body.publicKey).toBe('pub_test_123')

    const esperado = createHash('sha256')
      .update('estudio-abc5500000COPsecreto-de-prueba')
      .digest('hex')
    expect(body.integrity).toBe(esperado)
  })

  it('nunca devuelve el secreto de integridad', async () => {
    conWompi()
    vi.stubEnv('ESTUDIO_PRECIO_COP', '55000')
    const res = await POST(req({ solicitudId: 'abc' }))
    expect(JSON.stringify(await res.json())).not.toContain('secreto-de-prueba')
  })
})
