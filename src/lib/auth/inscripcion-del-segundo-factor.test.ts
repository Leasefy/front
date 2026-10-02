/**
 * `apiDeAuth` — los fallos de Supabase salen en español y con la regla de oro
 * (02-10-2026): «Failed to fetch» no llega a la pantalla.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))

import { TOPE_MS, apiDeAuth, conTope } from './inscripcion-del-segundo-factor'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('apiDeAuth', () => {
  it('🔴 sin respuesta (el fetch no salió): habla de la conexión, no «Failed to fetch»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await apiDeAuth('/factors', 'token', { method: 'POST' }).catch((e: Error) => e)
    expect((error as Error).message).toMatch(/conexión/)
    expect((error as Error).message).not.toContain('Failed to fetch')
  })

  it('🔴 un 5xx: falló de nuestro lado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 500, msg: 'Internal Server Error' }), { status: 500 })),
    )
    const error = await apiDeAuth('/factors', 'token', { method: 'POST' }).catch((e: Error) => e)
    expect((error as Error).message).toMatch(/de nuestro lado/)
    expect((error as Error).message).not.toMatch(/conexi[oó]n|Internal/)
  })

  it('un código de GoTrue conocido, en español', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 422, error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' }), {
          status: 422,
        }),
      ),
    )
    const error = await apiDeAuth('/factors/f/verify', 'token', { method: 'POST' }).catch((e: Error) => e)
    expect((error as Error).message).toMatch(/^Código incorrecto/)
  })
})

/**
 * 🔴 02-10-2026 (Nico): cuando se agotan los 15 s, «El servicio de acceso no
 * respondió a tiempo. Intenta de nuevo en un momento.», sin nombrar a Supabase.
 */
describe('el tope de 15 s', () => {
  const FRASE = 'El servicio de acceso no respondió a tiempo. Intenta de nuevo en un momento.'

  afterEach(() => {
    vi.useRealTimers()
  })

  it('🔴 `apiDeAuth`: se agota el tiempo y lo dice sin nombrar al proveedor', async () => {
    vi.useFakeTimers()
    // Un fetch colgado que sólo se rinde cuando el `AbortController` lo corta.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, rechazar) => {
            init.signal?.addEventListener('abort', () =>
              rechazar(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
            )
          }),
      ),
    )
    const pendiente = apiDeAuth('/factors', 'token', { method: 'POST' }).catch((e: Error) => e)
    await vi.advanceTimersByTimeAsync(TOPE_MS)
    const error = (await pendiente) as Error
    expect(error.message).toBe(FRASE)
    expect(error.message).not.toMatch(/supabase/i)
  })

  it('`conTope` (el SDK con el mismo tope) dice lo mismo', async () => {
    vi.useFakeTimers()
    const pendiente = conTope(new Promise<never>(() => undefined)).catch((e: Error) => e)
    await vi.advanceTimersByTimeAsync(TOPE_MS)
    expect(((await pendiente) as Error).message).toBe(FRASE)
  })
})
