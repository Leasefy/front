'use client'

import { useContext } from 'react'
import { AuthContext } from './auth-context'
import type { AuthContextType } from './types'

/**
 * useAuth Hook
 *
 * Access authentication state and methods from any component.
 *
 * @example
 * const { user, isAuthenticated, signInWithGoogle, signOut, logout, refreshUser } = useAuth()
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
