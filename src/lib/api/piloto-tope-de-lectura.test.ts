/**
 * 🟡 QA-PILOTO-95 r2 (06-10-2026): con el micro COLGADO (acepta la conexión y no contesta), la Cabina
 * se quedaba en esqueleto para siempre: sólo el pulso, el director y unas pocas lecturas tenían tope.
 * Ahora TODA lectura del Piloto tiene un tope por defecto: pasado, es el error «no contestó a tiempo»
 * que cada tarjeta dice en palabras, con su «Intentar de nuevo».
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const agentFetch = vi.fn()
vi.mock('./agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetch(...a) }))

import { ERROR_SIN_RESPUESTA, TOPE_DE_LECTURA_MS, fetchPilotoInbox, fetchPilotoTendencias, fetchPilotoActivity } from './piloto'

/** El micro colgado: nunca contesta; sólo se suelta cuando le cortan la señal. */
function colgado(_url: string, init?: { signal?: AbortSignal }) {
  return new Promise<Response>((_res, rej) => {
    init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true })
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test')
  agentFetch.mockReset().mockImplementation(colgado)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('toda lectura del Piloto tiene tope', () => {
  it.each([
    ['la Bandeja', () => fetchPilotoInbox('ag')],
    ['las tendencias', () => fetchPilotoTendencias('ag')],
    ['la actividad', () => fetchPilotoActivity('ag')],
  ])('%s: con el micro colgado, «no contestó a tiempo» al tope (no esqueleto eterno)', async (_que, leer) => {
    const p = leer()
    const resultado = expect(p).rejects.toThrow(ERROR_SIN_RESPUESTA)
    await vi.advanceTimersByTimeAsync(TOPE_DE_LECTURA_MS + 50)
    await resultado
  })

  it('el tope no se pasa de unos segundos razonables (lo que la persona espera mirando un esqueleto)', () => {
    expect(TOPE_DE_LECTURA_MS).toBeGreaterThanOrEqual(10_000)
    expect(TOPE_DE_LECTURA_MS).toBeLessThanOrEqual(30_000)
  })
})
