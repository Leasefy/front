import { describe, it, expect, vi } from 'vitest'
import { conBackoff } from './fetch-with-backoff'

/**
 * T-0076: el 429 de `agents_limit` en NGINX no siempre llega como estado 429
 * legible — sin `Access-Control-Allow-Origin` en la página de error, el
 * navegador lo reporta como un fallo de red (`TypeError: Failed to fetch`),
 * indistinguible de estar sin conexión (ver ledger §2.1). `conBackoff`
 * reintenta un número acotado de veces, con una espera creciente, tanto
 * sobre un 429 explícito como sobre esa excepción de red — es exactamente el
 * caso que hoy tumba el Piloto en producción.
 */
function respuesta(status: number): Response {
  return new Response(null, { status })
}

describe('conBackoff', () => {
  it('sin 429 de por medio, llama una sola vez', async () => {
    const hacer = vi.fn().mockResolvedValue(respuesta(200))
    const res = await conBackoff(hacer)
    expect(hacer).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(200)
  })

  it('reintenta un 429 y devuelve la respuesta buena del segundo intento', async () => {
    const hacer = vi
      .fn()
      .mockResolvedValueOnce(respuesta(429))
      .mockResolvedValueOnce(respuesta(200))
    const res = await conBackoff(hacer, undefined, { esperaBaseMs: 1 })
    expect(hacer).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(200)
  })

  it('reintenta un fetch que revienta con TypeError (el 429 sin CORS de NGINX)', async () => {
    const hacer = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(respuesta(200))
    const res = await conBackoff(hacer, undefined, { esperaBaseMs: 1 })
    expect(hacer).toHaveBeenCalledTimes(2)
    expect(res.status).toBe(200)
  })

  it('agota los reintentos y devuelve la última respuesta 429 (no inventa un 200)', async () => {
    const hacer = vi.fn().mockResolvedValue(respuesta(429))
    const res = await conBackoff(hacer, undefined, { esperaBaseMs: 1, reintentos: 2 })
    expect(hacer).toHaveBeenCalledTimes(3) // intento inicial + 2 reintentos
    expect(res.status).toBe(429)
  })

  it('agota los reintentos y relanza el último error de red', async () => {
    const hacer = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(
      conBackoff(hacer, undefined, { esperaBaseMs: 1, reintentos: 2 }),
    ).rejects.toThrow('Failed to fetch')
    expect(hacer).toHaveBeenCalledTimes(3)
  })

  it('no reintenta si la señal ya está abortada', async () => {
    const controller = new AbortController()
    controller.abort()
    const hacer = vi.fn().mockResolvedValue(respuesta(429))
    const res = await conBackoff(hacer, controller.signal, { esperaBaseMs: 1 })
    expect(hacer).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(429)
  })

  it('un 200 normal no espera nada (no agrega latencia al camino feliz)', async () => {
    const hacer = vi.fn().mockResolvedValue(respuesta(200))
    const antes = Date.now()
    await conBackoff(hacer, undefined, { esperaBaseMs: 5000 })
    expect(Date.now() - antes).toBeLessThan(200)
  })
})
