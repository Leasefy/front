/**
 * registration-profiles.ts — the platform's signup profiles (Inquilino /
 * Propietario / Inmobiliaria) as a single source of truth for their IDENTITY.
 *
 * The FRONT owns the profile metadata (key + label + copy); the BACKEND owns
 * only the on/off state, toggled from the admin panel and read at signup. That
 * split mirrors `feature-flags` / `pricing-config`: the SPA never invents state,
 * it only renders what the admin backend persists.
 *
 * Canonical keys are the real user roles the rest of the app already speaks
 * (`tenant | landlord | agency`) — NOT the localized `inmobiliaria` label the
 * role-picker uses internally. Consumers map their own UI ids onto these keys.
 */

export type RegistrationProfileKey = 'tenant' | 'landlord' | 'agency'

export const REGISTRATION_PROFILE_KEYS = ['tenant', 'landlord', 'agency'] as const

export interface RegistrationProfileMeta {
  key: RegistrationProfileKey
  /** Display label for the admin screen (UI copy). */
  label: string
  /** One-line description for the admin screen. */
  description: string
}

/** Ordered metadata for the admin toggle screen. */
export const REGISTRATION_PROFILES: readonly RegistrationProfileMeta[] = [
  {
    key: 'tenant',
    label: 'Inquilino',
    description: 'Busca propiedades, aplica y gestiona su arriendo.',
  },
  {
    key: 'landlord',
    label: 'Propietario',
    description: 'Publica propiedad, evalúa candidatos con IA y automatiza cobros.',
  },
  {
    key: 'agency',
    label: 'Inmobiliaria',
    description: 'Gestiona múltiples propiedades con herramientas profesionales.',
  },
] as const

const KNOWN_KEYS = new Set<string>(REGISTRATION_PROFILE_KEYS)

/** Type guard: is `value` one of the canonical profile keys? */
export function isRegistrationProfileKey(value: unknown): value is RegistrationProfileKey {
  return typeof value === 'string' && KNOWN_KEYS.has(value)
}
