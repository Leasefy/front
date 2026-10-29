import { describe, expect, it } from 'vitest'

import {
  documentosQueFaltan,
  hayAlgoQueSubir,
  mensajeDelErrorDelEstudio,
  parseEstudio,
  parseEstudioActual,
} from './estudio-de-canon.types'

const BASE = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'DRAFT',
  creadoEl: '2026-10-28T10:00:00.000Z',
  terminadoEl: null,
  venceEl: null,
  documentos: [],
  faltan: ['cedula', 'extracto_bancario'],
  resultado: null,
  error: null,
}

describe('parseEstudio', () => {
  it('parses a draft study', () => {
    const e = parseEstudio(BASE)
    expect(e).not.toBeNull()
    expect(e!.status).toBe('DRAFT')
    expect(e!.faltan).toEqual(['cedula', 'extracto_bancario'])
    expect(e!.resultado).toBeNull()
  })

  it('returns null when the id or the status are not usable', () => {
    expect(parseEstudio(null)).toBeNull()
    expect(parseEstudio({})).toBeNull()
    expect(parseEstudio({ ...BASE, id: undefined })).toBeNull()
    expect(parseEstudio({ ...BASE, status: 'WHATEVER' })).toBeNull()
  })

  it('derives "faltan" from the uploaded documents when the field is absent', () => {
    const { faltan: _omit, ...sinFaltan } = BASE
    const e = parseEstudio({ ...sinFaltan, documentos: [{ tipo: 'cedula' }] })
    expect(e!.faltan).toEqual(['extracto_bancario'])
  })

  it('drops unknown document types', () => {
    const e = parseEstudio({ ...BASE, documentos: [{ tipo: 'cedula' }, { tipo: 'selfie' }, 'x'] })
    expect(e!.documentos).toEqual([{ tipo: 'cedula' }])
  })

  it('parses a completed result and never turns a missing number into 0', () => {
    const e = parseEstudio({
      ...BASE,
      status: 'COMPLETED',
      terminadoEl: '2026-10-28T10:02:00.000Z',
      venceEl: '2027-04-28T10:02:00.000Z',
      faltan: [],
      resultado: {
        canonMaximoCop: 2_450_000,
        ingresoVerificadoCop: 7_500_000,
        letra: 'B',
        puntaje: 71,
        veredicto: 'CON_CONDICIONES',
        condiciones: ['Codeudor'],
        explicacion: ['Tu ingreso se verificó'],
        revisiones: [{ codigo: 'X', texto: 'Revisar' }],
        conHistorial: true,
      },
    })
    expect(e!.resultado).toEqual({
      canonMaximoCop: 2_450_000,
      ingresoVerificadoCop: 7_500_000,
      letra: 'B',
      puntaje: 71,
      veredicto: 'CON_CONDICIONES',
      condiciones: ['Codeudor'],
      explicacion: ['Tu ingreso se verificó'],
      revisiones: [{ codigo: 'X', texto: 'Revisar' }],
      conHistorial: true,
    })
    expect(e!.venceEl).toBe('2027-04-28T10:02:00.000Z')
  })

  it('maps absent / zero / non-finite money to null', () => {
    const e = parseEstudio({
      ...BASE,
      status: 'COMPLETED',
      resultado: { canonMaximoCop: 0, ingresoVerificadoCop: 'x', letra: 'Z', puntaje: NaN, veredicto: 'otro' },
    })
    expect(e!.resultado).toEqual({
      canonMaximoCop: null,
      ingresoVerificadoCop: null,
      letra: null,
      puntaje: null,
      veredicto: null,
      condiciones: [],
      explicacion: [],
      revisiones: [],
      conHistorial: false,
    })
  })

  it('ignores a result that is not an object and a non-FAILED error', () => {
    expect(parseEstudio({ ...BASE, status: 'COMPLETED', resultado: 'x' })!.resultado).toBeNull()
    const f = parseEstudio({ ...BASE, status: 'FAILED', error: { codigo: 'TIMEOUT', mensaje: 'Tardó' } })
    expect(f!.error).toEqual({ codigo: 'TIMEOUT', mensaje: 'Tardó' })
    expect(parseEstudio({ ...BASE, status: 'FAILED', error: { foo: 1 } })!.error).toEqual({
      codigo: 'ESTUDIO_FALLIDO',
      mensaje: '',
    })
  })
})

describe('parseEstudioActual', () => {
  it('reads the wrapped study', () => {
    expect(parseEstudioActual({ estudio: BASE })!.id).toBe(BASE.id)
  })
  it('returns null for { estudio: null } and garbage', () => {
    expect(parseEstudioActual({ estudio: null })).toBeNull()
    expect(parseEstudioActual(undefined)).toBeNull()
    expect(parseEstudioActual('x')).toBeNull()
  })
})

describe('documentosQueFaltan / hayAlgoQueSubir', () => {
  it('lists required types not uploaded', () => {
    expect(documentosQueFaltan([{ tipo: 'extracto_bancario' }])).toEqual(['cedula'])
    expect(documentosQueFaltan([{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }])).toEqual([])
  })
  it('is false when nothing is missing', () => {
    expect(hayAlgoQueSubir([])).toBe(true)
    expect(hayAlgoQueSubir([{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }])).toBe(false)
  })
})

describe('mensajeDelErrorDelEstudio', () => {
  it.each([
    ['ESTUDIO_LIMITE_DIARIO', /mañana/i],
    ['PRESCORING_DESACTIVADO', /Mi calificación/],
    ['AUTORIZACION_REQUERIDA', /autorización/i],
    ['ESTUDIO_NO_ENCONTRADO', /empezar/i],
    ['ESTUDIO_YA_INICIADO', /ya (se )?inici/i],
    ['DOCUMENTOS_FALTANTES', /cédula/i],
    ['EXTRACTO_ILEGIBLE', /extracto/i],
    ['CEDULA_ILEGIBLE', /cédula/i],
    ['TIMEOUT', /demor/i],
    ['ESTUDIO_FALLIDO', /no pudimos/i],
  ])('has user-facing copy for %s', (codigo, patron) => {
    expect(mensajeDelErrorDelEstudio(codigo)).toMatch(patron)
  })

  it('never mentions insurers, payment or deposits', () => {
    for (const c of ['ESTUDIO_LIMITE_DIARIO', 'PRESCORING_DESACTIVADO', 'TIMEOUT', 'ESTUDIO_FALLIDO']) {
      expect(mensajeDelErrorDelEstudio(c)).not.toMatch(/asegurador|sura|fianly|pago|dep[oó]sito/i)
    }
  })

  it('falls back to the server message, then to a generic one', () => {
    expect(mensajeDelErrorDelEstudio('ARCHIVO_INVALIDO', 'El archivo pesa más de 10 MB')).toBe(
      'El archivo pesa más de 10 MB',
    )
    expect(mensajeDelErrorDelEstudio('RARO')).toMatch(/inténtalo/i)
  })
})
