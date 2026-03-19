/**
 * Auth Types - Type definitions for authentication system
 *
 * Frontend uses lowercase roles for UX.
 * Backend uses uppercase roles (Prisma enum).
 */

// ============================================================================
// Roles
// ============================================================================

/** Frontend-facing role (used in UI logic, routes, etc.) */
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
  role: UserRole
  /** The raw backend role before frontend mapping */
  backendRole?: BackendRole
  /** True if the user has an email+password credential (false = Google-only) */
  hasPassword?: boolean
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
  /** Agency the user belongs to (populated for AGENT / INMOBILIARIA roles) */
  agency: Agency | null
  /** The user's role within the agency */
  agencyRole: AgencyMemberRole | null
}

export interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<User | null>
  signUpWithEmail: (email: string, password: string) => Promise<{ requiresConfirmation: boolean }>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  /** Re-authenticate with current password to verify identity before sensitive operations */
  verifyCurrentPassword: (password: string) => Promise<boolean>
  /** Change password: verifies current password on the backend then updates.
   *  currentPassword is optional — omit for Google-only accounts. */
  changePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>
  signOut: () => Promise<void>
  /** Alias for signOut - backwards compatible */
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; rut?: string; address?: string; birthDate?: string; emergencyContactName?: string; emergencyContactPhone?: string }) => Promise<void>
  setMfaVerified: () => void
  /** Set agency context (called after registration or login for agency members) */
  setAgency: (agency: Agency | null, role: AgencyMemberRole | null) => void
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
