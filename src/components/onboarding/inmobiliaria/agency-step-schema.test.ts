import { describe, it, expect } from 'vitest'
import {
  agencyStepSchema,
  errorDelTelefono,
  pistaDelTelefono,
  toAgencyRequest,
  type AgencyStepFormValues,
} from './agency-step-schema'

const VALID: AgencyStepFormValues = {
  legalName: 'Inmobiliaria Test SAS',
  nit: '900123456-7',
  address: { calle: 'Calle 10 # 20-30', ciudad: 'Medellín', departamento: 'Antioquia', codigoPostal: '' },
  primaryContactEmail: 'contacto@inmobiliaria.test',
  primaryContactPhone: '3001234567',
  primaryContactCountry: 'CO',
}

describe('el teléfono se valida con el largo del país (Nico, 2026-09-07)', () => {
  it.each([
    ['CO', '300 123 4567', null],
    ['CO', '6042345678', null],
    ['CO', '300123456', 'Un número de Colombia tiene 10 dígitos; este tiene 9.'],
    ['CO', '30012345678', 'Un número de Colombia tiene 10 dígitos; este tiene 11.'],
    ['US', '(415) 555-0132', null],
    ['ES', '612 34 56 78', null],
    ['ES', '61234567', 'Un número de España tiene 9 dígitos; este tiene 8.'],
    ['AR', '011 4123-4567', null], // el 0 de troncal no cuenta
    ['AR', '9 11 4123 4567', null],
    ['EC', '099 123 4567', null],
    ['PE', '1 234 5678', null],
    ['PE', '1234567', 'Un número de Perú tiene entre 8 y 9 dígitos; este tiene 7.'],
    ['XX', '12345678', null], // país fuera de la tabla: rango E.164
    ['XX', '123', 'Ingresa un teléfono válido.'],
  ])('%s «%s» → %s', (pais, valor, esperado) => {
    expect(errorDelTelefono(valor, pais)).toBe(esperado)
  })

  it('el esquema pone el error en el campo del teléfono, con el país del formulario', () => {
    const result = agencyStepSchema.safeParse({ ...VALID, primaryContactPhone: '300123', primaryContactCountry: 'CO' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'primaryContactPhone')
      expect(issue?.message).toBe('Un número de Colombia tiene 10 dígitos; este tiene 6.')
    }
    // El mismo número con el país que le corresponde pasa.
    expect(agencyStepSchema.safeParse({ ...VALID, primaryContactPhone: '612345678', primaryContactCountry: 'ES' }).success).toBe(true)
  })

  it('sin país en los valores, valida como Colombia', () => {
    const sinPais = { ...VALID } as Partial<AgencyStepFormValues>
    delete sinPais.primaryContactCountry
    expect(agencyStepSchema.safeParse({ ...sinPais, primaryContactPhone: '3001234567' }).success).toBe(true)
    expect(agencyStepSchema.safeParse({ ...sinPais, primaryContactPhone: '30012345' }).success).toBe(false)
  })

  it('la pista debajo del campo dice cuántos dígitos', () => {
    expect(pistaDelTelefono('CO')).toBe('10 dígitos, sin el indicativo.')
    expect(pistaDelTelefono('PE')).toBe('Entre 8 y 9 dígitos, sin el indicativo.')
  })

  it('el país no viaja al agente: el contrato lleva el número sin indicativo', () => {
    expect(toAgencyRequest(VALID)).not.toHaveProperty('primaryContactCountry')
    expect(toAgencyRequest(VALID).primaryContactPhone).toBe('3001234567')
  })
})

describe('agencyStepSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(agencyStepSchema.safeParse(VALID).success).toBe(true)
  })

  it('surfaces the "Dirección" message for an empty calle (contract key kept as calle)', () => {
    const result = agencyStepSchema.safeParse({ ...VALID, address: { ...VALID.address, calle: '' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('La dirección es obligatoria.')
    }
  })

  it('surfaces the "Municipio" message for an empty ciudad (contract key kept as ciudad)', () => {
    const result = agencyStepSchema.safeParse({ ...VALID, address: { ...VALID.address, ciudad: '' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('El municipio es obligatorio.')
    }
  })

  it('requires a departamento', () => {
    const result = agencyStepSchema.safeParse({ ...VALID, address: { ...VALID.address, departamento: '' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('El departamento es obligatorio.')
    }
  })
})

describe('toAgencyRequest', () => {
  it('maps the form values to the agent request, defaulting billingModel to standard', () => {
    expect(toAgencyRequest(VALID)).toEqual({
      legalName: 'Inmobiliaria Test SAS',
      nit: '900123456-7',
      address: { calle: 'Calle 10 # 20-30', ciudad: 'Medellín', departamento: 'Antioquia' },
      primaryContactEmail: 'contacto@inmobiliaria.test',
      primaryContactPhone: '3001234567',
      billingModel: 'standard',
    })
  })

  it('includes codigoPostal when provided', () => {
    const req = toAgencyRequest({ ...VALID, address: { ...VALID.address, codigoPostal: '050001' } })
    expect(req.address.codigoPostal).toBe('050001')
  })
})
