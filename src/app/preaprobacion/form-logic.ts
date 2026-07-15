/**
 * Pure form logic for the public pre-approval page. Kept separate from the
 * React component so the validation + normalization rules are unit-testable
 * without rendering radix components in jsdom.
 */

export interface PreApprovalFormFields {
  cedula: string
  phone: string
  ciudad: string
  canon: string
  tipoInmueble: string
  consent: boolean
}

export interface PreApprovalFormResult {
  valid: boolean
  /** Field key → error message (Spanish). Empty when valid. */
  errors: Partial<Record<keyof PreApprovalFormFields, string>>
  /** Derived values, present only when the relevant field is valid. */
  phoneE164: string | null
  canonCop: number | null
}

const TIPOS = new Set(['apartamento', 'casa', 'local'])

/** Cédula: 6–10 digits. */
export function isValidCedula(raw: string): boolean {
  return /^\d{6,10}$/.test(raw.trim())
}

/**
 * Normalizes a Colombian mobile to E.164. Accepts a bare 10-digit mobile
 * (3XXXXXXXXX) or an already-prefixed 57XXXXXXXXXX, ignoring spaces/dashes.
 * Returns null when it isn't a valid CO mobile.
 */
export function normalizeColombianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (/^3\d{9}$/.test(digits)) return `+57${digits}`
  if (/^573\d{9}$/.test(digits)) return `+${digits}`
  return null
}

/** Parses a canon amount typed with separators ("$ 2.000.000") into integer COP. */
export function parseCanonCop(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function validatePreApprovalForm(f: PreApprovalFormFields): PreApprovalFormResult {
  const errors: PreApprovalFormResult['errors'] = {}

  if (!isValidCedula(f.cedula)) errors.cedula = 'Ingresa una cédula válida (6 a 10 dígitos).'

  const phoneE164 = normalizeColombianMobile(f.phone)
  if (!phoneE164) errors.phone = 'Ingresa un celular colombiano válido (10 dígitos).'

  if (!f.ciudad.trim()) errors.ciudad = 'Selecciona una ciudad.'

  const canonCop = parseCanonCop(f.canon)
  if (canonCop === null) errors.canon = 'Ingresa el canon mensual.'

  if (!TIPOS.has(f.tipoInmueble)) errors.tipoInmueble = 'Selecciona el tipo de inmueble.'

  if (!f.consent) errors.consent = 'Debes autorizar el tratamiento de datos para continuar.'

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    phoneE164,
    canonCop,
  }
}
