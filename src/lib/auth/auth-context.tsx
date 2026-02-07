'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthContextType, UserRole } from './types'
import { validateMockCredentials, mockUsers } from '@/lib/data/mock-users'
import { StorageManager } from '@/lib/utils/storage'
import { authLogger } from '@/lib/utils/logger'

const AUTH_STORAGE_KEY = 'arriendo-facil-auth'

// Storage manager instance
const storage = new StorageManager<User>(AUTH_STORAGE_KEY)

/**
 * Auth Context
 *
 * Provides authentication state and methods throughout the app.
 * Uses localStorage for persistence (mock auth for frontend MVP).
 */
export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = storage.get({
      onError: (error) => {
        authLogger.error('Error loading auth state', error)
        storage.remove()
      },
    })

    if (stored) {
      setUser(stored)
    }
    setIsLoading(false)
  }, [])

  // Persist user to localStorage
  const persistUser = useCallback((userData: User | null) => {
    if (userData) {
      storage.set(userData, {
        onError: (error) => {
          authLogger.error('Error saving auth state', error)
        },
      })
    } else {
      storage.remove({
        onError: (error) => {
          authLogger.error('Error removing auth state', error)
        },
      })
    }
  }, [])

  // Login with email and password
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const result = validateMockCredentials(email, password)

      if (!result.valid || !result.user) {
        return { success: false, error: result.error || 'Error al iniciar sesion' }
      }

      const userData: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        avatar: result.user.avatar,
      }

      setUser(userData)
      persistUser(userData)

      return { success: true, user: userData }
    },
    [persistUser]
  )

  // Register new user (mock - adds to memory only)
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: UserRole
    ): Promise<{ success: boolean; error?: string; user?: User }> => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check if email already exists
      const existingUser = mockUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      )
      if (existingUser) {
        return { success: false, error: 'Este correo ya está registrado' }
      }

      // Validate password
      if (password.length < 8) {
        return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }
      }

      // Create new user (in memory only - won't persist between reloads)
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        name,
        role,
        // Roboth landlords and tenants start with onboarding not completed
        onboardingCompleted: false,
        onboardingStatus: 'not_started',
      }

      setUser(newUser)
      persistUser(newUser)

      return { success: true, user: newUser }
    },
    [persistUser]
  )

  // Login with Google (mock - uses first tenant user)
  const loginWithGoogle = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock: use first tenant user for social login
    const mockTenant = mockUsers.find((u) => u.role === 'tenant')
    if (mockTenant) {
      const userData: User = {
        id: mockTenant.id,
        email: mockTenant.email,
        name: mockTenant.name,
        role: mockTenant.role,
        avatar: mockTenant.avatar,
      }
      setUser(userData)
      persistUser(userData)
    }
  }, [persistUser])

  // Login with Apple (mock - uses first tenant user)
  const loginWithApple = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock: use first tenant user for social login
    const mockTenant = mockUsers.find((u) => u.role === 'tenant')
    if (mockTenant) {
      const userData: User = {
        id: mockTenant.id,
        email: mockTenant.email,
        name: mockTenant.name,
        role: mockTenant.role,
        avatar: mockTenant.avatar,
      }
      setUser(userData)
      persistUser(userData)
    }
  }, [persistUser])

  // Logout
  const logout = useCallback(() => {
    setUser(null)
    persistUser(null)
  }, [persistUser])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
