import type { MockUser } from '@/lib/auth/types'

/**
 * Mock Users - Pre-defined users for testing authentication
 *
 * These users can be used to test login functionality:
 * - Landlord: landlord@example.com / password123
 * - Tenant: tenant@example.com / password123
 */

export const mockUsers: MockUser[] = [
  {
    id: 'user-1',
    email: 'landlord@example.com',
    password: 'password123',
    name: 'Carlos Mendoza',
    role: 'landlord',
    avatar: undefined,
  },
  {
    id: 'user-2',
    email: 'tenant@example.com',
    password: 'password123',
    name: 'Maria Garcia',
    role: 'tenant',
    avatar: undefined,
  },
  {
    id: 'user-3',
    email: 'propietario@arriendo.co',
    password: 'demo2024',
    name: 'Andres Rodriguez',
    role: 'landlord',
    avatar: undefined,
  },
  {
    id: 'user-4',
    email: 'inquilino@arriendo.co',
    password: 'demo2024',
    name: 'Sofia Martinez',
    role: 'tenant',
    avatar: undefined,
  },
]

/**
 * Find a mock user by email
 */
export function findMockUser(email: string): MockUser | undefined {
  return mockUsers.find((user) => user.email.toLowerCase() === email.toLowerCase())
}

/**
 * Validate mock user credentials
 */
export function validateMockCredentials(
  email: string,
  password: string
): { valid: boolean; user?: MockUser; error?: string } {
  const user = findMockUser(email)

  if (!user) {
    return { valid: false, error: 'Usuario no encontrado' }
  }

  if (user.password !== password) {
    return { valid: false, error: 'Contrasena incorrecta' }
  }

  return { valid: true, user }
}
