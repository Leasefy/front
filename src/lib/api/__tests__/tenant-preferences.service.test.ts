/**
 * tenant-preferences.service — authoritative housing-preferences store.
 *
 * Contracts under test:
 * - PATCH is FULL-REPLACEMENT: `payloadFromForm` must always produce the
 *   complete object, round-tripping the fields the perfil form does not edit
 *   (preferredBedrooms, preferredPropertyTypes) so a save never wipes them.
 * - GET returns the row or null (no-row / defensive 404).
 * - Table values are preferred over the legacy snapshot per-field, with the
 *   snapshot as fallback (wizard seeding).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('../client', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    apiClient: {
      get: (...args: unknown[]) => getMock(...args),
      patch: (...args: unknown[]) => patchMock(...args),
    },
    ApiError,
  }
})

import { ApiError } from '../client'
import {
  getTenantPreferences,
  updateTenantPreferences,
  preferencesFromSnapshot,
  mergeTablePreferencesOverSnapshot,
  formFromPreferences,
  payloadFromForm,
  type TenantPreferences,
} from '../tenant-preferences.service'

const ROW: TenantPreferences = {
  preferredCities: ['Chapinero'],
  preferredBedrooms: 2,
  preferredPropertyTypes: ['APARTMENT'],
  minBudget: 800000,
  maxBudget: 1500000,
  petFriendly: true,
  moveInDate: '2026-08-01T00:00:00.000Z',
  preferredAmenities: ['parqueadero'],
  petDetails: 'Un gato',
  preferredContact: 'whatsapp',
}

beforeEach(() => {
  getMock.mockReset()
  patchMock.mockReset()
})

describe('getTenantPreferences', () => {
  it('returns the row when it exists', async () => {
    getMock.mockResolvedValue(ROW)
    expect(await getTenantPreferences()).toEqual(ROW)
    expect(getMock).toHaveBeenCalledWith('/users/me/preferences')
  })

  it('returns null for the no-row case (null body)', async () => {
    getMock.mockResolvedValue(null)
    expect(await getTenantPreferences()).toBeNull()
  })

  it('returns null on a defensive 404', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'Not found'))
    expect(await getTenantPreferences()).toBeNull()
  })

  it('rethrows non-404 errors', async () => {
    getMock.mockRejectedValue(new ApiError(500, 'boom'))
    await expect(getTenantPreferences()).rejects.toThrow('boom')
  })
})

describe('payloadFromForm — full-replacement round-trip', () => {
  it('includes untouched bedrooms and property types from the current row', () => {
    // The user edits only the budget; the section has no bedrooms UI.
    const form = { ...formFromPreferences(ROW), maxBudget: '1800000' }

    const payload = payloadFromForm(form, ROW)

    expect(payload).toEqual({
      preferredCities: ['Chapinero'],
      preferredAmenities: ['parqueadero'],
      petFriendly: true,
      minBudget: 800000,
      maxBudget: 1800000,
      moveInDate: '2026-08-01',
      petDetails: 'Un gato',
      preferredContact: 'whatsapp',
      // Round-tripped — full replacement must not wipe them.
      preferredBedrooms: 2,
      preferredPropertyTypes: ['APARTMENT'],
    })
  })

  it('omits cleared fields entirely (backend resets them) and parses comma lists', () => {
    const form = {
      minBudget: '',
      maxBudget: '2000000',
      preferredCities: ' Usaquén ,  Chicó ,, ',
      preferredAmenities: '',
      moveInDate: '',
      petFriendly: false,
      petDetails: 'stale text kept in the input',
      preferredContact: '',
    }

    const payload = payloadFromForm(form, null)

    expect(payload).toEqual({
      preferredCities: ['Usaquén', 'Chicó'],
      preferredAmenities: [],
      petFriendly: false,
      maxBudget: 2000000,
    })
    // petDetails omitted when petFriendly is false.
    expect(payload).not.toHaveProperty('petDetails')
    expect(payload).not.toHaveProperty('preferredBedrooms')
  })

  it('updateTenantPreferences PATCHes the payload', async () => {
    patchMock.mockResolvedValue(ROW)
    const payload = payloadFromForm(formFromPreferences(ROW), ROW)
    await updateTenantPreferences(payload)
    expect(patchMock).toHaveBeenCalledWith('/users/me/preferences', payload)
  })
})

describe('mergeTablePreferencesOverSnapshot', () => {
  const snapshot = {
    budgetMin: 500000,
    budgetMax: 900000,
    preferredZones: ['Suba'],
    preferredAmenities: ['piscina'],
    moveInDate: '2026-05-01',
    hasPets: true,
    petDetails: 'Perro pequeño',
    preferredContact: 'email' as const,
  }

  it('prefers non-empty table values over the snapshot', () => {
    const merged = mergeTablePreferencesOverSnapshot(ROW, snapshot)
    expect(merged.minBudget).toBe(800000)
    expect(merged.preferredCities).toEqual(['Chapinero'])
    expect(merged.preferredContact).toBe('whatsapp')
    expect(merged.moveInDate).toBe('2026-08-01')
  })

  it('falls back to the snapshot for empty table fields', () => {
    const merged = mergeTablePreferencesOverSnapshot(
      { ...ROW, preferredAmenities: [], petDetails: null, minBudget: null },
      snapshot,
    )
    expect(merged.preferredAmenities).toEqual(['piscina'])
    expect(merged.petDetails).toBe('Perro pequeño')
    expect(merged.minBudget).toBe(500000)
  })

  it('uses the snapshot entirely when no row exists', () => {
    expect(mergeTablePreferencesOverSnapshot(null, snapshot)).toEqual(
      preferencesFromSnapshot(snapshot),
    )
    expect(preferencesFromSnapshot(snapshot).minBudget).toBe(500000)
    expect(preferencesFromSnapshot(snapshot).preferredCities).toEqual(['Suba'])
    expect(preferencesFromSnapshot(snapshot).petFriendly).toBe(true)
  })

  it('maps an absent snapshot to empty preferences', () => {
    const empty = preferencesFromSnapshot(undefined)
    expect(empty.preferredCities).toEqual([])
    expect(empty.minBudget).toBeNull()
    expect(empty.petFriendly).toBe(false)
  })
})
