/**
 * El espejo de `UpdateProfileDto` (PATCH /users/me): mismos topes y frases
 * que el back, para atajar ANTES de mandar.
 */
import { describe, it, expect } from 'vitest'
import { MENSAJES_DE_DATOS_PERSONALES, hoyEnColombia, revisarDatosPersonales } from './datos-personales'

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
