/**
 * La regla de «¿a quién pertenece la cuenta?» del lado del front (22-09). Es la
 * MISMA del back (`titular-de-la-cuenta.ts`): si el formulario dejara pasar lo
 * que el servidor rechaza, la persona se enteraría con un 400 al guardar.
 */

import { describe, it, expect } from 'vitest'

import { revisarDocumentoDelTitular, titularEnUnaLinea, titularInicial } from './titular-de-la-cuenta'

const JORGE = { nombreDelPropietario: 'Jorge Restrepo', documentoDelPropietario: '71234567' }

describe('titularInicial', () => {
  it('sin titular declarado, la cuenta es del propietario', () => {
    expect(titularInicial(JORGE)).toBe('PROPIETARIO')
  })

  it('con el documento de otra persona, es de otra persona', () => {
    expect(titularInicial({ ...JORGE, nombreDelTitular: 'Carlos', documentoDelTitular: '80012345' })).toBe('TERCERO')
  })

  it('con SU documento (con puntos) sigue siendo suya', () => {
    expect(titularInicial({ ...JORGE, documentoDelTitular: '71.234.567' })).toBe('PROPIETARIO')
  })

  it('su nombre escrito en mayúsculas y con tildes sigue siendo suya', () => {
    expect(titularInicial({ ...JORGE, nombreDelTitular: 'JORGE  RESTRÉPO' })).toBe('PROPIETARIO')
  })

  it('otro nombre sin documento es de otra persona (la ficha a medias de la migración)', () => {
    expect(titularInicial({ ...JORGE, nombreDelTitular: 'Carlos Restrepo' })).toBe('TERCERO')
  })
})

describe('revisarDocumentoDelTitular', () => {
  it('cédula con puntos → dígitos', () => {
    expect(revisarDocumentoDelTitular('CC', '80.012.345')).toEqual({ ok: true, numero: '80012345' })
  })

  it('cédula con letras o de largo imposible se rechaza con su motivo', () => {
    expect(revisarDocumentoDelTitular('CC', '80A12345')).toMatchObject({ ok: false, motivo: 'soloNumeros' })
    expect(revisarDocumentoDelTitular('CC', '12345')).toMatchObject({ ok: false, motivo: 'largo', min: 6, max: 10 })
  })

  it('NIT: con el dígito correcto se guarda sin él; con el equivocado dice cuál es', () => {
    expect(revisarDocumentoDelTitular('NIT', '890.903.938-8')).toEqual({ ok: true, numero: '890903938' })
    expect(revisarDocumentoDelTitular('NIT', '890903938-3')).toEqual({
      ok: false,
      motivo: 'digitoDeVerificacion',
      dv: 8,
    })
  })

  it('pasaporte: letras y números, en mayúsculas', () => {
    expect(revisarDocumentoDelTitular('PASSPORT', 'ab123456')).toEqual({ ok: true, numero: 'AB123456' })
    expect(revisarDocumentoDelTitular('PASSPORT', 'a1')).toMatchObject({ ok: false, motivo: 'pasaporte' })
  })

  it('vacío se dice como vacío', () => {
    expect(revisarDocumentoDelTitular('CE', '  ')).toEqual({ ok: false, motivo: 'vacio' })
  })

  it('la cédula del propietario no es «otra persona»', () => {
    expect(revisarDocumentoDelTitular('CC', '71.234.567', '71234567')).toEqual({
      ok: false,
      motivo: 'esElPropietario',
    })
  })
})

describe('titularEnUnaLinea', () => {
  it('«Nombre · CC 123» y el pasaporte con su nombre', () => {
    expect(titularEnUnaLinea({ nombre: 'Carlos Restrepo', tipoDocumento: 'CC', numeroDocumento: '80012345' })).toBe(
      'Carlos Restrepo · CC 80012345',
    )
    expect(titularEnUnaLinea({ nombre: 'Ann Lee', tipoDocumento: 'PASSPORT', numeroDocumento: 'AB1234' })).toBe(
      'Ann Lee · Pasaporte AB1234',
    )
  })
})
