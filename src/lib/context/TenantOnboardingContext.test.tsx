/**
 * TenantOnboardingContext — submit guards (mirrors commit f067a97a for the
 * inmobiliaria wizard).
 *
 * The back rejects empty firstName/lastName with a 400 (@IsNotEmpty), so:
 *  - step 1 must require a trimmed non-empty displayName,
 *  - the name split follows the canonical convention (first word → firstName,
 *    rest → lastName, lastName falls back to firstName),
 *  - a restored draft that reaches submit with a blank name must NOT fire the
 *    POST — it routes back to the name step with a Spanish message,
 *  - a rejected submit must surface a toast (was console.error only) and keep
 *    the entered data so the user can retry.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { postMock, toastErrorMock, getPrefsMock, refreshUserMock, authState } = vi.hoisted(() => ({
  postMock: vi.fn(),
  toastErrorMock: vi.fn(),
  getPrefsMock: vi.fn(),
  refreshUserMock: vi.fn(),
  // Settable per-test so identity-scoping (userId stamping/purging) and
  // backend-first draft seeding can be exercised.
  authState: { user: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
}))

// The provider fetches the authoritative tenant_preferences row for seeding.
// Default: no row (null) → snapshot fallback; per-test rows exercise the
// table-over-snapshot preference.
vi.mock('@/lib/api/tenant-preferences.service', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/lib/api/tenant-preferences.service')
  >()
  return {
    ...actual,
    getTenantPreferences: (...args: unknown[]) => getPrefsMock(...args),
  }
})

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    refreshUser: (...args: unknown[]) => refreshUserMock(...args),
    user: authState.user,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: toastErrorMock, info: vi.fn() },
}))

import {
  TenantOnboardingProvider,
  useTenantOnboarding,
  seedTenantDraftFromBackend,
  initialTenantOnboardingDraft,
} from './TenantOnboardingContext'
import type { User } from '@/lib/auth/types'

type ContextValue = ReturnType<typeof useTenantOnboarding>

const STORAGE_KEY = 'plan_onboarding_tenant'

let container: HTMLDivElement
let root: Root
let captured: ContextValue | null = null

function Probe() {
  captured = useTenantOnboarding()
  return null
}

async function renderProvider() {
  await act(async () => {
    root.render(
      <TenantOnboardingProvider>
        <Probe />
      </TenantOnboardingProvider>,
    )
  })
}

beforeEach(() => {
  localStorage.clear()
  captured = null
  authState.user = undefined
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  postMock.mockReset()
  toastErrorMock.mockReset()
  getPrefsMock.mockReset()
  getPrefsMock.mockResolvedValue(null)
  refreshUserMock.mockReset()
  refreshUserMock.mockResolvedValue(undefined)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('TenantOnboardingContext — step 1 name gate', () => {
  it('step 1 is invalid until a trimmed non-empty displayName exists', async () => {
    await renderProvider()

    expect(captured!.isStepValid(1)).toBe(false)

    await act(async () => {
      captured!.updateDraft({ displayName: '   ' })
    })
    expect(captured!.isStepValid(1)).toBe(false)

    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana María' })
    })
    expect(captured!.isStepValid(1)).toBe(true)
  })
})

describe('TenantOnboardingContext — name splitting on submit', () => {
  it('splits first word → firstName, rest → lastName', async () => {
    postMock.mockResolvedValue({})
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({ displayName: '  Ana María  Pérez Gómez ' })
    })
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/users/me/onboarding', {
      firstName: 'Ana',
      lastName: 'María Pérez Gómez',
      phone: undefined,
      rut: undefined,
      userType: 'TENANT',
      // Housing preferences ride along so the backend becomes the source of
      // truth for onboarding completeness (initial draft values here).
      preferredContact: 'whatsapp',
      budgetMin: undefined,
      budgetMax: undefined,
      preferredZones: [],
      preferredAmenities: [],
      moveInDate: undefined,
      hasPets: false,
      petDetails: undefined,
    })
  })

  it('persists the housing preferences from the draft to the backend', async () => {
    postMock.mockResolvedValue({})
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({
        displayName: 'Ana Pérez',
        budgetMin: 800000,
        budgetMax: 1500000,
        preferredZones: ['Chapinero'],
        preferredAmenities: ['parking'],
        moveInDate: '2026-08-01',
        hasPets: true,
        petDetails: 'Un gato',
      })
    })
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledWith(
      '/users/me/onboarding',
      expect.objectContaining({
        budgetMin: 800000,
        budgetMax: 1500000,
        preferredZones: ['Chapinero'],
        preferredAmenities: ['parking'],
        moveInDate: '2026-08-01',
        hasPets: true,
        petDetails: 'Un gato',
      }),
    )
  })

  it('falls back lastName to firstName for a single-word name', async () => {
    postMock.mockResolvedValue({})
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana' })
    })
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledWith(
      '/users/me/onboarding',
      expect.objectContaining({ firstName: 'Ana', lastName: 'Ana' }),
    )
  })
})

const backendUser = {
  id: 'me',
  profileSource: 'backend',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '3001234567',
  rut: '1090525663',
  onboardingCompleted: true,
  tenantOnboardingData: {
    preferredContact: 'email',
    budgetMin: 800000,
    budgetMax: 1500000,
    preferredZones: ['Chapinero'],
    preferredAmenities: ['parking'],
    moveInDate: '2026-08-01',
    hasPets: true,
    petDetails: 'Un gato',
  },
}

describe('TenantOnboardingContext — backend-first draft seeding', () => {
  it('prefers the authoritative tenant_preferences row over the stale snapshot', async () => {
    // Perfil edits land in the table; the onboardingData snapshot is stale.
    getPrefsMock.mockResolvedValue({
      preferredCities: ['Usaquén'],
      preferredBedrooms: 2,
      preferredPropertyTypes: ['APARTMENT'],
      minBudget: 900000,
      maxBudget: 2000000,
      petFriendly: false,
      moveInDate: '2026-10-15T00:00:00.000Z',
      preferredAmenities: ['gimnasio'],
      petDetails: null,
      preferredContact: 'phone',
    })
    authState.user = backendUser
    await renderProvider()

    expect(captured!.draft.budgetMin).toBe(900000)
    expect(captured!.draft.budgetMax).toBe(2000000)
    expect(captured!.draft.preferredZones).toEqual(['Usaquén'])
    expect(captured!.draft.preferredAmenities).toEqual(['gimnasio'])
    expect(captured!.draft.moveInDate).toBe('2026-10-15')
    expect(captured!.draft.preferredContact).toBe('phone')
    // Empty table fields still fall back to the snapshot (petDetails).
    expect(captured!.draft.petDetails).toBe('Un gato')
    // Identity fields keep coming from the user profile.
    expect(captured!.draft.displayName).toBe('Ana Pérez')
    expect(captured!.draft.rut).toBe('1090525663')
  })

  it('seeds an empty draft from the snapshot when no table row exists (null fallback)', async () => {
    authState.user = backendUser
    await renderProvider()

    expect(captured!.draft.displayName).toBe('Ana Pérez')
    expect(captured!.draft.phone).toBe('3001234567')
    expect(captured!.draft.rut).toBe('1090525663')
    expect(captured!.draft.budgetMin).toBe(800000)
    expect(captured!.draft.budgetMax).toBe(1500000)
    expect(captured!.draft.preferredZones).toEqual(['Chapinero'])
    expect(captured!.draft.preferredAmenities).toEqual(['parking'])
    expect(captured!.draft.moveInDate).toBe('2026-08-01')
    expect(captured!.draft.hasPets).toBe(true)
    expect(captured!.draft.petDetails).toBe('Un gato')
    expect(captured!.draft.preferredContact).toBe('email')
  })

  it('a locally typed value wins over the backend; empty fields still fill', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: 'me',
        draft: { displayName: 'Nombre Local', budgetMin: 999 },
        currentStep: 1,
        completedSteps: [],
      }),
    )
    authState.user = backendUser
    await renderProvider()

    // Mid-wizard typed values survive…
    expect(captured!.draft.displayName).toBe('Nombre Local')
    expect(captured!.draft.budgetMin).toBe(999)
    // …empty fields fill from the backend.
    expect(captured!.draft.phone).toBe('3001234567')
    expect(captured!.draft.rut).toBe('1090525663')
    expect(captured!.draft.budgetMax).toBe(1500000)
  })

  it('includes the seeded rut in the onboarding POST payload', async () => {
    postMock.mockResolvedValue({})
    authState.user = backendUser
    await renderProvider()
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledWith(
      '/users/me/onboarding',
      expect.objectContaining({ rut: '1090525663' }),
    )
  })
})

describe('seedTenantDraftFromBackend (pure merge rule)', () => {
  it('never seeds from a degraded session profile', () => {
    const draft = { ...initialTenantOnboardingDraft }
    const result = seedTenantDraftFromBackend(draft, {
      ...backendUser,
      profileSource: 'session',
    } as unknown as User)
    expect(result).toBe(draft)
  })

  it('returns the same reference when nothing fills (cheap no-op for effects)', () => {
    const draft = seedTenantDraftFromBackend(
      { ...initialTenantOnboardingDraft },
      backendUser as unknown as User,
    )
    // Second pass: everything already filled → identity no-op.
    expect(seedTenantDraftFromBackend(draft, backendUser as unknown as User)).toBe(draft)
  })

  it('does not rebuild a duplicated single-word name ("Ana Ana")', () => {
    const result = seedTenantDraftFromBackend(
      { ...initialTenantOnboardingDraft },
      { ...backendUser, firstName: 'Ana', lastName: 'Ana' } as unknown as User,
    )
    expect(result.displayName).toBe('Ana')
  })
})

describe('TenantOnboardingContext — cache identity scoping (cross-user PII guard)', () => {
  it("purges another user's cached draft instead of loading it", async () => {
    // A previous account on this shared browser left its draft behind.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: 'other-user',
        draft: { displayName: 'Otro Usuario', phone: '3999999999', budgetMin: 1 },
        currentStep: 2,
        completedSteps: [1],
      }),
    )
    authState.user = { id: 'me' }
    await renderProvider()

    // The foreign draft never becomes this user's state…
    expect(captured!.draft.displayName).toBe('')
    expect(captured!.draft.phone).toBe('')
    expect(captured!.currentStep).toBe(1)
    expect(captured!.completedSteps).toEqual([])
    // …and the stored payload is re-owned with no foreign PII left.
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      expect(stored).not.toContain('Otro Usuario')
      expect(stored).not.toContain('3999999999')
      expect(JSON.parse(stored).userId).toBe('me')
    }
  })

  it('stamps saved progress with the authenticated user id and keeps anonymous drafts unstamped', async () => {
    authState.user = { id: 'me' }
    await renderProvider()
    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana' })
    })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).userId).toBe('me')
  })

  it('keeps an anonymous (pre-auth) draft loadable when no user is known', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft: { displayName: 'Ana', phone: '3001234567' },
        currentStep: 2,
        completedSteps: [1],
      }),
    )
    await renderProvider()

    expect(captured!.draft.displayName).toBe('Ana')
    expect(captured!.currentStep).toBe(2)
    expect(captured!.completedSteps).toEqual([1])
  })
})

describe('TenantOnboardingContext — blank-name defense (restored draft)', () => {
  it('does not POST, routes back to step 1, and surfaces a Spanish message', async () => {
    // A restored draft can reach the final step with a blank name.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft: { displayName: '   ', phone: '3001234567' },
        currentStep: 2,
        completedSteps: [1],
      }),
    )
    await renderProvider()
    expect(captured!.currentStep).toBe(2)

    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).not.toHaveBeenCalled()
    expect(captured!.currentStep).toBe(1)
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(String(toastErrorMock.mock.calls[0][0])).toMatch(/nombre/i)
    expect(captured!.isComplete).toBe(false)
    expect(captured!.isSubmitting).toBe(false)
  })
})

describe('TenantOnboardingContext — split error handling (POST vs refreshUser)', () => {
  const SAVE_ERROR = 'No pudimos guardar tu perfil. Revisa tu conexión e intenta de nuevo.'
  const REFRESH_ERROR =
    'Tu perfil se guardó correctamente, pero no pudimos actualizar tu sesión. Intenta de nuevo.'

  it('(a) POST failure → save-error toast, no completion cache, no isComplete', async () => {
    postMock.mockRejectedValue(new Error('500'))
    await renderProvider()
    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana Pérez' })
    })
    await act(async () => {
      await expect(captured!.submitOnboarding()).rejects.toThrow()
    })

    expect(refreshUserMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(String(toastErrorMock.mock.calls[0][0])).toBe(SAVE_ERROR)
    expect(captured!.isComplete).toBe(false)
    // No completion cache write — only the in-progress draft payload exists.
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(cache.isComplete).not.toBe(true)
    expect(cache.completedSteps ?? []).not.toContain(2)
  })

  it('(b) POST ok + refreshUser fails twice → accurate "se guardó" toast, rejection, no completion state', async () => {
    postMock.mockResolvedValue({})
    refreshUserMock.mockRejectedValue(new Error('network'))
    await renderProvider()
    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana Pérez' })
    })
    await act(async () => {
      await expect(captured!.submitOnboarding()).rejects.toThrow()
    })

    // POST once, refresh attempted twice (one retry).
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(refreshUserMock).toHaveBeenCalledTimes(2)
    // The ACCURATE message — never the save-error one (the profile WAS saved).
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(String(toastErrorMock.mock.calls[0][0])).toBe(REFRESH_ERROR)
    // No completion state: the shell must not navigate (stale auth user would
    // bounce off ProtectedRoute's onboarding gate) and the button stays usable.
    expect(captured!.isComplete).toBe(false)
    expect(captured!.isSubmitting).toBe(false)
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(cache.isComplete).not.toBe(true)
  })

  it('(c) POST ok + refreshUser fails once then succeeds on retry → full success, single POST', async () => {
    postMock.mockResolvedValue({})
    refreshUserMock
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValueOnce(undefined)
    await renderProvider()
    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana Pérez' })
    })
    await act(async () => {
      await captured!.submitOnboarding()
    })

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(refreshUserMock).toHaveBeenCalledTimes(2)
    expect(toastErrorMock).not.toHaveBeenCalled()
    // Full success path (the shell's post-resolve push fires on this).
    expect(captured!.isComplete).toBe(true)
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(cache.isComplete).toBe(true)
    expect(cache.completedSteps).toEqual([1, 2])
  })
})

describe('TenantOnboardingContext — rejected submit', () => {
  it('shows a toast, keeps the entered data, and allows a retry', async () => {
    postMock.mockRejectedValueOnce(new Error('400 Bad Request'))
    await renderProvider()

    await act(async () => {
      captured!.updateDraft({ displayName: 'Ana Pérez' })
    })
    await act(async () => {
      await expect(captured!.submitOnboarding()).rejects.toThrow()
    })

    expect(toastErrorMock).toHaveBeenCalledTimes(1)
    expect(captured!.isComplete).toBe(false)
    expect(captured!.isSubmitting).toBe(false)
    // Entered data stays intact for the retry.
    expect(captured!.draft.displayName).toBe('Ana Pérez')

    // Retry succeeds with the same data.
    postMock.mockResolvedValueOnce({})
    await act(async () => {
      await captured!.submitOnboarding()
    })
    expect(postMock).toHaveBeenLastCalledWith(
      '/users/me/onboarding',
      expect.objectContaining({ firstName: 'Ana', lastName: 'Pérez' }),
    )
    expect(captured!.isComplete).toBe(true)
  })
})
