/**
 * Pure form logic for the public pre-approval page. Kept separate from the
 * React component so the validation + normalization rules are unit-testable
 * without rendering radix components in jsdom.
 */

import { errorTelefono, normalizarTelefono } from '@/lib/phone/countries'

export interface PreApprovalFormFields {
  cedula: string
  /** Número NACIONAL, solo dígitos (sin indicativo +57). */
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
 * Normaliza un celular colombiano a E.164.
 *
 * @deprecated El campo ahora es multi-país: usar `normalizarTelefono(raw, iso)`
 * de `@/lib/phone/countries`. Se conserva porque hardcodear Colombia dejaba
 * fuera a cualquiera con celular del exterior.
 */
export function normalizeColombianMobile(raw: string): string | null {
  return normalizarTelefono(raw, 'CO')
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

  // Largo y prefijo salen del país (Colombia), y el error lo dice concreto
  // ("El celular en Colombia tiene 10 dígitos") en vez de un genérico.
  const phoneE164 = normalizarTelefono(f.phone)
  if (!phoneE164) errors.phone = errorTelefono(f.phone) ?? 'Ingresa un celular válido.'

  if (!f.ciudad.trim()) errors.ciudad = 'Selecciona una ciudad.'

  /*
   * El canon es OPCIONAL: el estudio ya no necesita una propiedad.
   * La persona se estudia primero y con el tope resultante elige después — ese
   * es el orden que pidió la operación (antes había que elegir inmueble para
   * saber si te aprobaban, que es al revés). Si igual escribe un canon porque
   * ya tiene una en mente, tiene que ser válido; vacío sigue de largo.
   */
  const canonCop = parseCanonCop(f.canon)
  if (f.canon.trim() !== '' && canonCop === null) {
    errors.canon = 'Ingresa un canon válido, o déjalo vacío.'
  }

  if (!TIPOS.has(f.tipoInmueble)) errors.tipoInmueble = 'Selecciona el tipo de inmueble.'

  if (!f.consent) errors.consent = 'Debes autorizar el tratamiento de datos para continuar.'

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    phoneE164,
    canonCop,
  }
}
