/**
 * Pure form logic for the public pre-approval page. Kept separate from the
 * React component so the validation + normalization rules are unit-testable
 * without rendering radix components in jsdom.
 */

import { errorTelefono, normalizarTelefono } from '@/lib/phone/countries'

export interface PreApprovalFormFields {
  nombres: string
  apellidos: string
  email: string
  cedula: string
  /** Número NACIONAL, solo dígitos (sin indicativo +57). */
  phone: string
  ciudad: string
  canon: string
  tipoInmueble: string
  consent: boolean
}

/** Formato simple y robusto: algo@algo.algo, sin espacios. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim())
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

  if (!f.nombres.trim()) errors.nombres = 'Ingresa tus nombres.'
  if (!f.apellidos.trim()) errors.apellidos = 'Ingresa tus apellidos.'
  if (!isValidEmail(f.email)) errors.email = 'Ingresa un correo válido.'

  if (!isValidCedula(f.cedula)) errors.cedula = 'Ingresa una cédula válida (6 a 10 dígitos).'

  // Largo y prefijo salen del país (Colombia), y el error lo dice concreto
  // ("El celular en Colombia tiene 10 dígitos") en vez de un genérico.
  const phoneE164 = normalizarTelefono(f.phone)
  if (!phoneE164) errors.phone = errorTelefono(f.phone) ?? 'Ingresa un celular válido.'

  if (!f.ciudad.trim()) errors.ciudad = 'Selecciona una ciudad.'

  /*
   * El canon es OBLIGATORIO: el back lo confirmó requerido en `POST
   * /pre-scoring` (`canon_mensual_cop`, entero > 0) — sin él no arma la
   * orden. Antes era opcional porque el estudio no necesitaba una propiedad
   * todavía; esa idea (estudiarse primero y elegir después con el tope) sigue
   * viva, pero el back igual necesita un canon de referencia para el estudio.
   */
  const canonCop = parseCanonCop(f.canon)
  if (canonCop === null) {
    errors.canon = 'Ingresa el canon mensual.'
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
