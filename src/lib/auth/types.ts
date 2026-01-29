/**
 * Auth Types - Type definitions for authentication system
 *
 * This is a frontend MVP with mock auth. Types are designed to be
 * compatible with real auth backends (Clerk, Auth.js, etc.).
 */

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'tenant' | 'landlord'
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>
  register: (name: string, email: string, password: string, role: 'tenant' | 'landlord') => Promise<{ success: boolean; error?: string; user?: User }>
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
  role: 'tenant' | 'landlord'
  avatar?: string
}
