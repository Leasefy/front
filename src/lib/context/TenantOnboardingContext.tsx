'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react'
import type { TenantOnboardingData, PreferredContact, EmploymentType } from '@/lib/auth/types'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/use-auth'

// ============================================================================
// NOTA PARA BACKEND:
// ============================================================================
// Los pasos 1 (Info básica) y 2 (Verificación de ingresos) se llenan durante
// el proceso de postulación/aplicación a una propiedad.
//
// Si el usuario YA APLICÓ a alguna propiedad:
// - Ya tenemos su nombre, teléfono (paso 1)
// - Ya tenemos su situación laboral e ingresos (paso 2)
// - Solo faltaría: preferencias (paso 3)
//
// El backend debe:
// 1. Verificar qué datos ya tenemos del usuario (de aplicaciones previas)
// 2. Marcar automáticamente como completados los pasos que ya tenemos
// 3. Iniciar el onboarding en el primer paso que falte
//
// Flags necesarios del backend:
// - hasBasicInfo: boolean (nombre, teléfono)
// - hasIncomeVerification: boolean (empleo, ingresos)
// - hasPreferences: boolean (preferencias de vivienda)
//
// Lógica de pasos:
// - Paso 1: saltar si hasBasicInfo = true
// - Paso 2: saltar si hasIncomeVerification = true
// - Paso 3: saltar si hasPreferences = true
// - Si todos = true: no mostrar onboarding
//
// NOTA: Los documentos se piden durante el flujo de aplicación a una propiedad,
// no en el onboarding.
// ============================================================================

// ============================================================================
// TextTs
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
    key: 'employment',
    label: 'Ingresos',
    description: 'Tu situación laboral',
    icon: 'briefcase',
  },
  {
    id: 3,
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
  step3Valid?: boolean
}

export const initialTenantOnboardingDraft: TenantOnboardingDraft = {
  displayName: '',
  phone: '',
  preferredContact: 'whatsapp',
  employmentType: undefined,
  companyName: '',
  monthlyIncome: undefined,
  additionalIncome: 0,
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

// ============================================================================
// Context
// ============================================================================

const TenantOnboardingContext = createContext<TenantOnboardingContextTextT | null>(null)

// ============================================================================
// Provider
// ============================================================================

export function TenantOnboardingProvider({ children }: { children: ReactNode }) {
  const { refreshUser } = useAuth()
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
        // Funnel completedSteps to only valid steps
        if (parsed.completedSteps) {
          const validSteps = parsed.completedSteps.filter((s: number) => s <= totalSteps)
          setCompletedSteps(validSteps)
        }
      } catch (e) {
        console.error('Error loading tenant onboarding progress:', e)
      }
    }
    setIsHydrated(true)
  }, [totalSteps])

  // FloppyDisk progress to localStorage on changes
  useEffect(() => {
    if (!isHydrated) return

    const data = {
      draft,
      currentStep,
      completedSteps,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    // Dispatch custom event to notify sidebar and other components
    window.dispatchEvent(new Event('onboarding-updated'))
  }, [draft, currentStep, completedSteps, isHydrated])

  const updateDraft = useCallback((updates: Partial<TenantOnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }, [])

  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1: // Welcome - name required
          return !!draft.displayName && draft.displayName.trim().length > 0
        case 2: // Employment - type and income required
          return (
            !!draft.employmentType &&
            !!draft.monthlyIncome &&
            draft.monthlyIncome > 0
          )
        case 3: // Preferences - budget required
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
    setIsSubmitting(true)
    try {
      // Split displayName into first/last for backend
      const nameParts = (draft.displayName || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || firstName

      // Call backend onboarding endpoint
      await apiClient.post('/users/me/onboarding', {
        firstName,
        lastName,
        phone: draft.phone || undefined,
        userType: 'TENANT',
      })

      // Refresh user in auth context so role/onboardingCompleted updates
      await refreshUser()

      // Mark all steps as completed
      const allSteps = [1, 2, 3]
      setCompletedSteps(allSteps)

      // Save completion status to localStorage (dashboard sidebar checks this)
      const completionData = {
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
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [totalSteps, draft, refreshUser])

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
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps)
      } catch (e) {
        console.error('Error loading tenant onboarding progress:', e)
      }
    }
  }, [])

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
