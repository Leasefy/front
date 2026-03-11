---
phase: "08-authentication-ui"
plan: "02"
title: "Auth State & Protected Routes"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Auth context provides user state across app"
    - "Mock auth persists to localStorage"
    - "Protected routes redirect to /auth if not logged in"
    - "Dashboard/panel pages require authentication"
    - "Login redirects to intended destination"
  artifacts:
    - path: "src/lib/auth/auth-context.tsx"
      description: "Auth context provider"
      min_lines: 60
    - path: "src/components/auth/ProtectedRoute.tsx"
      description: "Protected route wrapper"
      min_lines: 30
  key_links:
    - from: "layout.tsx"
      to: "AuthProvider"
      via: "context wrapper"
    - from: "panel pages"
      to: "ProtectedRoute"
      via: "route protection"
---

# Plan 02: Auth State & Protected Routes

## Objective

Implement mock authentication state management and route protection for dashboard pages.

## Context

This is a frontend MVP with mock auth. The auth system should:
- Store user state in localStorage
- Provide auth context to all components
- Protect dashboard/panel routes
- Redirect to login when needed
- Redirect back after successful login

### Protected Routes
- `/panel` - Landlord dashboard
- `/panel/*` - All panel sub-routes
- `/mis-aplicaciones` - Tenant applications

### Public Routes
- `/` - Home
- `/propiedades` - Property listings
- `/propiedades/*` - Property details
- `/aplicar/*` - Application wizard (could be protected later)
- `/auth` - Login/Register

## Tasks

### Task 1: Create Auth Types
**File**: `src/lib/auth/types.ts`

```tsx
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
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => void
}
```

**Verification**: Types defined for auth system.

### Task 2: Create Mock Users Data
**File**: `src/lib/data/mock-users.ts`

```tsx
// Pre-defined mock users for testing
export const mockUsers = [
  {
    id: '1',
    email: 'landlord@example.com',
    password: 'password123',
    name: 'Carlos Mendoza',
    role: 'landlord' as const,
  },
  {
    id: '2',
    email: 'tenant@example.com',
    password: 'password123',
    name: 'Maria Garcia',
    role: 'tenant' as const,
  },
]
```

**Verification**: Mock users available for login.

### Task 3: Create Auth Context Provider
**File**: `src/lib/auth/auth-context.tsx`

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, AuthContextType } from './types'
import { mockUsers } from '@/lib/data/mock-users'

const AUTH_STORAGE_KEY = 'arriendo-facil-auth'

// Create context
// Provider with:
// - Load user from localStorage on mount
// - login function (check against mock users)
// - register function (create new mock user)
// - loginWithGoogle (mock - use first tenant)
// - loginWithApple (mock - use first tenant)
// - logout function (clear storage)
// - Persist to localStorage on changes
```

**Verification**: Auth context provides login/logout functionality.

### Task 4: Create Auth Hook
**File**: `src/lib/auth/use-auth.ts`

```tsx
import { useContext } from 'react'
import { AuthContext } from './auth-context'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**Verification**: useAuth hook available for components.

### Task 5: Create Protected Route Component
**File**: `src/components/auth/ProtectedRoute.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('tenant' | 'landlord')[]
}

// Check if user is authenticated
// If not, redirect to /auth with return URL
// If role restriction, check user role
// Show loading while checking
```

**Verification**: Protected route redirects unauthenticated users.

### Task 6: Add Auth Provider to Layout
**File**: `src/app/layout.tsx`

Wrap app with AuthProvider:
```tsx
import { AuthProvider } from '@/lib/auth/auth-context'

// Wrap children with AuthProvider
// Place after other providers if any
```

**Verification**: Auth context available throughout app.

### Task 7: Protect Panel Routes
**File**: `src/app/panel/layout.tsx`

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function PanelLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['landlord']}>
      {children}
    </ProtectedRoute>
  )
}
```

**Verification**: Panel routes require landlord login.

### Task 8: Protect Mis Aplicaciones Route
**File**: `src/app/mis-aplicaciones/page.tsx`

Add protection to tenant applications page:
```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Wrap content with ProtectedRoute
// Allow tenant role
```

**Verification**: Mis aplicaciones requires tenant login.

### Task 9: Connect Auth Form to Context
**File**: `src/components/auth/AuthForm.tsx`

Update AuthForm to use auth context:
```tsx
import { useAuth } from '@/lib/auth/use-auth'
import { useRouter, useSearchParams } from 'next/navigation'

// Get login/register functions from context
// Handle form submit with context methods
// Redirect to returnUrl or home after success
// Show error messages for invalid credentials
```

**Verification**: Login/register actually authenticates user.

### Task 10: Add User Menu to Header
**File**: `src/components/layout/Header.tsx` (or equivalent)

Add user state to header:
```tsx
import { useAuth } from '@/lib/auth/use-auth'

// If authenticated: show user avatar/name + dropdown
// Dropdown: Dashboard link, Logout
// If not authenticated: show Login button
```

**Verification**: Header shows auth state.

### Task 11: Create Auth Barrel Export
**File**: `src/lib/auth/index.ts`

```tsx
export { AuthProvider, AuthContext } from './auth-context'
export { useAuth } from './use-auth'
export type { User, AuthState, AuthContextType } from './types'
```

**Verification**: All auth exports available.

## Verification Checklist

- [ ] Auth context provides user state
- [ ] localStorage persistence works
- [ ] Login with email/password works (mock users)
- [ ] Social login works (mock)
- [ ] Logout clears state
- [ ] /panel redirects to /auth if not logged in
- [ ] /mis-aplicaciones redirects to /auth if not logged in
- [ ] After login, redirects to intended page
- [ ] Header shows user state
- [ ] Role-based access (landlord for panel)

## Output

After completion:
1. Full mock auth system
2. Protected routes working
3. User state in header
4. Ready for real auth backend integration
