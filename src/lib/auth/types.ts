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
export type BackendRole = 'TENANT' | 'LANDLORD' | 'BOTH' | 'ADMIN' | 'AGENT'

export function toBackendRole(role: UserRole): BackendRole {
  if (role === 'agency') return 'AGENT'
  return role === 'landlord' ? 'LANDLORD' : 'TENANT'
}

export function toFrontendRole(role: BackendRole): UserRole {
  if (role === 'AGENT') return 'agency'
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
  preferredContact?: PreferredContact

  // Step 2 - Housing Preferences
  budgetMin?: number
  budgetMax?: number
  preferredZones?: string[]
  preferredAmenities?: string[]
  moveInDate?: string
  hasPets?: boolean
  petDetails?: string

  // Employment & Income (collected during property application, not onboarding)
  employmentType?: EmploymentType
  companyName?: string
  monthlyIncome?: number
  additionalIncome?: number

  // Documents (collected during property application, not onboarding)
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
  rentPrice?: number

  // Step 3 - Ideal Tenant
  minIncomeRatio?: number
  acceptPets?: boolean
  minRiskLevel?: RiskLevel

  // Step 4 - Payments
  bankAccount?: string
  bankName?: string
  acceptedPaymentMethods?: PaymentMethod[]
  preferredPaymentDay?: number
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
  role: UserRole
  /** The raw backend role before frontend mapping */
  backendRole?: BackendRole
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
}

export interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Alias for signOut - backwards compatible */
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setMfaVerified: () => void
  /** Change password for authenticated user (current password required unless using OAuth) */
  changePassword?: (currentPassword: string | undefined, newPassword: string) => Promise<void>
  /** Update password from a reset-password flow (no current password required) */
  updatePassword?: (newPassword: string) => Promise<void>
  /** Whether the user needs to complete onboarding before accessing the panel */
  needsOnboarding?: boolean
  /** The agency-level role of the current user (e.g. 'ADMIN', 'AGENT') */
  agencyRole?: string
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
