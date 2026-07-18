'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'
import type { TenantOnboardingData, User } from '@/lib/auth/types'
import { apiClient } from '@/lib/api/client'
import {
  getTenantPreferences,
  mergeTablePreferencesOverSnapshot,
  type TenantPreferences,
} from '@/lib/api/tenant-preferences.service'
import { useAuth } from '@/lib/auth/use-auth'

// ============================================================================
// NOTA PARA BACKEND:
// ============================================================================
// El onboarding solo recolecta info básica y preferencias.
// Los datos de ingresos/empleo se recolectan durante la postulación a propiedades.
//
// Flags necesarios del backend:
// - hasBasicInfo: boolean (nombre, teléfono)
// - hasPreferences: boolean (preferencias de vivienda)
//
// Lógica de pasos:
// - Paso 1: saltar si hasBasicInfo = true
// - Paso 2: saltar si hasPreferences = true
// - Si ambos = true: no mostrar onboarding
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface TenantOnboardingStep {
  id: number
  key: string
  label: string
  description: string
  icon: string
}

export const TENANT_ONBOARDING_STEPS: TenantOnboardingStep[] = [
  {
    id: 1,
    key: 'welcome',
    label: 'Bienvenida',
    description: 'Cuéntanos sobre ti',
    icon: 'user',
  },
  {
    id: 2,
    key: 'preferences',
    label: 'Preferencias',
    description: 'Tu hogar ideal',
    icon: 'home',
  },
]

export interface TenantOnboardingDraft extends TenantOnboardingData {
  // Validation tracking
  step1Valid?: boolean
  step2Valid?: boolean
  /** Cédula de Ciudadanía (Colombia) */
  rut?: string
}

export const initialTenantOnboardingDraft: TenantOnboardingDraft = {
  displayName: '',
  phone: '',
  preferredContact: 'whatsapp',
  budgetMin: undefined,
  budgetMax: undefined,
  preferredZones: [],
  preferredAmenities: [],
  moveInDate: '',
  hasPets: false,
  petDetails: '',
}

interface TenantOnboardingContextTextT {
  // State
  draft: TenantOnboardingDraft
  currentStep: number
  totalSteps: number
  completedSteps: number[]
  isSubmitting: boolean
  isComplete: boolean

  // Actions
  updateDraft: (updates: Partial<TenantOnboardingDraft>) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  submitOnboarding: () => Promise<void>
  resetDraft: () => void
  loadSavedProgress: () => void

  // Validation
  isStepValid: (step: number) => boolean
  canProceed: boolean

  // Progress
  progressPercentage: number
}

const STORAGE_KEY = 'plan_onboarding_tenant'

/**
 * Seed empty draft fields from the backend profile.
 *
 * Product rule: the backend is the single source of truth — profile data must
 * be visible from any device; the local draft is only an in-progress buffer.
 * Merge rule: a non-empty locally typed value ALWAYS wins (the user may be
 * mid-wizard); empty/absent fields fill from the backend so the wizard never
 * opens blank or stale after the profile was edited elsewhere.
 *
 * Fields whose initial draft value is a real default (preferredContact
 * 'whatsapp', hasPets false) treat that default as "absent" so a backend
 * stored choice can surface — the trade-off (a mid-wizard explicit re-pick of
 * the default gets overridden by a differing backend value) is accepted.
 *
 * Preference source: the authoritative `tenant_preferences` table row
 * (`tablePrefs`, from GET /users/me/preferences) is preferred per-field over
 * the legacy `user.tenantOnboardingData` JSON snapshot — perfil edits land in
 * the table, so the snapshot can be stale. The snapshot remains the fallback
 * for profiles without a row.
 *
 * Only trusts real backend profiles (`profileSource === 'backend'`); returns
 * the SAME draft reference when nothing fills, so effects can no-op cheaply.
 */
export function seedTenantDraftFromBackend(
  draft: TenantOnboardingDraft,
  user: User | null | undefined,
  tablePrefs?: TenantPreferences | null,
): TenantOnboardingDraft {
  if (!user || user.profileSource !== 'backend') return draft
  const merged = mergeTablePreferencesOverSnapshot(
    tablePrefs ?? null,
    user.tenantOnboardingData,
  )
  const next = { ...draft }
  let changed = false

  const fillString = (
    key: 'displayName' | 'phone' | 'rut' | 'moveInDate' | 'petDetails',
    value: string | undefined,
  ) => {
    if (value && !(next[key] || '').trim()) {
      next[key] = value
      changed = true
    }
  }

  // Canonical name split duplicates a single-word name into lastName — don't
  // rebuild "Ana Ana" for those profiles.
  const backendName =
    user.lastName && user.lastName !== user.firstName
      ? `${user.firstName ?? ''} ${user.lastName}`.trim()
      : (user.firstName ?? '').trim()
  fillString('displayName', backendName || undefined)
  fillString('phone', user.phone)
  fillString('rut', user.rut)
  fillString('moveInDate', merged.moveInDate ?? undefined)
  fillString('petDetails', merged.petDetails ?? undefined)

  if (next.budgetMin == null && merged.minBudget != null) {
    next.budgetMin = merged.minBudget
    changed = true
  }
  if (next.budgetMax == null && merged.maxBudget != null) {
    next.budgetMax = merged.maxBudget
    changed = true
  }
  if ((next.preferredZones?.length ?? 0) === 0 && merged.preferredCities.length) {
    next.preferredZones = merged.preferredCities
    changed = true
  }
  if ((next.preferredAmenities?.length ?? 0) === 0 && merged.preferredAmenities.length) {
    next.preferredAmenities = merged.preferredAmenities
    changed = true
  }
  if (!next.hasPets && merged.petFriendly) {
    next.hasPets = true
    changed = true
  }
  if (
    merged.preferredContact &&
    merged.preferredContact !== next.preferredContact &&
    (!next.preferredContact ||
      next.preferredContact === initialTenantOnboardingDraft.preferredContact)
  ) {
    next.preferredContact = merged.preferredContact as TenantOnboardingDraft['preferredContact']
    changed = true
  }

  return changed ? next : draft
}

// ============================================================================
// Context
// ============================================================================

const TenantOnboardingContext = createContext<TenantOnboardingContextTextT | null>(null)

// ============================================================================
// Provider
// ============================================================================

export function TenantOnboardingProvider({ children }: { children: ReactNode }) {
  const { refreshUser, user } = useAuth()
  const userId = user?.id
  const [draft, setDraft] = useState<TenantOnboardingDraft>(initialTenantOnboardingDraft)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const totalSteps = TENANT_ONBOARDING_STEPS.length

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.draft) setDraft(parsed.draft)
        // Cap currentStep to totalSteps (in case user had step 4 saved from before)
        if (parsed.currentStep) setCurrentStep(Math.min(parsed.currentStep, totalSteps))
        // Funnel completedSteps to only valid steps + migrate old 3-step data
        if (parsed.completedSteps) {
          const rawSteps: number[] = parsed.completedSteps
          const validSteps = rawSteps.filter((s: number) => s <= totalSteps)
          // Migrate: old step 3 (employment) was removed; count it as step 2
          if (rawSteps.includes(3) && !validSteps.includes(2)) {
            validSteps.push(2)
          }
          setCompletedSteps(validSteps)
        }
      } catch (e) {
        console.error('Error loading tenant onboarding progress:', e)
      }
    }
    setIsHydrated(true)
  }, [totalSteps])

  // PII scoping: a saved payload stamped with a DIFFERENT user's id is another
  // account's draft on a shared browser — discard it (state + storage) as soon
  // as the authenticated user is known. Unstamped payloads are anonymous
  // pre-auth drafts (the wizard runs before the backend user record exists)
  // and stay usable; the save effect below stamps them with the current user.
  useEffect(() => {
    if (!userId || !isHydrated) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { userId?: string }
      if (parsed?.userId && parsed.userId !== userId) {
        setDraft(initialTenantOnboardingDraft)
        setCurrentStep(1)
        setCompletedSteps([])
        setIsComplete(false)
        localStorage.removeItem(STORAGE_KEY)
        window.dispatchEvent(new Event('onboarding-updated'))
      }
    } catch {
      // Corrupt cache — the save effect below rewrites it.
    }
  }, [userId, isHydrated])

  // Authoritative preferences row (tenant_preferences) for seeding.
  // undefined = fetch not settled yet; null = no row / fetch failed
  // (snapshot fallback applies).
  const [tablePrefs, setTablePrefs] = useState<TenantPreferences | null | undefined>(undefined)
  useEffect(() => {
    if (user?.profileSource !== 'backend') return
    let cancelled = false
    getTenantPreferences()
      .then((row) => {
        if (!cancelled) setTablePrefs(row)
      })
      .catch(() => {
        if (!cancelled) setTablePrefs(null)
      })
    return () => {
      cancelled = true
    }
  }, [user?.profileSource])

  // Backend-first prefill: fill EMPTY draft fields from the authenticated
  // backend profile so the wizard opens with current data on any device.
  // Waits for the tenant_preferences fetch to settle so the authoritative
  // table wins over the (possibly stale) onboardingData snapshot — seeding
  // the snapshot first would occupy the fields and block the fresh values.
  // Declared after the foreign-draft purge above so its functional update
  // applies to the purged draft; locally typed values always win (see
  // seedTenantDraftFromBackend).
  useEffect(() => {
    if (!isHydrated || user?.profileSource !== 'backend') return
    if (tablePrefs === undefined) return
    setDraft((prev) => seedTenantDraftFromBackend(prev, user, tablePrefs))
  }, [isHydrated, user, tablePrefs])

  // FloppyDisk progress to localStorage on changes
  useEffect(() => {
    if (!isHydrated) return

    const data = {
      // Stamp ownership whenever an authenticated user is known so other
      // accounts on this browser treat the payload as absent.
      userId,
      draft,
      currentStep,
      completedSteps,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    // Dispatch custom event to notify sidebar and other components
    window.dispatchEvent(new Event('onboarding-updated'))
  }, [draft, currentStep, completedSteps, isHydrated, userId])

  const updateDraft = useCallback((updates: Partial<TenantOnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }, [])

  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1: // Welcome - name required
          return !!draft.displayName && draft.displayName.trim().length > 0
        case 2: // Preferences - budget required
          return (
            !!draft.budgetMin &&
            draft.budgetMin > 0 &&
            !!draft.budgetMax &&
            draft.budgetMax >= draft.budgetMin
          )
        default:
          return false
      }
    },
    [draft]
  )

  const canProceed = useMemo(() => isStepValid(currentStep), [isStepValid, currentStep])

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep])
      }
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, totalSteps, isStepValid, completedSteps])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        // Allow going to completed steps, current step, or next step if current is valid
        if (step <= currentStep || completedSteps.includes(step - 1) || step === 1) {
          setCurrentStep(step)
        }
      }
    },
    [currentStep, totalSteps, completedSteps]
  )

  const submitOnboarding = useCallback(async () => {
    // Defense for restored/corrupt drafts: the back rejects empty names with
    // a 400 (@IsNotEmpty) — never fire a doomed POST. Route back to the name
    // step instead (mirrors 'needs-name' in use-onboarding-provisioning).
    const trimmedName = (draft.displayName || '').trim()
    if (!trimmedName) {
      toast.error('Cuéntanos tu nombre para completar tu perfil.')
      setCurrentStep(1)
      return
    }

    setIsSubmitting(true)
    try {
      // Split displayName into first/last for backend (canonical convention:
      // first word → firstName, rest → lastName, falls back to firstName)
      const nameParts = trimmedName.split(/\s+/)
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || firstName

      // Call backend onboarding endpoint. Housing preferences are persisted
      // too (backend stores them as onboardingData JSON and returns them on
      // GET /users/me) so onboarding completeness is derivable from the
      // backend on any device — localStorage is only a draft cache.
      await apiClient.post('/users/me/onboarding', {
        firstName,
        lastName,
        phone: draft.phone || undefined,
        // Document number: the backend only writes it when the user has none
        // (immutable once set — changes go through Leasefy support).
        rut: draft.rut || undefined,
        userType: 'TENANT',
        preferredContact: draft.preferredContact,
        budgetMin: draft.budgetMin,
        budgetMax: draft.budgetMax,
        preferredZones: draft.preferredZones,
        preferredAmenities: draft.preferredAmenities,
        moveInDate: draft.moveInDate || undefined,
        hasPets: draft.hasPets ?? false,
        petDetails: draft.petDetails || undefined,
      })

      // Refresh user in auth context so role/onboardingCompleted updates
      await refreshUser()

      // Mark all steps as completed
      const allSteps = [1, 2]
      setCompletedSteps(allSteps)

      // Save completion status to localStorage (dashboard sidebar checks this)
      const completionData = {
        userId,
        draft,
        currentStep: totalSteps,
        completedSteps: allSteps,
        isComplete: true,
        completedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completionData))
      // Dispatch custom event to notify sidebar and other components
      window.dispatchEvent(new Event('onboarding-updated'))

      setIsComplete(true)
    } catch (error) {
      console.error('Error submitting tenant onboarding:', error)
      // Surface the failure (was console-only): the user stays on the step
      // with the draft intact and can retry.
      toast.error('No pudimos guardar tu perfil. Revisa tu conexión e intenta de nuevo.')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [totalSteps, draft, refreshUser, userId])

  const resetDraft = useCallback(() => {
    setDraft(initialTenantOnboardingDraft)
    setCurrentStep(1)
    setCompletedSteps([])
    setIsComplete(false)
    localStorage.removeItem(STORAGE_KEY)
    // Dispatch custom event to notify sidebar and other components
    window.dispatchEvent(new Event('onboarding-updated'))
  }, [])

  const loadSavedProgress = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.draft) setDraft(parsed.draft)
        if (parsed.currentStep) setCurrentStep(Math.min(parsed.currentStep, totalSteps))
        if (parsed.completedSteps) {
          const validSteps = parsed.completedSteps.filter((s: number) => s <= totalSteps)
          setCompletedSteps(validSteps)
        }
      } catch (e) {
        console.error('Error loading tenant onboarding progress:', e)
      }
    }
  }, [totalSteps])

  const progressPercentage = useMemo(() => {
    return Math.round((completedSteps.length / totalSteps) * 100)
  }, [completedSteps.length, totalSteps])

  const value: TenantOnboardingContextTextT = {
    draft,
    currentStep,
    totalSteps,
    completedSteps,
    isSubmitting,
    isComplete,
    updateDraft,
    nextStep,
    prevStep,
    goToStep,
    submitOnboarding,
    resetDraft,
    loadSavedProgress,
    isStepValid,
    canProceed,
    progressPercentage,
  }

  // Don't render children until hydrated to avoid mismatch
  if (!isHydrated) {
    return null
  }

  return <TenantOnboardingContext.Provider value={value}>{children}</TenantOnboardingContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export function useTenantOnboarding() {
  const context = useContext(TenantOnboardingContext)
  if (!context) {
    throw new Error('useTenantOnboarding must be used within a TenantOnboardingProvider')
  }
  return context
}
