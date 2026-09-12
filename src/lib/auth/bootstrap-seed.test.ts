/**
 * bootstrap-seed.test.ts — one-shot-per-field seed consumption.
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  setBootstrapSeed,
  clearBootstrapSeed,
  consumePermissionsSeed,
  consumeAgencySubscriptionSeed,
  consumeMySubscriptionSeed,
} from './bootstrap-seed'

afterEach(() => {
  clearBootstrapSeed()
})

describe('bootstrap-seed', () => {
  it('returns null for every field when nothing was seeded', () => {
    expect(consumePermissionsSeed()).toBeNull()
    expect(consumeAgencySubscriptionSeed()).toBeNull()
    expect(consumeMySubscriptionSeed()).toBeNull()
  })

  it('hands the seeded permissions value to the first consumer, then null after', () => {
    const permissions = { memberId: 'm1', role: 'ADMIN', isAdmin: true, permissions: null, effectivePermissions: 'FULL_ACCESS' as const, usingDefaults: false }
    setBootstrapSeed({ permissions })
    expect(consumePermissionsSeed()).toEqual(permissions)
    expect(consumePermissionsSeed()).toBeNull()
  })

  it('each field is consumed independently — reading one does not clear another', () => {
    const agencySubscription = { subscription: null, openCharge: null, status: null, canOfferRentals: true }
    const mySubscription = {
      id: 's1', userId: 'u1', planId: 'pro' as const, status: 'active' as const,
      billingCycle: 'monthly' as const, currentPeriodStart: '2026-01-01', currentPeriodEnd: '2026-02-01', cancelAtPeriodEnd: false,
    }
    setBootstrapSeed({ agencySubscription, mySubscription })

    expect(consumeAgencySubscriptionSeed()).toEqual(agencySubscription)
    // mySubscription is still there — consuming agencySubscription didn't touch it.
    expect(consumeMySubscriptionSeed()).toEqual(mySubscription)
    // Both are now consumed.
    expect(consumeAgencySubscriptionSeed()).toBeNull()
    expect(consumeMySubscriptionSeed()).toBeNull()
  })

  it('a field left out of setBootstrapSeed is never seeded (stays null)', () => {
    setBootstrapSeed({ permissions: { memberId: 'm1', role: 'ADMIN', isAdmin: true, permissions: null, effectivePermissions: 'FULL_ACCESS', usingDefaults: false } })
    expect(consumeAgencySubscriptionSeed()).toBeNull()
    expect(consumeMySubscriptionSeed()).toBeNull()
  })

  it('clearBootstrapSeed wipes every field — the next sign-in never inherits a prior session seed', () => {
    setBootstrapSeed({
      permissions: { memberId: 'm1', role: 'ADMIN', isAdmin: true, permissions: null, effectivePermissions: 'FULL_ACCESS', usingDefaults: false },
    })
    clearBootstrapSeed()
    expect(consumePermissionsSeed()).toBeNull()
  })

  it('setBootstrapSeed replaces the whole seed — a second call does not merge with the first', () => {
    setBootstrapSeed({ permissions: { memberId: 'm1', role: 'ADMIN', isAdmin: true, permissions: null, effectivePermissions: 'FULL_ACCESS', usingDefaults: false } })
    setBootstrapSeed({ mySubscription: {
      id: 's1', userId: 'u1', planId: 'pro', status: 'active',
      billingCycle: 'monthly', currentPeriodStart: '2026-01-01', currentPeriodEnd: '2026-02-01', cancelAtPeriodEnd: false,
    } })
    expect(consumePermissionsSeed()).toBeNull()
  })
})
