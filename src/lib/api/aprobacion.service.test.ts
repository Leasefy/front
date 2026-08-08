import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchAprobacion,
  parseAprobacion,
  diasParaVencer,
  estadoVigencia,
  DIAS_POR_VENCER,
} from './aprobacion.service'

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

const OK = {
  estado: 'aprobado',
  topeAprobadoCop: 1_800_000,
  aseguradoras: [{ nombre: 'Fianli', aprobada: true }],
  vigenteHasta: '2026-09-01T00:00:00.000Z',
  resueltoEn: '2026-08-01T00:00:00.000Z',
}

describe('fetchAprobacion — postura de producción', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', undefined)
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.unstubAllEnvs()
  })

  /*
   * El caso que motivó la guarda de `NODE_ENV`. `mockAprobacion()` devuelve un
   * `Aprobacion` **sin ninguna marca de demo** —a diferencia del funnel, que
   * viaja con `stubMode`— así que la pantalla lo muestra como un hecho y el
   * catálogo filtra propiedades reales contra un techo inventado. Alcanzaba con
   * que `NEXT_PUBLIC_AGENT_URL` faltara en el deploy para fabricarle a una
   * persona real una aprobación de $2.400.000 que nadie le dio.
   */
  it('en producción NO fabrica una aprobación aunque falte la URL del agente', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    const f = mockFetch(404, {})
    globalThis.fetch = f

    const r = await fetchAprobacion()

    expect(f).toHaveBeenCalledTimes(1) // intentó de verdad, no cortó al mock
    expect(r.estado).toBe('sin_estudio')
    expect(r.topeAprobadoCop).toBeNull()
  })

  it('en producción tampoco fabrica con el override de mock puesto', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const f = mockFetch(404, {})
    globalThis.fetch = f

    const r = await fetchAprobacion()

    expect(f).toHaveBeenCalledTimes(1)
    expect(r.estado).toBe('sin_estudio')
  })

  it('con la URL del agente puesta y sin override, pega de verdad', async () => {
    const f = mockFetch(200, OK)
    globalThis.fetch = f
    const r = await fetchAprobacion()
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0][0])).toBe('http://agent.test/api/tenant/aprobacion')
    expect(r.topeAprobadoCop).toBe(1_800_000)
  })

  it('"false" explícito tampoco activa el mock', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false')
    const f = mockFetch(200, OK)
    globalThis.fetch = f
    await fetchAprobacion()
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('404 no es error: es el primer estado del recorrido', async () => {
    globalThis.fetch = mockFetch(404, null)
    const r = await fetchAprobacion()
    expect(r.estado).toBe('sin_estudio')
    expect(r.topeAprobadoCop).toBeNull()
  })

  it('un 500 sí falla, con mensaje en español', async () => {
    globalThis.fetch = mockFetch(500, null)
    await expect(fetchAprobacion()).rejects.toThrow(/aprobación/i)
  })
})

describe('fetchAprobacion — modo mock', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sin agente configurado sirve el fixture, sin tocar la red', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    const f = vi.fn()
    globalThis.fetch = f
    const r = await fetchAprobacion()
    expect(f).not.toHaveBeenCalled()
    expect(r.estado).toBe('aprobado')
    expect(r.topeAprobadoCop).toBeGreaterThan(0)
  })

  it('el override fuerza el mock aun con la URL puesta', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    const f = vi.fn()
    globalThis.fetch = f
    await fetchAprobacion()
    expect(f).not.toHaveBeenCalled()
  })

  it('el fixture viene vigente, para que dev no vea siempre una aprobación vencida', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')
    const r = await fetchAprobacion()
    expect(diasParaVencer(r.vigenteHasta)).toBeGreaterThan(DIAS_POR_VENCER)
  })
})

describe('parseAprobacion — nunca inventa datos', () => {
  it('sin tope devuelve null, no un cero ni un número inventado', () => {
    expect(parseAprobacion({ estado: 'aprobado' }).topeAprobadoCop).toBeNull()
  })

  it('un tope no numérico se descarta', () => {
    expect(parseAprobacion({ topeAprobadoCop: 'mucho' }).topeAprobadoCop).toBeNull()
    expect(parseAprobacion({ topeAprobadoCop: Number.NaN }).topeAprobadoCop).toBeNull()
  })

  it('un estado desconocido cae en sin_estudio, no rompe la pantalla', () => {
    expect(parseAprobacion({ estado: 'lo_que_sea' }).estado).toBe('sin_estudio')
  })

  it('tolera basura completa', () => {
    const r = parseAprobacion(null)
    expect(r.estado).toBe('sin_estudio')
    expect(r.aseguradoras).toEqual([])
  })

  it('descarta aseguradoras sin nombre y asume no-aprobada si no lo dice', () => {
    const r = parseAprobacion({ aseguradoras: [{ nombre: 'Sura' }, { aprobada: true }, null] })
    expect(r.aseguradoras).toEqual([{ nombre: 'Sura', aprobada: false }])
  })
})

describe('vigencia', () => {
  const ahora = new Date('2026-08-10T15:00:00.000Z')

  it('cuenta días calendario, sin que influya la hora', () => {
    expect(diasParaVencer('2026-08-12T01:00:00.000Z', ahora)).toBe(2)
    expect(diasParaVencer('2026-08-12T23:00:00.000Z', ahora)).toBe(2)
  })

  it('vencida da negativo', () => {
    expect(diasParaVencer('2026-08-08T00:00:00.000Z', ahora)).toBe(-2)
  })

  it('sin fecha o con fecha inválida devuelve null', () => {
    expect(diasParaVencer(null, ahora)).toBeNull()
    expect(diasParaVencer('no-es-fecha', ahora)).toBeNull()
  })

  it('traduce a urgencia', () => {
    expect(estadoVigencia(30)).toBe('vigente')
    expect(estadoVigencia(DIAS_POR_VENCER)).toBe('por_vencer')
    expect(estadoVigencia(0)).toBe('por_vencer')
    expect(estadoVigencia(-1)).toBe('vencida')
    expect(estadoVigencia(null)).toBeNull()
  })
})
