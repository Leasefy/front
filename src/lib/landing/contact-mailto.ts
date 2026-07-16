/**
 * Pure `mailto:` composition for the contact route (landing-react-port
 * SLICE 7, T7.1). Ported from the standalone's `#cfsend` click handler
 * (`landing-standalone/index.html` ~L3426-3434): the form never makes a
 * network call — it builds a `mailto:` URL from field state and the
 * caller (the client component) navigates to it. This is the single seam
 * a future real backend endpoint would swap (design #261 §3, ADR-4).
 *
 * Kept as a standalone pure function (not inlined in the component) so the
 * exact string composition is unit-testable without DOM/window mocking.
 */

export const CONTACT_EMAIL = 'hola@leasefy.com'
const CONTACT_SUBJECT = 'Empezar con Leasefy'

export interface ContactFormFields {
  name: string
  email: string
  agency: string
  interest: string
  message: string
}

/**
 * Builds the exact `mailto:` URL for the given field state, matching the
 * standalone's body format byte-for-byte (Nombre/Email/Inmobiliaria/
 * Interés/Qué queremos resolver, each `\n`-joined, single `encodeURIComponent`
 * pass over subject and body separately).
 */
export function buildContactMailto(fields: ContactFormFields): string {
  const body = [
    `Nombre: ${fields.name}`,
    `Email: ${fields.email}`,
    `Inmobiliaria: ${fields.agency}`,
    `Interés: ${fields.interest}`,
    `Qué queremos resolver: ${fields.message}`,
  ].join('\n')

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}&body=${encodeURIComponent(body)}`
}

/** Light required-field guard (design §3: "keep it light — presentational
 * form"): only name + email are required, matching the standalone's UX
 * (agency/message/interest all have sensible defaults or are optional). */
export function isContactFormValid(fields: Pick<ContactFormFields, 'name' | 'email'>): boolean {
  return fields.name.trim().length > 0 && fields.email.trim().length > 0
}
