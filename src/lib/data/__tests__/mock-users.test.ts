import { describe, it, expect } from 'vitest';
import {
  mockUsers,
  findMockUser,
  validateMockCredentials,
} from '@/lib/data/mock-users';

// =============================================================================
// mockUsers data integrity
// =============================================================================

describe('mockUsers', () => {
  it('contains exactly 6 users', () => {
    expect(mockUsers).toHaveLength(6);
  });

  it('every user has the required properties', () => {
    for (const user of mockUsers) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
    }
  });

  it('every user has a unique id', () => {
    const ids = mockUsers.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every user has a unique email', () => {
    const emails = mockUsers.map((u) => u.email.toLowerCase());
    expect(new Set(emails).size).toBe(emails.length);
  });

  it('contains all three roles: landlord, tenant, agency', () => {
    const roles = new Set(mockUsers.map((u) => u.role));
    expect(roles).toContain('landlord');
    expect(roles).toContain('tenant');
    expect(roles).toContain('agency');
  });

  it('contains the expected specific users', () => {
    const emails = mockUsers.map((u) => u.email);
    expect(emails).toContain('landlord@example.com');
    expect(emails).toContain('tenant@example.com');
    expect(emails).toContain('agency@example.com');
    expect(emails).toContain('propietario@arriendo.co');
    expect(emails).toContain('inquilino@arriendo.co');
    expect(emails).toContain('inmobiliaria@arriendo.co');
  });

  it('user-1 is the landlord Nicolas Garcia', () => {
    const user = mockUsers.find((u) => u.id === 'user-1');
    expect(user).toBeDefined();
    expect(user!.email).toBe('landlord@example.com');
    expect(user!.name).toBe('Nicolas Garcia');
    expect(user!.role).toBe('landlord');
  });

  it('user-5 is the agency Inmobiliaria ABC', () => {
    const user = mockUsers.find((u) => u.id === 'user-5');
    expect(user).toBeDefined();
    expect(user!.email).toBe('agency@example.com');
    expect(user!.name).toBe('Inmobiliaria ABC');
    expect(user!.role).toBe('agency');
  });
});

// =============================================================================
// findMockUser
// =============================================================================

describe('findMockUser', () => {
  it('finds a user by exact email', () => {
    const user = findMockUser('landlord@example.com');
    expect(user).toBeDefined();
    expect(user!.id).toBe('user-1');
    expect(user!.name).toBe('Nicolas Garcia');
  });

  it('performs case-insensitive email lookup', () => {
    const user = findMockUser('LANDLORD@EXAMPLE.COM');
    expect(user).toBeDefined();
    expect(user!.id).toBe('user-1');
  });

  it('handles mixed-case email lookup', () => {
    const user = findMockUser('Tenant@Example.Com');
    expect(user).toBeDefined();
    expect(user!.id).toBe('user-2');
  });

  it('returns undefined for a non-existent email', () => {
    const user = findMockUser('nonexistent@example.com');
    expect(user).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    const user = findMockUser('');
    expect(user).toBeUndefined();
  });

  it('finds each of the six users by their email', () => {
    for (const expected of mockUsers) {
      const found = findMockUser(expected.email);
      expect(found).toBeDefined();
      expect(found!.id).toBe(expected.id);
    }
  });
});

// =============================================================================
// validateMockCredentials
// =============================================================================

describe('validateMockCredentials', () => {
  describe('valid credentials', () => {
    it('validates landlord@example.com with password123', () => {
      const result = validateMockCredentials('landlord@example.com', 'password123');
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe('user-1');
      expect(result.error).toBeUndefined();
    });

    it('validates tenant@example.com with password123', () => {
      const result = validateMockCredentials('tenant@example.com', 'password123');
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.role).toBe('tenant');
    });

    it('validates propietario@arriendo.co with demo2024', () => {
      const result = validateMockCredentials('propietario@arriendo.co', 'demo2024');
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe('user-3');
    });

    it('validates agency@example.com with password123', () => {
      const result = validateMockCredentials('agency@example.com', 'password123');
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.role).toBe('agency');
    });

    it('performs case-insensitive email matching', () => {
      const result = validateMockCredentials('LANDLORD@EXAMPLE.COM', 'password123');
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
    });
  });

  describe('user not found', () => {
    it('returns error for non-existent email', () => {
      const result = validateMockCredentials('unknown@example.com', 'password123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
      expect(result.user).toBeUndefined();
    });

    it('returns error for empty email', () => {
      const result = validateMockCredentials('', 'password123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
    });
  });

  describe('wrong password', () => {
    it('returns error for incorrect password', () => {
      const result = validateMockCredentials('landlord@example.com', 'wrongpassword');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Contrasena incorrecta');
      expect(result.user).toBeUndefined();
    });

    it('treats password comparison as case-sensitive', () => {
      const result = validateMockCredentials('landlord@example.com', 'PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Contrasena incorrecta');
    });

    it('returns error for empty password on existing user', () => {
      const result = validateMockCredentials('landlord@example.com', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Contrasena incorrecta');
    });
  });

  describe('return shape', () => {
    it('returns { valid: true, user } on success', () => {
      const result = validateMockCredentials('landlord@example.com', 'password123');
      expect(result).toEqual({
        valid: true,
        user: expect.objectContaining({
          id: 'user-1',
          email: 'landlord@example.com',
        }),
      });
    });

    it('returns { valid: false, error } on failure', () => {
      const result = validateMockCredentials('unknown@x.com', 'pass');
      expect(result).toEqual({
        valid: false,
        error: expect.any(String),
      });
    });
  });
});
