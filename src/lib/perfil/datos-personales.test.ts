/**
 * El espejo de `UpdateProfileDto` (PATCH /users/me): mismos topes y frases
 * que el back, para atajar ANTES de mandar.
 */
import { describe, it, expect } from 'vitest'
import {
  MENSAJES_DE_DATOS_PERSONALES,
  errorDelCelular,
  hoyEnColombia,
  revisarDatosPersonales,
} from './datos-personales'

// 2 de octubre de 2026, 23:30 en Bogotá (ya 3 de octubre en UTC).
const AHORA = new Date('2026-10-03T04:30:00.000Z')

describe('revisarDatosPersonales', () => {
  it('lo válido pasa, y un null (borrar el dato) siempre vale', () => {
    expect(
      revisarDatosPersonales({ firstName: 'Ana', birthDate: '1990-05-20', phone: null, address: null }, AHORA),
    ).toEqual({})
  })

  it('🔴 una fecha de nacimiento que no es un día real, o del año 99999, no sale', () => {
    expect(revisarDatosPersonales({ birthDate: '2024-02-30' }, AHORA).birthDate).toBe(
      MENSAJES_DE_DATOS_PERSONALES.fechaDeNacimiento,
    )
    expect(revisarDatosPersonales({ birthDate: '99999-01-01' }, AHORA).birthDate).toBe(
      MENSAJES_DE_DATOS_PERSONALES.fechaDeNacimiento,
    )
    expect(revisarDatosPersonales({ birthDate: '1899-12-31' }, AHORA).birthDate).toBe(
      'La fecha de nacimiento debe estar entre 1900 y hoy.',
    )
  })

  it('«hoy» es el día de Colombia, no el del reloj en UTC', () => {
    expect(hoyEnColombia(AHORA)).toBe('2026-10-02')
    expect(revisarDatosPersonales({ birthDate: '2026-10-02' }, AHORA)).toEqual({})
    expect(revisarDatosPersonales({ birthDate: '2026-10-03' }, AHORA).birthDate).toBe(
      MENSAJES_DE_DATOS_PERSONALES.fechaDeNacimientoFueraDeRango,
    )
  })

  it('los largos de las columnas, con la frase del back', () => {
    const errores = revisarDatosPersonales(
      { firstName: 'x'.repeat(51), address: 'x'.repeat(256), emergencyContactPhone: '3'.repeat(31) },
      AHORA,
    )
    expect(errores.firstName).toBe('El nombre no puede tener más de 50 caracteres.')
    expect(errores.address).toBe('La dirección no puede tener más de 255 caracteres.')
    expect(errores.emergencyContactPhone).toBeDefined()
    expect(revisarDatosPersonales({ firstName: 'x'.repeat(50) }, AHORA)).toEqual({})
  })
})

/**
 * 🔴 02-10-2026 (Nico): el celular de los tres perfiles se revisa ANTES de
 * enviar, con la regla del `@Matches` de `UpdateProfileDto` y la frase del
 * registro. Antes salía tal cual y el back respondía 400.
 */
describe('el celular del perfil', () => {
  it('🔴 un celular incompleto no sale: «El celular en Colombia tiene 10 dígitos.»', () => {
    expect(revisarDatosPersonales({ phone: '300123' }, AHORA).phone).toBe('El celular en Colombia tiene 10 dígitos.')
    expect(revisarDatosPersonales({ phone: '30012345678' }, AHORA).phone).toBe(
      'El celular en Colombia tiene 10 dígitos.',
    )
  })

  it('uno que no empieza por 3 dice eso, como en el registro', () => {
    expect(errorDelCelular('6011234567')).toBe('Un celular en Colombia empieza por 3.')
  })

  it('lo que el back acepta pasa: con o sin +57, con espacios, guiones, puntos o paréntesis', () => {
    for (const ok of ['3001234567', '+573001234567', '300 123 4567', '(300) 123-4567', '+57 300.123.4567']) {
      expect(errorDelCelular(ok), ok).toBeNull()
    }
  })

  it('lo que el back NO acepta tampoco pasa, aunque tenga 10 cifras de celular dentro', () => {
    // `normalizePhone` no quita el «57» sin «+» ni las letras: el back daría 400.
    expect(errorDelCelular('573001234567')).toBe(MENSAJES_DE_DATOS_PERSONALES.celular)
    expect(errorDelCelular('300123456a')).toBe(MENSAJES_DE_DATOS_PERSONALES.celular)
    expect(errorDelCelular('abc')).toBe(MENSAJES_DE_DATOS_PERSONALES.celular)
  })

  it('borrarlo (null) o no tocarlo (undefined) no se revisa', () => {
    expect(errorDelCelular(null)).toBeNull()
    expect(errorDelCelular(undefined)).toBeNull()
    expect(revisarDatosPersonales({ phone: undefined }, AHORA)).toEqual({})
  })
})
