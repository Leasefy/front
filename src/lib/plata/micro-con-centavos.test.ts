import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fijarPlataDelMicroParaPruebas,
  leerConfigDePlataDelMicro,
  plataDelMicroConCentavosAhora,
  refrescarPlataDelMicro,
} from './micro-con-centavos'

const URL_ORIGINAL = process.env.NEXT_PUBLIC_AGENT_URL

afterEach(() => {
  vi.restoreAllMocks()
  fijarPlataDelMicroParaPruebas(null)
  if (URL_ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_AGENT_URL
  else process.env.NEXT_PUBLIC_AGENT_URL = URL_ORIGINAL
})

describe('la llave del micro (GET /config/plata del micro, C4)', () => {
  it('sólo un true literal en conCentavos.agent prende', () => {
    expect(leerConfigDePlataDelMicro({ conCentavos: { agent: true } })).toBe(true)
    expect(leerConfigDePlataDelMicro({ conCentavos: { agent: 'true' } })).toBe(false)
    expect(leerConfigDePlataDelMicro({ conCentavos: {} })).toBe(false)
    expect(leerConfigDePlataDelMicro(null)).toBe(false)
    expect(leerConfigDePlataDelMicro([])).toBe(false)
  })

  it('pregunta al micro y recuerda la respuesta', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test/'
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ conCentavos: { agent: true } }), { status: 200 }))
    expect(await refrescarPlataDelMicro()).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('http://micro.test/config/plata')
    expect(plataDelMicroConCentavosAhora()).toBe(true)
    await refrescarPlataDelMicro()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('un micro viejo (404), una falla de red o sin URL: sin centavos, como hoy', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 404 }))
    expect(await refrescarPlataDelMicro()).toBe(false)
    fijarPlataDelMicroParaPruebas(null)
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await refrescarPlataDelMicro()).toBe(false)
    fijarPlataDelMicroParaPruebas(null)
    delete process.env.NEXT_PUBLIC_AGENT_URL
    expect(await refrescarPlataDelMicro()).toBe(false)
  })
})
