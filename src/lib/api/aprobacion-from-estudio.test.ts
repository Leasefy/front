import { describe, expect, it } from 'vitest'

import { SIN_APROBACION } from './aprobacion.service'
import { mapEstudioToAprobacion } from './aprobacion-from-estudio'
import type { EstudioDeCanon, ResultadoDelEstudio } from './estudio-de-canon.types'

const RESULTADO: ResultadoDelEstudio = {
  canonMaximoCop: 2_450_000,
  ingresoVerificadoCop: 7_500_000,
  letra: 'B',
  puntaje: 71,
  veredicto: 'FACIL',
  condiciones: [],
  explicacion: [],
  revisiones: [],
  conHistorial: false,
}

function estudio(parcial: Partial<EstudioDeCanon>): EstudioDeCanon {
  return {
    id: 'e1',
    status: 'DRAFT',
    creadoEl: '2026-10-28T10:00:00.000Z',
    terminadoEl: null,
    venceEl: null,
    documentos: [],
    faltan: [],
    resultado: null,
    error: null,
    ...parcial,
  }
}

describe('mapEstudioToAprobacion', () => {
  it('maps no study to sin_estudio', () => {
    expect(mapEstudioToAprobacion(null)).toEqual(SIN_APROBACION)
  })

  it('maps DRAFT and FAILED to sin_estudio', () => {
    expect(mapEstudioToAprobacion(estudio({ status: 'DRAFT' }))).toEqual(SIN_APROBACION)
    expect(
      mapEstudioToAprobacion(estudio({ status: 'FAILED', error: { codigo: 'TIMEOUT', mensaje: 'x' } })),
    ).toEqual(SIN_APROBACION)
  })

  it('maps PROCESSING to en_proceso without a number', () => {
    const a = mapEstudioToAprobacion(estudio({ status: 'PROCESSING' }))
    expect(a.estado).toBe('en_proceso')
    expect(a.topeAprobadoCop).toBeNull()
  })

  it('maps COMPLETED with a canon to aprobado using the back figure verbatim', () => {
    const a = mapEstudioToAprobacion(
      estudio({
        status: 'COMPLETED',
        terminadoEl: '2026-10-28T10:02:00.000Z',
        venceEl: '2027-04-28T10:02:00.000Z',
        resultado: RESULTADO,
      }),
    )
    expect(a).toEqual({
      estado: 'aprobado',
      topeAprobadoCop: 2_450_000,
      aseguradoras: [],
      vigenteHasta: '2027-04-28T10:02:00.000Z',
      resueltoEn: '2026-10-28T10:02:00.000Z',
      condicionada: false,
      canonConsultadoCop: null,
    })
  })

  it('flags condicionada when the bureau returns conditions', () => {
    const a = mapEstudioToAprobacion(
      estudio({ status: 'COMPLETED', resultado: { ...RESULTADO, condiciones: ['Codeudor'] } }),
    )
    expect(a.estado).toBe('aprobado')
    expect(a.condicionada).toBe(true)
  })

  it('maps COMPLETED without a verified canon to rechazado, never to $0', () => {
    const a = mapEstudioToAprobacion(
      estudio({ status: 'COMPLETED', resultado: { ...RESULTADO, canonMaximoCop: null, veredicto: 'REVISAR' } }),
    )
    expect(a.estado).toBe('rechazado')
    expect(a.topeAprobadoCop).toBeNull()
  })

  it('maps COMPLETED with no result object to rechazado', () => {
    expect(mapEstudioToAprobacion(estudio({ status: 'COMPLETED', resultado: null })).estado).toBe('rechazado')
  })
})
