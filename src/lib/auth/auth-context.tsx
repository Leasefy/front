'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthContextType } from './types'
import { validateMockCredentials, mockUsers } from '@/lib/data/mock-users'

const AUTH_STORAGE_KEY = 'arriendo-facil-auth'

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
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      }
    } catch (error) {
      console.error('Error loading auth state:', error)
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Persist user to localStorage
  const persistUser = useCallback((userData: User | null) => {
    if (userData) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [])

  // Login with email and password
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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

      return { success: true }
    },
    [persistUser]
  )

  // Register new user (mock - adds to memory only)
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: 'tenant' | 'landlord'
    ): Promise<{ success: boolean; error?: string }> => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check if email already exists
      const existingUser = mockUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      )
      if (existingUser) {
        return { success: false, error: 'Este correo ya esta registrado' }
      }

      // Validate password
      if (password.length < 8) {
        return { success: false, error: 'La contrasena debe tener al menos 8 caracteres' }
      }

      // Create new user (in memory only - won't persist between reloads)
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        name,
        role,
      }

      setUser(newUser)
      persistUser(newUser)

      return { success: true }
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
