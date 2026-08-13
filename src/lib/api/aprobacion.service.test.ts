import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  fetchAprobacion,
  parseAprobacion,
  diasParaVencer,
  estadoVigencia,
  DIAS_POR_VENCER,
  seLePuedePrometerSinCodeudor,
} from './aprobacion.service'
import { ApiError, apiClient } from './client'

/*
 * Se espía el cliente REAL, y el spy se crea dentro de cada test.
 *
 * Dos cosas que costaron encontrar:
 *  - Con `vi.mock('./client') + importActual`, el `ApiError` del test y el del
 *    servicio son CLASES DISTINTAS (dos instancias del módulo), así que el
 *    `instanceof` del servicio daba false y el 404 se propagaba.
 *  - Con el spy creado a nivel de módulo + `mockReset()` en `beforeEach`, los
 *    casos que rechazan quedaban reportados como error suelto del archivo.
 *    Creándolo por test, cada uno es dueño de su doble.
 */
function espiarGet() {
  return vi.spyOn(apiClient, 'get')
}

const OK = {
  estado: 'aprobado',
  topeAprobadoCop: 1_800_000,
  aseguradoras: [{ nombre: 'Fianli', aprobada: true }],
  vigenteHasta: '2026-09-01T00:00:00.000Z',
  resueltoEn: '2026-08-01T00:00:00.000Z',
}

/**
 * ── Acá vivían los tests del fixture ─────────────────────────────────────
 *
 * `mockAprobacion()` fabricaba una aprobación de $2.400.000 SIN marca de demo
 * —a diferencia del funnel, que viaja con `stubMode`— así que la pantalla la
 * mostraba como un hecho y el catálogo filtraba inmuebles reales contra un
 * techo inventado. Existía porque el endpoint no estaba: daba 404 en el
 * agente.
 *
 * Ahora está, en el back (`GET /tenant/aprobacion`). El fixture se borró y
 * estos tests pasaron a cubrir lo único que importa de este cliente: que
 * pregunte al lugar correcto, que "todavía no te estudiaste" NO sea un error,
 * y que un fallo de verdad se propague en vez de convertirse en un número.
 */
describe('fetchAprobacion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('le pregunta al back, no al agente', async () => {
    const getMock = espiarGet().mockResolvedValue(OK)

    const r = await fetchAprobacion()

    expect(getMock).toHaveBeenCalledTimes(1)
    expect(getMock).toHaveBeenCalledWith('/tenant/aprobacion')
    expect(r.topeAprobadoCop).toBe(1_800_000)
  })

  it('sin estudio es un estado, no un error: llega con 200 desde el back', async () => {
    // El back devuelve la forma completa con `sin_estudio`; no hay 404 que
    // traducir, y por eso tampoco hay excepción que atrapar en la pantalla.
    espiarGet().mockResolvedValue({ estado: 'sin_estudio', topeAprobadoCop: null })

    const r = await fetchAprobacion()

    expect(r.estado).toBe('sin_estudio')
    expect(r.topeAprobadoCop).toBeNull()
  })

  it('un 404 de una capa intermedia tampoco rompe', async () => {
    espiarGet().mockImplementation(async () => {
      throw new ApiError(404, 'Not Found')
    })

    await expect(fetchAprobacion()).resolves.toMatchObject({ estado: 'sin_estudio' })
  })

  it('cualquier otro fallo se propaga — no se inventa una aprobación', async () => {
    espiarGet().mockImplementation(async () => {
      throw new ApiError(500, 'Boom')
    })

    await expect(fetchAprobacion()).rejects.toBeInstanceOf(ApiError)
  })

  it('ni siquiera con el override de mock puesto fabrica algo', async () => {
    // La env que antes prendía el fixture ya no existe en este camino.
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    espiarGet().mockImplementation(async () => {
      throw new ApiError(503, 'Service Unavailable')
    })

    await expect(fetchAprobacion()).rejects.toBeInstanceOf(ApiError)
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

describe('seLePuedePrometerSinCodeudor', () => {
  /*
   * La ficha de propiedad decía «Sin codeudor — aplica solo con tu información»
   * escrito a mano, en TODAS. Se lo prometía también a quien tenía la
   * aprobación condicionada, que es justo a quien la aseguradora sí le pide
   * uno: la promesa la descubría rota cuando ya se había ilusionado.
   */
  const aprobada = {
    estado: 'aprobado' as const,
    topeAprobadoCop: 2_400_000,
    aseguradoras: [],
    vigenteHasta: null,
    resueltoEn: null,
    condicionada: false,
    canonConsultadoCop: null,
  }

  it('aprobada y sin condiciones: sí se le puede prometer', () => {
    expect(seLePuedePrometerSinCodeudor(aprobada)).toBe(true)
  })

  it('aprobada CON condiciones: no', () => {
    expect(seLePuedePrometerSinCodeudor({ ...aprobada, condicionada: true })).toBe(false)
  })

  it('sin aprobación resuelta no se afirma nada — ni que sí ni que no', () => {
    // `null` no es un `false` disfrazado: no saber no es poder prometer.
    expect(seLePuedePrometerSinCodeudor(null)).toBeNull()
    expect(seLePuedePrometerSinCodeudor({ ...aprobada, estado: 'sin_estudio' })).toBeNull()
    expect(seLePuedePrometerSinCodeudor({ ...aprobada, estado: 'en_proceso' })).toBeNull()
    expect(seLePuedePrometerSinCodeudor({ ...aprobada, estado: 'rechazado' })).toBeNull()
  })
})
