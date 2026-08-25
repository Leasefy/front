import { describe, it, expect } from 'vitest'
import { agencyStepSchema, toAgencyRequest, type AgencyStepFormValues } from './agency-step-schema'

const VALID: AgencyStepFormValues = {
  legalName: 'Inmobiliaria Test SAS',
  nit: '900123456-7',
  address: { calle: 'Calle 10 # 20-30', ciudad: 'Medellín', departamento: 'Antioquia', codigoPostal: '' },
  primaryContactEmail: 'contacto@inmobiliaria.test',
  primaryContactPhone: '3001234567',
}

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
