/**
 * Auth Types - Type definitions for authentication system
 *
 * This is a frontend MVP with mock auth. Types are designed to be
 * compatible with real auth backends (Clerk, Auth.js, etc.).
 */

export type UserRole = 'tenant' | 'landlord'

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

export interface TenantOnboardingData {
  // Step 1 - Welcome & Profile
  displayName?: string
  phone?: string
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

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  // Onboarding fields
  onboardingCompleted?: boolean
  onboardingStep?: number
  onboardingData?: OnboardingData
  tenantOnboardingData?: TenantOnboardingData
  onboardingStatus?: OnboardingStatus
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string; user?: User }>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => void
}

/**
 * Mock user type for testing login
 */
export interface MockUser {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  avatar?: string
}
