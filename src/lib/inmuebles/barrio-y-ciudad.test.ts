import { describe, it, expect } from 'vitest'

import { barrioYCiudad } from './barrio-y-ciudad'

describe('barrioYCiudad (QA-IA-A)', () => {
  it('sin barrio no deja la coma huérfana', () => {
    expect(barrioYCiudad('', 'Medellín')).toBe('Medellín')
    expect(barrioYCiudad(null, 'Medellín')).toBe('Medellín')
    expect(barrioYCiudad('  ', 'Medellín')).toBe('Medellín')
  })
  it('con los dos, «Barrio, Ciudad»', () => {
    expect(barrioYCiudad('El Poblado', 'Medellín')).toBe('El Poblado, Medellín')
  })
  it('sin nada, vacío', () => {
    expect(barrioYCiudad(undefined, undefined)).toBe('')
  })
})
