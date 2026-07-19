/**
 * Tenant housing preferences — authoritative store (`tenant_preferences`).
 *
 * - `GET /users/me/preferences` returns the row, or `null` when the user has
 *   no row yet (the backend responds 200 with a null body; a defensive 404
 *   guard is kept anyway).
 * - `PATCH /users/me/preferences` has FULL-REPLACEMENT semantics: omitted
 *   fields reset to `[]`/`null`/`false`. Callers MUST send the complete
 *   merged object — `payloadFromForm` round-trips the fields the perfil form
 *   does not edit (bedrooms, property types) so they are never wiped.
 * - The onboarding wizard's POST upserts this table server-side; the legacy
 *   `onboardingData` JSON on the user stays only as a display/seed fallback
 *   for profiles that predate the table (see `preferencesFromSnapshot`).
 */
import { apiClient, ApiError } from './client'
import type { TenantOnboardingData } from '@/lib/auth/types'

// ============================================================================
// Types
// ============================================================================

export interface TenantPreferences {
  preferredCities: string[]
  preferredBedrooms: number | null
  preferredPropertyTypes: string[]
  minBudget: number | null
  maxBudget: number | null
  petFriendly: boolean
  /** ISO datetime (Prisma Date serialization) or null */
  moveInDate: string | null
  preferredAmenities: string[]
  petDetails: string | null
  preferredContact: string | null
}

/** PATCH body. Omitted fields RESET on the backend (full replacement) — build
 *  it with `payloadFromForm`, never by hand-picking changed fields. */
export interface TenantPreferencesPayload {
  preferredCities?: string[]
  preferredBedrooms?: number
  preferredPropertyTypes?: string[]
  minBudget?: number
  maxBudget?: number
  petFriendly?: boolean
  moveInDate?: string
  preferredAmenities?: string[]
  petDetails?: string
  preferredContact?: string
}

// ============================================================================
// API calls
// ============================================================================

export async function getTenantPreferences(): Promise<TenantPreferences | null> {
  try {
    const data = await apiClient.get<TenantPreferences | null>('/users/me/preferences')
    return data ?? null
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function updateTenantPreferences(
  payload: TenantPreferencesPayload,
): Promise<TenantPreferences> {
  return apiClient.patch<TenantPreferences>('/users/me/preferences', payload)
}

// ============================================================================
// Pure mapping helpers (unit-tested)
// ============================================================================

/** Fallback view built from the legacy wizard JSON snapshot
 *  (`user.tenantOnboardingData`) for profiles without a table row yet.
 *  Field mapping mirrors the backend consolidation: preferredZones →
 *  preferredCities, budgetMin/Max → min/maxBudget, hasPets → petFriendly. */
export function preferencesFromSnapshot(
  snapshot: TenantOnboardingData | null | undefined,
): TenantPreferences {
  return {
    preferredCities: snapshot?.preferredZones ?? [],
    preferredBedrooms: null,
    preferredPropertyTypes: [],
    minBudget: snapshot?.budgetMin ?? null,
    maxBudget: snapshot?.budgetMax ?? null,
    petFriendly: snapshot?.hasPets ?? false,
    moveInDate: snapshot?.moveInDate || null,
    preferredAmenities: snapshot?.preferredAmenities ?? [],
    petDetails: snapshot?.petDetails || null,
    preferredContact: snapshot?.preferredContact ?? null,
  }
}

/** Per-field coalesce for wizard seeding: a NON-EMPTY table value wins; empty
 *  or absent values fall back to the snapshot. The table is authoritative and
 *  fresher (perfil edits land there; the JSON snapshot goes stale). */
export function mergeTablePreferencesOverSnapshot(
  table: TenantPreferences | null,
  snapshot: TenantOnboardingData | null | undefined,
): TenantPreferences {
  const fallback = preferencesFromSnapshot(snapshot)
  if (!table) return fallback
  return {
    preferredCities: table.preferredCities?.length
      ? table.preferredCities
      : fallback.preferredCities,
    preferredBedrooms: table.preferredBedrooms ?? fallback.preferredBedrooms,
    preferredPropertyTypes: table.preferredPropertyTypes?.length
      ? table.preferredPropertyTypes
      : fallback.preferredPropertyTypes,
    minBudget: table.minBudget ?? fallback.minBudget,
    maxBudget: table.maxBudget ?? fallback.maxBudget,
    petFriendly: table.petFriendly || fallback.petFriendly,
    moveInDate: table.moveInDate ? table.moveInDate.slice(0, 10) : fallback.moveInDate,
    preferredAmenities: table.preferredAmenities?.length
      ? table.preferredAmenities
      : fallback.preferredAmenities,
    petDetails: table.petDetails || fallback.petDetails,
    preferredContact: table.preferredContact || fallback.preferredContact,
  }
}

// ============================================================================
// Perfil form model
// ============================================================================

/** String-based form state for the perfil housing-preferences section. */
export interface PreferencesFormData {
  minBudget: string
  maxBudget: string
  /** Comma-separated in the input */
  preferredCities: string
  /** Comma-separated in the input */
  preferredAmenities: string
  /** yyyy-MM-dd for <input type="date"> */
  moveInDate: string
  petFriendly: boolean
  petDetails: string
  /** '' = not set */
  preferredContact: string
}

export function formFromPreferences(prefs: TenantPreferences | null): PreferencesFormData {
  return {
    minBudget: prefs?.minBudget != null ? String(prefs.minBudget) : '',
    maxBudget: prefs?.maxBudget != null ? String(prefs.maxBudget) : '',
    preferredCities: (prefs?.preferredCities ?? []).join(', '),
    preferredAmenities: (prefs?.preferredAmenities ?? []).join(', '),
    moveInDate: prefs?.moveInDate ? prefs.moveInDate.slice(0, 10) : '',
    petFriendly: prefs?.petFriendly ?? false,
    petDetails: prefs?.petDetails ?? '',
    preferredContact: prefs?.preferredContact ?? '',
  }
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseBudget(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
}

/**
 * Build the FULL-REPLACEMENT PATCH body from the form. Empty form fields are
 * OMITTED, which the backend interprets as a reset — that is the intended
 * "cleared" semantic. Fields the form does not edit (preferredBedrooms,
 * preferredPropertyTypes) round-trip their current stored values from
 * `current` so a save never wipes them.
 */
export function payloadFromForm(
  form: PreferencesFormData,
  current: TenantPreferences | null,
): TenantPreferencesPayload {
  const payload: TenantPreferencesPayload = {
    preferredCities: parseList(form.preferredCities),
    preferredAmenities: parseList(form.preferredAmenities),
    petFriendly: form.petFriendly,
  }
  const minBudget = parseBudget(form.minBudget)
  if (minBudget !== undefined) payload.minBudget = minBudget
  const maxBudget = parseBudget(form.maxBudget)
  if (maxBudget !== undefined) payload.maxBudget = maxBudget
  if (form.moveInDate) payload.moveInDate = form.moveInDate
  if (form.petFriendly && form.petDetails.trim()) payload.petDetails = form.petDetails.trim()
  if (form.preferredContact) payload.preferredContact = form.preferredContact
  // Round-trip fields this form does not edit — full replacement would wipe them.
  if (current?.preferredBedrooms != null) payload.preferredBedrooms = current.preferredBedrooms
  if (current?.preferredPropertyTypes?.length) {
    payload.preferredPropertyTypes = current.preferredPropertyTypes
  }
  return payload
}
