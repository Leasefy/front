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
  nombres: 'María',
  apellidos: 'Restrepo',
  email: 'maria@correo.com',
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
      nombres: '',
      apellidos: '',
      email: 'no-es-un-correo',
      cedula: 'abc',
      phone: '123',
          ciudad: '',
      canon: 'no-es-plata',
      tipoInmueble: '',
      consent: false,
    })
    expect(r.valid).toBe(false)
    expect(r.errors.nombres).toBeTruthy()
    expect(r.errors.apellidos).toBeTruthy()
    expect(r.errors.email).toBeTruthy()
    expect(r.errors.cedula).toBeTruthy()
    expect(r.errors.phone).toBeTruthy()
    expect(r.errors.ciudad).toBeTruthy()
    expect(r.errors.canon).toBeTruthy()
    expect(r.errors.tipoInmueble).toBeTruthy()
    expect(r.errors.consent).toBeTruthy()
  })

  describe('nombres, apellidos y correo', () => {
    it('nombres vacío o solo espacios no pasa', () => {
      expect(validatePreApprovalForm({ ...VALID, nombres: '' }).errors.nombres).toBeTruthy()
      expect(validatePreApprovalForm({ ...VALID, nombres: '   ' }).errors.nombres).toBeTruthy()
    })

    it('apellidos vacío o solo espacios no pasa', () => {
      expect(validatePreApprovalForm({ ...VALID, apellidos: '' }).errors.apellidos).toBeTruthy()
      expect(validatePreApprovalForm({ ...VALID, apellidos: '   ' }).errors.apellidos).toBeTruthy()
    })

    it('exige un correo con formato válido', () => {
      expect(validatePreApprovalForm({ ...VALID, email: '' }).errors.email).toBeTruthy()
      expect(validatePreApprovalForm({ ...VALID, email: 'maria@' }).errors.email).toBeTruthy()
      expect(validatePreApprovalForm({ ...VALID, email: 'maria@correo' }).errors.email).toBeTruthy()
      expect(validatePreApprovalForm({ ...VALID, email: 'maria correo.com' }).errors.email).toBeTruthy()
    })

    it('un correo válido no marca error', () => {
      const r = validatePreApprovalForm({ ...VALID, email: 'maria.restrepo+test@correo.com.co' })
      expect(r.errors.email).toBeUndefined()
    })
  })

  /*
   * El back confirmó que `canon_mensual_cop` es requerido en `POST
   * /pre-scoring` (entero > 0): sin él no arma la orden. Un canon vacío ya
   * no pasa.
   */
  describe('canon obligatorio', () => {
    it('sin canon el formulario es inválido', () => {
      const r = validatePreApprovalForm({ ...VALID, canon: '' })
      expect(r.valid).toBe(false)
      expect(r.errors.canon).toBeTruthy()
      expect(r.canonCop).toBeNull()
    })

    it('solo espacios cuenta como vacío', () => {
      const r = validatePreApprovalForm({ ...VALID, canon: '   ' })
      expect(r.valid).toBe(false)
      expect(r.errors.canon).toBeTruthy()
    })

    it('un monto no numérico también es inválido', () => {
      const r = validatePreApprovalForm({ ...VALID, canon: 'abc' })
      expect(r.valid).toBe(false)
      expect(r.errors.canon).toBeTruthy()
    })

    it('un canon en cero no pasa por válido', () => {
      const r = validatePreApprovalForm({ ...VALID, canon: '0' })
      expect(r.valid).toBe(false)
    })

    it('un canon válido pasa y se deriva canonCop', () => {
      const r = validatePreApprovalForm({ ...VALID, canon: '1.800.000' })
      expect(r.valid).toBe(true)
      expect(r.errors.canon).toBeUndefined()
      expect(r.canonCop).toBe(1_800_000)
    })
  })

  describe('celular', () => {
    it('el error dice cuántos dígitos faltan', () => {
      const r = validatePreApprovalForm({ ...VALID, phone: '300111' })
      expect(r.errors.phone).toBe('El celular en Colombia tiene 10 dígitos.')
    })

    it('un fijo no pasa por celular', () => {
      const r = validatePreApprovalForm({ ...VALID, phone: '6011112233' })
      expect(r.valid).toBe(false)
      expect(r.errors.phone).toMatch(/empieza por 3/i)
    })

    it('dígitos de más se rechazan, no se recortan en silencio', () => {
      const r = validatePreApprovalForm({ ...VALID, phone: '30011122339' })
      expect(r.valid).toBe(false)
    })
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
