import { describe, it, expect } from 'vitest'
import { revisarNombreCompleto, revisarRazonSocial, partirNombre } from './campos-de-registro'
import { saludo } from './saludo'

describe('revisarNombreCompleto', () => {
  it('acepta un nombre con apellido', () => {
    expect(revisarNombreCompleto('Ana María Pérez')).toBeNull()
  })

  it('acepta tildes, ñ, apóstrofe y guion', () => {
    for (const n of ['Iñaki Muñoz', "Seán O'Brien", 'Ana-María Gómez']) {
      expect(revisarNombreCompleto(n)).toBeNull()
    }
  })

  it.each([
    ['', 'nombre completo'],
    ['   ', 'nombre completo'],
    ['Ana', 'apellido'],
    ['Ana 2', 'números'],
    ['Ana <script>', 'carácter'],
    ['A'.repeat(81), '80'],
  ])('%s → error', (entrada, fragmento) => {
    const e = revisarNombreCompleto(entrada as string)
    expect(e).not.toBeNull()
    expect(e).toContain(fragmento as string)
  })

  it('los espacios de más no cuentan como apellido', () => {
    expect(revisarNombreCompleto('  Ana   ')).toContain('apellido')
  })
})

describe('revisarRazonSocial', () => {
  it('acepta números y signos, que las razones sociales los llevan', () => {
    for (const r of ['Inmobiliaria 2000 S.A.S.', 'Arrendamientos & Cía. Ltda.']) {
      expect(revisarRazonSocial(r)).toBeNull()
    }
  })

  it.each([
    ['', 'obligatoria'],
    ['AB', 'corta'],
    ['123456', 'letras'],
    ['A'.repeat(121), '120'],
  ])('%s → error', (entrada, fragmento) => {
    expect(revisarRazonSocial(entrada as string)).toContain(fragmento as string)
  })
})

describe('partirNombre', () => {
  it('la primera palabra es el nombre y el resto el apellido', () => {
    expect(partirNombre('Ana María Pérez Gómez')).toEqual({
      firstName: 'Ana',
      lastName: 'María Pérez Gómez',
    })
  })

  it('con una sola palabra el apellido repite el nombre, que el back lo exige', () => {
    expect(partirNombre('Ana')).toEqual({ firstName: 'Ana', lastName: 'Ana' })
  })

  it('los espacios de más no crean apellidos vacíos', () => {
    expect(partirNombre('  Ana   Pérez  ')).toEqual({ firstName: 'Ana', lastName: 'Pérez' })
  })
})

describe('saludo', () => {
  it('saluda por el primer nombre', () => {
    expect(saludo('Ana María Pérez')).toBe('Hola, Ana')
  })

  it('no pone el correo de título cuando todavía no hay nombre', () => {
    // `user.name` cae al correo hasta que se completa el perfil, y en la
    // pantalla de elegir perfil eso es lo normal.
    expect(saludo('pruebasarrendador1902+qaonb0904@gmail.com')).toBe('Bienvenido a Leasefy')
  })

  it.each([null, undefined, '', '   '])('%s → saludo genérico', (entrada) => {
    expect(saludo(entrada as string | null)).toBe('Bienvenido a Leasefy')
  })
})
