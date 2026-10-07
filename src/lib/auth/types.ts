/**
 * Auth Types - Type definitions for authentication system
 *
 * Frontend uses lowercase roles for UX.
 * Backend uses uppercase roles (Prisma enum).
 */

import type { ActiveContext } from './active-context'
import type { PerfilDeOnboarding } from './perfil-de-onboarding'

// ============================================================================
// Roles
// ============================================================================

/** Frontend-facing role (used in UI logic, routes, etc.) */
/** Where a session must go before it may reach a panel (T-0123 WU-3). */
export type MfaDestino = 'enroll' | 'verify' | 'none'

/**
 * ¿Ya se sabe si a esta sesión le falta el código del segundo factor?
 * (Nico, 02-10-2026: si no se puede saber, no se entra.)
 *  - `pending`: se está preguntando (sesión nueva, o «Reintentar»).
 *  - `verified`: la consulta respondió; `mfaRequired`/`mfaEnrollRequired`
 *    dicen la verdad.
 *  - `failed`: no respondió ni reintentando. Las pantallas protegidas muestran
 *    «No pudimos confirmar tu sesión» con «Reintentar»; no se cierra la sesión.
 */
export type EstadoDelChequeoMfa = 'pending' | 'verified' | 'failed'

/**
 * 🔴 LOGIN-BUCLE (Nico, 06-10-2026): ¿hay una sesión guardada que todavía no
 * se pudo confirmar? «Todavía no sé» NUNCA es «no hay sesión»: mientras dure,
 * `isLoading` sigue en true y nadie manda al login.
 *  - `no-aplica`: no hay nada por confirmar (ya se resolvió, o no había sesión
 *    guardada al cargar).
 *  - `revisando`: hay una sesión guardada y se está confirmando (Supabase,
 *    `GET /users/me/bootstrap`, el segundo factor).
 *  - `sin-confirmar`: pasó el tope y sigue sin respuesta. Las pantallas
 *    protegidas muestran «No pudimos confirmar tu sesión» con «Reintentar»; se
 *    sigue esperando debajo y, si la respuesta llega, se entra solo.
 */
export type ConfirmacionDeLaSesion = 'no-aplica' | 'revisando' | 'sin-confirmar'

/** Lo que dice Supabase de la sesión guardada al apretar «Continuar». */
export type VigenciaDeLaSesion = 'viva' | 'muerta' | 'sin-respuesta'

export type UserRole = 'tenant' | 'landlord' | 'agency'

/** Backend role enum (matches Prisma/NestJS) */
export type BackendRole = 'TENANT' | 'LANDLORD' | 'BOTH' | 'ADMIN' | 'AGENT' | 'INMOBILIARIA'

export function toBackendRole(role: UserRole): BackendRole {
  if (role === 'agency') return 'AGENT'
  return role === 'landlord' ? 'LANDLORD' : 'TENANT'
}

export function toFrontendRole(role: BackendRole): UserRole {
  if (role === 'AGENT' || role === 'INMOBILIARIA') return 'agency'
  if (role === 'LANDLORD' || role === 'BOTH') return 'landlord'
  return 'tenant'
}

export type PaymentMethod = 'bank_transfer' | 'pse' | 'nequi' | 'daviplata' | 'credit_card'
export type RiskLevel = 'A' | 'B' | 'C' | 'D'
export type PreferredContact = 'email' | 'phone' | 'whatsapp'

export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'setup_pending'
  | 'fully_setup'

export type EmploymentType = 'employed' | 'self_employed' | 'freelancer' | 'student' | 'retired' | 'other'

// ============================================================================
// Onboarding data structures
// ============================================================================

export interface TenantOnboardingData {
  // Step 1 - Welcome & Profile
  displayName?: string
  phone?: string
  rut?: string
  preferredContact?: PreferredContact

  // Step 2 - Employment & Income
  employmentType?: EmploymentType
  companyName?: string
  monthlyIncome?: number
  additionalIncome?: number

  // Step 3 - Housing Preferences
  budgetMin?: number
  budgetMax?: number
  preferredZones?: string[]
  preferredAmenities?: string[]
  moveInDate?: string
  hasPets?: boolean
  petDetails?: string

  // Step 4 - Documents Ready
  hasIdDocument?: boolean
  hasIncomeProof?: boolean
  hasEmploymentLetter?: boolean
  hasReferences?: boolean
  hasBankStatements?: boolean
}

export interface OnboardingData {
  // Step 1 - Welcome & Profile
  displayName?: string
  phone?: string
  preferredContact?: PreferredContact

  // Step 2 - First Property
  propertyType?: 'apartment' | 'house' | 'studio' | 'room'
  propertyAddress?: string
  propertyCity?: string
  expectedRent?: number
  rentPrice?: number

  // Step 3 - Ideal tenant
  minIncomeRatio?: number
  acceptPets?: boolean
  minRiskLevel?: string

  // Step 4 - Payments
  bankAccount?: string
  bankName?: string
  acceptedPaymentMethods?: string[]
  preferredPaymentDay?: number
}

// ============================================================================
// Agency
// ============================================================================

export type AgencyMemberRole = 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER'

export interface Agency {
  id: string
  name: string
  nit?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  logoUrl?: string
  website?: string
  portfolioSize?: string
  yearsInBusiness?: number
  services?: string[]
  /** Brand colors. GET /inmobiliaria/agency returns this for every active member
   *  (unlike the admin-only /inmobiliaria/config), so team members get the brand
   *  identity too. Hex '#rrggbb'. */
  branding?: { primaryColor?: string; secondaryColor?: string }
}

export type AgencySize = 'small' | 'medium' | 'large' | 'enterprise'
export type AgencyService = 'arriendos' | 'ventas' | 'administracion' | 'avaluos'

export interface AgencyOnboardingData {
  // Step 1 - Agency Info
  agencyName?: string
  nit?: string
  contactPerson?: string
  phone?: string
  email?: string
  preferredContact?: PreferredContact

  // Step 2 - Business Details
  city?: string
  portfolioSize?: AgencySize
  yearsInBusiness?: number
  website?: string

  // Step 3 - Services
  services?: AgencyService[]
  hasPropertyManagement?: boolean
  hasTenantScreening?: boolean
}

export interface User {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  rut?: string
  address?: string
  birthDate?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  /** ISO timestamp of Supabase email confirmation; undefined if not confirmed */
  emailConfirmedAt?: string
  role: UserRole
  /** The raw backend role before frontend mapping */
  backendRole?: BackendRole
  /** True if the user has an email+password credential (false = Google-only) */
  hasPassword?: boolean
  /** Where this profile came from: 'backend' = GET /users/me (authoritative),
   *  'session' = degraded Supabase-session fallback while the backend is
   *  unreachable (fabricates onboardingCompleted — never trust it as truth). */
  profileSource?: 'backend' | 'session'
  // Onboarding fields
  onboardingCompleted?: boolean
  onboardingStep?: number
  onboardingData?: OnboardingData
  tenantOnboardingData?: TenantOnboardingData
  agencyOnboardingData?: AgencyOnboardingData
  onboardingStatus?: OnboardingStatus
}

// ============================================================================
// Auth state & context
// ============================================================================

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  mfaRequired: boolean
  /**
   * T-0099: `true` when the back's `segundoFactor.exigido` (contract.md
   * T-0099 §3) says this role requires the second factor AND the session has
   * NO verified TOTP factor enrolled yet (`supabase.auth.mfa.listFactors`).
   * Distinct from `mfaRequired`, which only covers "has a factor, hasn't
   * stepped up this session yet" — this one covers "nothing to step up to".
   * Takes priority: an enrolling user is sent to `/auth/mfa-enroll`, not
   * `/auth/mfa-verify`.
   */
  mfaEnrollRequired: boolean
  /**
   * Ver `EstadoDelChequeoMfa`. Opcional SÓLO para que los dobles de prueba no
   * tengan que traerlo: `AuthProvider` siempre lo pone. Los guardias bloquean
   * con `pending`/`failed`, nunca con `undefined`.
   */
  mfaCheckStatus?: EstadoDelChequeoMfa
  /**
   * Ver `ConfirmacionDeLaSesion`. Opcional por lo mismo que `mfaCheckStatus`:
   * `AuthProvider` siempre lo pone; un doble de prueba sin él se lee como
   * 'no-aplica' (lo de siempre).
   */
  confirmacionDeLaSesion?: ConfirmacionDeLaSesion
  /**
   * True when Supabase Auth has a valid JWT but the backend returned 401
   * "User not found" — meaning the user hasn't completed onboarding yet.
   * Callers should redirect to /onboarding/seleccionar-rol when this is true.
   */
  needsOnboarding: boolean
  /**
   * El perfil elegido en «Selecciona tu perfil» (o al registrarse con
   * `?role=`), guardado en los metadatos del usuario de Supabase. Con el
   * onboarding sin terminar, la entrada retoma en el onboarding de ese
   * perfil y no en el selector. `null` si nunca eligió.
   */
  perfilElegido: PerfilDeOnboarding | null
  /** Agency the user belongs to (populated for AGENT / INMOBILIARIA roles AND
   *  for personal-role users who hold an agency membership — coexistence) */
  agency: Agency | null
  /** The user's role within the agency */
  agencyRole: AgencyMemberRole | null
  /** Membership status within the agency ('ACTIVE' | 'INVITED' | …) or null. */
  agencyMemberStatus: string | null
  /** True ONLY when the user is an ACTIVE agency member — this is what grants
   *  agency-panel access. An INVITED (not-yet-accepted) member is false. */
  hasActiveAgencyMembership: boolean
  /** True once the agency-membership probe has settled for the current session.
   *  The agency panel HOLDS (spinner) rather than bouncing a personal-role user
   *  while this is false, so a dual-context user isn't redirected mid-probe. */
  agencyMembershipChecked: boolean
  /** Effective active context. Pure agency → 'agency'; pure tenant/landlord →
   *  'personal'; dual-context → the user's persisted choice (default personal). */
  activeContext: ActiveContext
}


export interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<User | null>
  /** `perfil` → user_metadata: datos que ya conocemos antes de que tenga cuenta. */
  signUpWithEmail: (email: string, password: string, redirectTo?: string, intendedRole?: UserRole, perfil?: Record<string, string>) => Promise<{ requiresConfirmation: boolean }>
  sendPasswordReset: (email: string) => Promise<void>
  /** Reenvía el correo de confirmación del registro, con el mismo `redirectTo` del primero. */
  resendSignUpEmail: (email: string, redirectTo?: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  /** Re-authenticate with current password to verify identity before sensitive operations */
  verifyCurrentPassword: (password: string) => Promise<boolean>
  /** Change password: verifies current password on the backend then updates.
   *  currentPassword is optional — omit for Google-only accounts. */
  changePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>
  signOut: () => Promise<void>
  /** Alias for signOut - backwards compatible */
  logout: () => Promise<void>
  /** Re-fetches the bootstrap AND re-evaluates the second-factor requirement;
   *  resolves with where the user must go before reaching a panel (T-0123 WU-3). */
  refreshUser: () => Promise<MfaDestino>
  /** null clears a field on the backend; undefined leaves it unchanged */
  updateProfile: (data: { firstName?: string | null; lastName?: string | null; phone?: string | null; rut?: string | null; address?: string | null; birthDate?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null }) => Promise<void>
  setMfaVerified: () => void
  /** Vuelve a preguntar por el segundo factor después de un `failed`. Opcional por lo mismo que `mfaCheckStatus`. */
  retryMfaCheck?: () => Promise<void>
  /**
   * «Reintentar» de una sesión `sin-confirmar` (ver `ConfirmacionDeLaSesion`):
   * recarga la página, que vuelve a levantar auth-js desde cero. Opcional por
   * lo mismo que `mfaCheckStatus`.
   */
  reintentarConfirmarLaSesion?: () => void
  /**
   * Pregunta a Supabase si la sesión guardada sigue viva (la renueva si el
   * token venció). `muerta` = no hay sesión y ya no queda guardada: renovar
   * falló de verdad. Lo usa «Continuar» de `SesionYaAbierta`. Opcional por lo
   * mismo que `mfaCheckStatus`.
   */
  confirmarSesionVigente?: () => Promise<VigenciaDeLaSesion>
  /** Set agency context (called after registration or login for agency members) */
  setAgency: (agency: Agency | null, role: AgencyMemberRole | null) => void
  /** Manually retry fetching the agency membership (e.g. an error card's
   *  "Intentar de nuevo" button). Also re-arms the automatic self-heal
   *  backstop in `AuthProvider` if it had already given up retrying. */
  refreshAgency: () => Promise<void>
  /** Switch the active context for a DUAL-CONTEXT user. Persisted per-user;
   *  a no-op for single-context users. */
  setActiveContext: (context: ActiveContext) => void
  /**
   * Guarda el perfil elegido en «Selecciona tu perfil» para que la próxima
   * entrada —desde cualquier dispositivo— retome en su onboarding.
   */
  elegirPerfil: (perfil: PerfilDeOnboarding) => Promise<void>
}

/**
 * @deprecated Mock user type - kept for backwards compatibility during migration
 */
export interface MockUser {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  avatar?: string
}
