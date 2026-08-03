import { describe, it, expect } from 'vitest'
import {
  isValidCedula,
  normalizeColombianMobile,
  parseCanonCop,
  validatePreApprovalForm,
  type PreApprovalFormFields,
} from './form-logic'

describe('isValidCedula', () => {
  it('accepts 6–10 digits', () => {
    expect(isValidCedula('123456')).toBe(true)
    expect(isValidCedula('1098765432')).toBe(true)
    expect(isValidCedula(' 1098765432 ')).toBe(true)
  })
  it('rejects wrong length or non-digits', () => {
    expect(isValidCedula('12345')).toBe(false)
    expect(isValidCedula('12345678901')).toBe(false)
    expect(isValidCedula('10987a543')).toBe(false)
  })
})

describe('normalizeColombianMobile', () => {
  it('prefixes a bare 10-digit mobile', () => {
    expect(normalizeColombianMobile('3001112233')).toBe('+573001112233')
  })
  it('ignores spaces and dashes', () => {
    expect(normalizeColombianMobile('300 111-2233')).toBe('+573001112233')
  })
  it('accepts an already 57-prefixed number', () => {
    expect(normalizeColombianMobile('573001112233')).toBe('+573001112233')
  })
  it('rejects non-mobiles / wrong length', () => {
    expect(normalizeColombianMobile('1001112233')).toBeNull() // not starting with 3
    expect(normalizeColombianMobile('30011122')).toBeNull() // too short
    expect(normalizeColombianMobile('')).toBeNull()
  })
})

describe('parseCanonCop', () => {
  it('parses formatted amounts', () => {
    expect(parseCanonCop('2.000.000')).toBe(2000000)
    expect(parseCanonCop('$ 1.500.000')).toBe(1500000)
    expect(parseCanonCop('900000')).toBe(900000)
  })
  it('rejects empty / zero / non-numeric', () => {
    expect(parseCanonCop('')).toBeNull()
    expect(parseCanonCop('abc')).toBeNull()
    expect(parseCanonCop('0')).toBeNull()
  })
})

const VALID: PreApprovalFormFields = {
  cedula: '1098765432',
  phone: '3001112233',
  ciudad: 'Bogotá',
  canon: '2.000.000',
  tipoInmueble: 'apartamento',
  consent: true,
}

describe('validatePreApprovalForm', () => {
  it('accepts a fully valid form and derives values', () => {
    const r = validatePreApprovalForm(VALID)
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual({})
    expect(r.phoneE164).toBe('+573001112233')
    expect(r.canonCop).toBe(2000000)
  })

  it('flags each invalid field', () => {
    const r = validatePreApprovalForm({
      cedula: 'abc',
      phone: '123',
      ciudad: '',
      canon: '',
      tipoInmueble: '',
      consent: false,
    })
    expect(r.valid).toBe(false)
    expect(r.errors.cedula).toBeTruthy()
    expect(r.errors.phone).toBeTruthy()
    expect(r.errors.ciudad).toBeTruthy()
    expect(r.errors.canon).toBeTruthy()
    expect(r.errors.tipoInmueble).toBeTruthy()
    expect(r.errors.consent).toBeTruthy()
  })

  it('requires consent even when everything else is valid', () => {
    const r = validatePreApprovalForm({ ...VALID, consent: false })
    expect(r.valid).toBe(false)
    expect(r.errors.consent).toBeTruthy()
    // other fields still derive fine
    expect(r.phoneE164).toBe('+573001112233')
  })

  it('rejects an unknown tipoInmueble', () => {
    const r = validatePreApprovalForm({ ...VALID, tipoInmueble: 'bodega' })
    expect(r.valid).toBe(false)
    expect(r.errors.tipoInmueble).toBeTruthy()
  })
})
