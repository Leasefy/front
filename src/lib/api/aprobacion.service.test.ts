import { describe, it, expect } from 'vitest'
import {
  parseAprobacion,
  diasParaVencer,
  estadoVigencia,
  DIAS_POR_VENCER,
  seLePuedePrometerSinCodeudor,
} from './aprobacion.service'

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
