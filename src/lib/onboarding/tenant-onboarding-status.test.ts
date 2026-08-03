/**
 * Backend-first tenant onboarding derivation.
 *
 * The backend (`GET /users/me` mapped into the auth-context `User`) is the
 * source of truth for onboarding completeness; `plan_onboarding_tenant` in
 * localStorage is only a draft/cache that gets self-healed (rehydrated) when
 * it disagrees with a complete backend profile.
 *
 * Security invariants under test:
 * - cache payloads are identity-scoped (userId) — another account's payload
 *   reads as absent and is overwritten, never inherited (PII leak guard);
 * - the degraded Supabase-session fallback (profileSource 'session', which
 *   fabricates onboardingCompleted) never derives as complete nor rehydrates.
 *
 * Completeness contract under test (flag criterion): overall isComplete =
 * the backend onboardingCompletedAt flag (via user.onboardingCompleted);
 * a Google-metadata name without the flag must NOT count as complete, and
 * step 1 requires firstName AND phone (phone is wizard evidence).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { User } from '@/lib/auth/types'
import {
  TENANT_ONBOARDING_STORAGE_KEY,
  deriveTenantOnboardingStatus,
  readTenantOnboardingCacheStatus,
  rehydrateTenantOnboardingCache,
} from './tenant-onboarding-status'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'ana@example.com',
    name: 'Ana Pérez',
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '3001234567',
    role: 'tenant',
    profileSource: 'backend',
    onboardingCompleted: true,
    tenantOnboardingData: {
      preferredContact: 'whatsapp',
      budgetMin: 800000,
      budgetMax: 1500000,
      preferredZones: ['Chapinero'],
      preferredAmenities: ['parking'],
      moveInDate: '2026-08-01',
      hasPets: false,
      petDetails: '',
    },
    ...overrides,
  } as User
}

beforeEach(() => {
  localStorage.clear()
})

describe('deriveTenantOnboardingStatus', () => {
  it('is fully incomplete without a user', () => {
    expect(deriveTenantOnboardingStatus(null)).toEqual({
      basicInfoComplete: false,
      preferencesComplete: false,
      isComplete: false,
    })
  })

  it('marks a provisioned backend profile with saved preferences as fully complete', () => {
    expect(deriveTenantOnboardingStatus(makeUser())).toEqual({
      basicInfoComplete: true,
      preferencesComplete: true,
      isComplete: true,
    })
  })

  it('never trusts the degraded session fallback (fabricated onboardingCompleted)', () => {
    const status = deriveTenantOnboardingStatus(
      makeUser({ profileSource: 'session', tenantOnboardingData: undefined }),
    )
    expect(status).toEqual({
      basicInfoComplete: false,
      preferencesComplete: false,
      isComplete: false,
    })
  })

  it('treats a flag-stamped profile without saved preferences as complete (flag criterion)', () => {
    const status = deriveTenantOnboardingStatus(
      makeUser({ tenantOnboardingData: undefined }),
    )
    expect(status.basicInfoComplete).toBe(true)
    expect(status.preferencesComplete).toBe(false)
    expect(status.isComplete).toBe(true)
  })

  it('a Google-metadata name WITHOUT the wizard flag is not complete and does not tick step 1', () => {
    // Auto-provisioned OAuth user: firstName from Google, no phone, flag null.
    const status = deriveTenantOnboardingStatus(
      makeUser({
        onboardingCompleted: false,
        phone: undefined,
        tenantOnboardingData: undefined,
      }),
    )
    expect(status).toEqual({
      basicInfoComplete: false,
      preferencesComplete: false,
      isComplete: false,
    })
  })

  it('name AND phone tick step 1, but overall completeness still requires the flag', () => {
    const status = deriveTenantOnboardingStatus(
      makeUser({ onboardingCompleted: false, tenantOnboardingData: undefined }),
    )
    expect(status.basicInfoComplete).toBe(true)
    expect(status.isComplete).toBe(false)
  })

  it('treats an auto-provisioned user (no name) as incomplete', () => {
    const status = deriveTenantOnboardingStatus(
      makeUser({
        firstName: '',
        phone: undefined,
        onboardingCompleted: false,
        tenantOnboardingData: undefined,
      }),
    )
    expect(status).toEqual({
      basicInfoComplete: false,
      preferencesComplete: false,
      isComplete: false,
    })
  })

  it('requires both budget bounds for preferencesComplete', () => {
    const status = deriveTenantOnboardingStatus(
      makeUser({
        tenantOnboardingData: { budgetMin: 800000, budgetMax: undefined },
      }),
    )
    expect(status.preferencesComplete).toBe(false)
  })
})

describe('readTenantOnboardingCacheStatus', () => {
  it('returns empty progress with no cache', () => {
    expect(readTenantOnboardingCacheStatus()).toEqual({
      completedSteps: [],
      isComplete: false,
    })
  })

  it('returns empty progress on corrupt JSON', () => {
    localStorage.setItem(TENANT_ONBOARDING_STORAGE_KEY, '{not json')
    expect(readTenantOnboardingCacheStatus()).toEqual({
      completedSteps: [],
      isComplete: false,
    })
  })

  it('migrates legacy step 3 (employment) to step 2 (preferences)', () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ completedSteps: [1, 3] }),
    )
    expect(readTenantOnboardingCacheStatus()).toEqual({
      completedSteps: [1, 2],
      isComplete: true,
    })
  })

  it("treats another user's payload as absent (cross-account PII guard)", () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ userId: 'other-user', completedSteps: [1, 2], isComplete: true }),
    )
    expect(readTenantOnboardingCacheStatus('u1')).toEqual({
      completedSteps: [],
      isComplete: false,
    })
  })

  it('accepts a payload owned by the current user', () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ userId: 'u1', completedSteps: [1, 2] }),
    )
    expect(readTenantOnboardingCacheStatus('u1')).toEqual({
      completedSteps: [1, 2],
      isComplete: true,
    })
  })

  it('keeps unowned payloads usable (anonymous pre-auth wizard drafts)', () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ completedSteps: [1] }),
    )
    expect(readTenantOnboardingCacheStatus('u1')).toEqual({
      completedSteps: [1],
      isComplete: false,
    })
  })
})

describe('rehydrateTenantOnboardingCache', () => {
  it('rebuilds a cleared cache from a complete backend profile, stamps ownership, and notifies listeners', () => {
    const listener = vi.fn()
    window.addEventListener('onboarding-updated', listener)

    rehydrateTenantOnboardingCache(makeUser())

    const cache = JSON.parse(
      localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)!,
    )
    expect(cache.userId).toBe('u1')
    expect(cache.isComplete).toBe(true)
    expect(cache.completedSteps).toEqual([1, 2])
    expect(cache.draft).toMatchObject({
      displayName: 'Ana Pérez',
      phone: '3001234567',
      budgetMin: 800000,
      budgetMax: 1500000,
      preferredZones: ['Chapinero'],
    })
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('onboarding-updated', listener)
  })

  it('no-ops for an incomplete backend profile (never fakes completion)', () => {
    rehydrateTenantOnboardingCache(
      makeUser({ firstName: '', onboardingCompleted: false }),
    )
    expect(localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)).toBeNull()
  })

  it('no-ops for a degraded session profile (outage never poisons the cache)', () => {
    rehydrateTenantOnboardingCache(makeUser({ profileSource: 'session' }))
    expect(localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)).toBeNull()
  })

  it('no-ops when the cache already agrees for the same user (no event spam)', () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        userId: 'u1',
        draft: { displayName: 'Ana' },
        completedSteps: [1, 2],
        isComplete: true,
        completedAt: '2026-01-01T00:00:00.000Z',
      }),
    )
    const listener = vi.fn()
    window.addEventListener('onboarding-updated', listener)

    rehydrateTenantOnboardingCache(makeUser())

    expect(listener).not.toHaveBeenCalled()
    expect(
      JSON.parse(localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)!)
        .completedAt,
    ).toBe('2026-01-01T00:00:00.000Z')
    window.removeEventListener('onboarding-updated', listener)
  })

  it("fully overwrites another user's payload without preserving any of its PII", () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        userId: 'other-user',
        draft: { displayName: 'Otro Usuario', phone: '3999999999', budgetMin: 1 },
        completedSteps: [1, 2],
        isComplete: true,
        completedAt: '2020-01-01T00:00:00.000Z',
      }),
    )

    rehydrateTenantOnboardingCache(makeUser())

    const cache = JSON.parse(
      localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)!,
    )
    expect(cache.userId).toBe('u1')
    // Nothing from the foreign payload survives — draft comes from u1's backend data.
    expect(cache.draft).toMatchObject({
      displayName: 'Ana Pérez',
      phone: '3001234567',
    })
    expect(JSON.stringify(cache)).not.toContain('Otro Usuario')
    expect(JSON.stringify(cache)).not.toContain('3999999999')
    expect(cache.completedAt).not.toBe('2020-01-01T00:00:00.000Z')
  })

  it('adopts (stamps) an unowned complete cache with the current user', () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        draft: { displayName: 'Ana' },
        completedSteps: [1, 2],
        isComplete: true,
        completedAt: '2026-01-01T00:00:00.000Z',
      }),
    )

    rehydrateTenantOnboardingCache(makeUser())

    const cache = JSON.parse(
      localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)!,
    )
    expect(cache.userId).toBe('u1')
    expect(cache.completedAt).toBe('2026-01-01T00:00:00.000Z')
    // The anonymous draft belongs to this session's own pre-auth flow — kept.
    expect(cache.draft).toEqual({ displayName: 'Ana' })
  })

  it('heals a stale incomplete same-user cache but preserves the in-progress draft', () => {
    localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        userId: 'u1',
        draft: { displayName: 'Nombre En Edición', budgetMin: 999 },
        currentStep: 1,
        completedSteps: [1],
      }),
    )

    rehydrateTenantOnboardingCache(makeUser())

    const cache = JSON.parse(
      localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)!,
    )
    expect(cache.userId).toBe('u1')
    expect(cache.isComplete).toBe(true)
    expect(cache.completedSteps).toEqual([1, 2])
    // The user's local draft edits are never lost.
    expect(cache.draft).toEqual({ displayName: 'Nombre En Edición', budgetMin: 999 })
  })
})
