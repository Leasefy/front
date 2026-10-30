import { afterEach, describe, expect, it, vi } from 'vitest'

const { agentFetch } = vi.hoisted(() => ({ agentFetch: vi.fn() }))
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch }))

import { leerLoProgramadoListo, loProgramadoListoDe, urlDeLoProgramadoListo } from './programado-listo'

afterEach(() => {
  agentFetch.mockReset()
  vi.unstubAllEnvs()
})

describe('lo programado que quedó listo (D4)', () => {
  it('la ruta del micro, sólo con micro y con inmobiliaria', () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro')
    expect(urlDeLoProgramadoListo('ag-1')).toBe('http://micro/api/agency/ag-1/ai-hub/chat/programado/listo')
    expect(urlDeLoProgramadoListo(null)).toBeNull()
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    expect(urlDeLoProgramadoListo('ag-1')).toBeNull()
  })

  it('descarta lo mal formado y, sin nada, no hay aviso', () => {
    expect(loProgramadoListoDe({ listas: [], salieronSolas: [] })).toBeNull()
    expect(loProgramadoListoDe('x')).toBeNull()
    const r = loProgramadoListoDe({ listas: [{ id: 'p1', que: 'a', texto: 'b', desde: 'c' }, { id: 'p2' }], salieronSolas: [{ id: 3 }] })
    expect(r).toEqual({ listas: [{ id: 'p1', que: 'a', texto: 'b', desde: 'c' }], salieronSolas: [] })
  })

  it('nunca lanza: un error o una respuesta mala es «no hay aviso»', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro')
    agentFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect(await leerLoProgramadoListo('ag-1')).toBeNull()
    agentFetch.mockResolvedValueOnce(new Response('{}', { status: 503 }))
    expect(await leerLoProgramadoListo('ag-1')).toBeNull()
    agentFetch.mockResolvedValueOnce(new Response(JSON.stringify({ listas: [{ id: 'p1', que: 'a', texto: 'b', desde: 'c' }], salieronSolas: [] }), { status: 200 }))
    expect((await leerLoProgramadoListo('ag-1'))?.listas).toHaveLength(1)
  })
})
