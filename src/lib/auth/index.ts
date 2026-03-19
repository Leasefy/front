/**
 * Auth Module - Centralized exports for authentication
 *
 * Usage:
 * import { AuthProvider, useAuth } from '@/lib/auth'
 * import type { User, AuthState } from '@/lib/auth'
 */

export { AuthProvider, AuthContext } from './auth-context'
export { useAuth } from './use-auth'
export type { User, AuthState, AuthContextType, MockUser, OnboardingData, TenantOnboardingData, OnboardingStatus, PaymentMethod, RiskLevel, PreferredContact, EmploymentType, BackendRole, UserRole } from './types'
export { toBackendRole, toFrontendRole } from './types'
