/**
 * contact-mailto.test.ts — pure `mailto:` composition for the contact
 * route (landing-react-port SLICE 7, T7.1). Structure/wiring only per
 * Strict TDD: exact string composition from field state, and the light
 * required-field guard (name + email).
 */
import { describe, it, expect } from 'vitest'
import { buildContactMailto, isContactFormValid, CONTACT_EMAIL } from './contact-mailto'

describe('buildContactMailto', () => {
  it('builds the exact mailto: URL from field state', () => {
    const url = buildContactMailto({
      name: 'Ana Pérez',
      email: 'ana@inmobiliaria.co',
      agency: 'Inmobiliaria Andes',
      interest: 'CRM',
      message: 'Cobranza manual',
    })

    expect(url.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true)
    expect(url).toContain(encodeURIComponent('Empezar con Leasefy'))

    const body = [
      'Nombre: Ana Pérez',
      'Email: ana@inmobiliaria.co',
      'Inmobiliaria: Inmobiliaria Andes',
      'Interés: CRM',
      'Qué queremos resolver: Cobranza manual',
    ].join('\n')
    expect(url).toContain(encodeURIComponent(body))
  })

  it('composes with empty optional fields without throwing', () => {
    const url = buildContactMailto({ name: 'Ana', email: 'ana@x.co', agency: '', interest: '', message: '' })
    expect(url.startsWith('mailto:')).toBe(true)
  })
})

describe('isContactFormValid', () => {
  it('is invalid when name is blank', () => {
    expect(isContactFormValid({ name: '  ', email: 'ana@x.co' })).toBe(false)
  })

  it('is invalid when email is blank', () => {
    expect(isContactFormValid({ name: 'Ana', email: '' })).toBe(false)
  })

  it('is valid when both name and email are present', () => {
    expect(isContactFormValid({ name: 'Ana', email: 'ana@x.co' })).toBe(true)
  })
})
