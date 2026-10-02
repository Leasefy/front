/**
 * @vitest-environment happy-dom
 *
 * El estado de la conexión con Leasefy (capa 1 de las caídas, 01-10-2026).
 * Lo que se fija acá es el CONTRATO: qué cuenta como «Leasefy entero no
 * responde», qué cuenta como «sin internet» y qué lo devuelve a «bien».
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  avisarFallaDeRed,
  avisarQueLeasefyNoResponde,
  avisarQueLeasefyRespondio,
  CODIGO_LEASEFY_NO_RESPONDE,
  esErrorDeConexion,
  esperaDelIntento,
  esRespuestaDeCaidaGeneral,
  estadoDeConexion,
  preguntarSiLeasefyVolvio,
  reiniciarEstadoDeConexion,
  suscribirseALaConexion,
} from './estado-de-conexion'

function ponerEnLinea(enLinea: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value: enLinea, configurable: true })
}

beforeEach(() => {
  ponerEnLinea(true)
  reiniciarEstadoDeConexion()
})

afterEach(() => {
  ponerEnLinea(true)
  reiniciarEstadoDeConexion()
})

describe('qué respuesta es «Leasefy entero no responde»', () => {
  it('un 502/503/504 sin el statusCode de nuestro filtro: lo mandó el balanceador', () => {
    expect(esRespuestaDeCaidaGeneral(502, {})).toBe(true)
    expect(esRespuestaDeCaidaGeneral(503, { message: 'Service Unavailable' })).toBe(true)
    expect(esRespuestaDeCaidaGeneral(504, null)).toBe(true)
  })

  it('un 503 de NUESTRO back no es una caída general, traiga el code que traiga', () => {
    expect(
      esRespuestaDeCaidaGeneral(503, { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio: 'asistente' }),
    ).toBe(false)
    expect(
      esRespuestaDeCaidaGeneral(503, { statusCode: 503, code: 'CENTRO_DE_PROCESOS_SIN_MIGRACION' }),
    ).toBe(false)
  })

  it('un 502 del back contando que Wompi falló (BadGatewayException) tampoco: el back contestó', () => {
    expect(esRespuestaDeCaidaGeneral(502, { statusCode: 502, code: 'INVITACION_FALLIDA' })).toBe(false)
  })

  it('un cuerpo con `code` propio es del back aunque no traiga statusCode: el balanceador no manda códigos', () => {
    expect(esRespuestaDeCaidaGeneral(503, { code: 'payment_verification_unavailable' })).toBe(false)
  })

  it('un 500 o un 404 nunca son caída general', () => {
    expect(esRespuestaDeCaidaGeneral(500, {})).toBe(false)
    expect(esRespuestaDeCaidaGeneral(404, {})).toBe(false)
  })
})

describe('el estado', () => {
  it('arranca bien', () => {
    expect(estadoDeConexion()).toBe('bien')
  })

  it('una falla de red con navigator.onLine === false es «sin internet»', () => {
    ponerEnLinea(false)
    avisarFallaDeRed()
    expect(estadoDeConexion()).toBe('sin-internet')
  })

  it('una falla de red con el navegador en línea es «Leasefy no responde»', () => {
    avisarFallaDeRed()
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })

  it('el balanceador contestando por el back es «Leasefy no responde»', () => {
    avisarQueLeasefyNoResponde()
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
  })

  it('cualquier respuesta del back lo devuelve a bien', () => {
    avisarFallaDeRed()
    avisarQueLeasefyRespondio()
    expect(estadoDeConexion()).toBe('bien')
  })

  it('avisa a quien esté suscrito, y sólo cuando cambia', () => {
    const oyente = vi.fn()
    const soltar = suscribirseALaConexion(oyente)
    avisarFallaDeRed()
    avisarFallaDeRed()
    expect(oyente).toHaveBeenCalledTimes(1)
    avisarQueLeasefyRespondio()
    expect(oyente).toHaveBeenCalledTimes(2)
    soltar()
    avisarFallaDeRed()
    expect(oyente).toHaveBeenCalledTimes(2)
  })

  it('escucha offline/online del navegador', () => {
    const soltar = suscribirseALaConexion(() => {})
    ponerEnLinea(false)
    window.dispatchEvent(new Event('offline'))
    expect(estadoDeConexion()).toBe('sin-internet')
    ponerEnLinea(true)
    window.dispatchEvent(new Event('online'))
    expect(estadoDeConexion()).toBe('bien')
    soltar()
  })

  it('«online» no tapa un «Leasefy no responde»: tener red no prueba que el back conteste', () => {
    const soltar = suscribirseALaConexion(() => {})
    avisarQueLeasefyNoResponde()
    window.dispatchEvent(new Event('online'))
    expect(estadoDeConexion()).toBe('leasefy-no-responde')
    soltar()
  })
})

describe('qué error es de conexión', () => {
  it('el ApiError(0) del fetch que no salió y el de la caída general', () => {
    expect(esErrorDeConexion({ status: 0 })).toBe(true)
    expect(esErrorDeConexion({ status: 503, code: CODIGO_LEASEFY_NO_RESPONDE })).toBe(true)
  })

  it('un 503 de servicio o un 500 no lo son', () => {
    expect(esErrorDeConexion({ status: 503, code: 'SERVICIO_NO_DISPONIBLE' })).toBe(false)
    expect(esErrorDeConexion({ status: 500 })).toBe(false)
    expect(esErrorDeConexion(null)).toBe(false)
  })
})

describe('preguntar si volvió', () => {
  it('espera 5 s, 10 s, 20 s, 40 s y de ahí cada minuto', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(esperaDelIntento)).toEqual([
      5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000,
    ])
  })

  it('sólo un 200 de /health cuenta como «volvió»', async () => {
    const ok = vi.fn().mockResolvedValue({ status: 200 })
    const baseCaida = vi.fn().mockResolvedValue({ status: 503 })
    const sinCamino = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await preguntarSiLeasefyVolvio(ok as unknown as typeof fetch)).toBe(true)
    expect(await preguntarSiLeasefyVolvio(baseCaida as unknown as typeof fetch)).toBe(false)
    expect(await preguntarSiLeasefyVolvio(sinCamino as unknown as typeof fetch)).toBe(false)
    expect(String(ok.mock.calls[0][0])).toMatch(/\/health$/)
  })

  it('sin red ni pregunta', async () => {
    ponerEnLinea(false)
    const f = vi.fn()
    expect(await preguntarSiLeasefyVolvio(f as unknown as typeof fetch)).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })
})
