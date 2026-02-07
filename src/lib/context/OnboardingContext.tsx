'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react'
import type { OnboardingData, PaymentMethod, RiskLevel, PreferredContact } from '@/lib/auth/types'

// ============================================================================
// TextTs
// ============================================================================

export interface OnboardingStep {
  id: number
  key: string
  label: string
  description: string
  icon: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    key: 'welcome',
    label: 'Bienvenida',
    description: 'Cuéntanos sobre ti',
    icon: 'user',
  },
  {
    id: 2,
    key: 'property',
    label: 'Tu propiedad',
    description: 'Tu primera propiedad',
    icon: 'home',
  },
  {
    id: 3,
    key: 'tenant',
    label: 'Inquilino ideal',
    description: 'Tus preferencias',
    icon: 'users',
  },
  {
    id: 4,
    key: 'payments',
    label: 'Cobros',
    description: 'Configura tus pagos',
    icon: 'credit-card',
  },
]

export interface OnboardingDraft extends OnboardingData {
  // Validation tracking
  step1Valid?: boolean
  step2Valid?: boolean
  step3Valid?: boolean
  step4Valid?: boolean
}

export const initialOnboardingDraft: OnboardingDraft = {
  displayName: '',
  phone: '',
  preferredContact: 'whatsapp',
  propertyType: undefined,
  propertyAddress: '',
  propertyCity: '',
  rentPrice: undefined,
  minIncomeRatio: 3,
  acceptPets: false,
  minRiskLevel: 'B',
  bankAccount: '',
  bankName: '',
  acceptedPaymentMethods: ['bank_transfer'],
  preferredPaymentDay: 1,
}

interface OnboardingContextTextT {
  // State
  draft: OnboardingDraft
  currentStep: number
  totalSteps: number
  completedSteps: number[]
  isSubmitting: boolean
  isComplete: boolean

  // Actions
  updateDraft: (updates: Partial<OnboardingDraft>) => void
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

const STORAGE_KEY = 'plan_onboarding_landlord'

// ============================================================================
// Context
// ============================================================================

const OnboardingContext = createContext<OnboardingContextTextT | null>(null)

// ============================================================================
// Provider
// ============================================================================

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialOnboardingDraft)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const totalSteps = ONBOARDING_STEPS.length

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.draft) setDraft(parsed.draft)
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps)
      } catch (e) {
        console.error('Error loading onboarding progress:', e)
      }
    }
    setIsHydrated(true)
  }, [])

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

  const updateDraft = useCallback((updates: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }, [])

  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1: // Welcome - name required
          return !!draft.displayName && draft.displayName.trim().length > 0
        case 2: // Property - type and city required
          return (
            !!draft.propertyType &&
            !!draft.propertyCity &&
            draft.propertyCity.trim().length > 0 &&
            !!draft.rentPrice &&
            draft.rentPrice > 0
          )
        case 3: // Ideal Tenant - all optional with defaults
          return true
        case 4: // Payments - bank info optional initially
          return true
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
      // Simulate API call to save onboarding data
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mark all steps as completed
      const allSteps = [1, 2, 3, 4]
      setCompletedSteps(allSteps)

      // FloppyDisk completion status to localStorage (dashboard checks this)
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
      console.error('Error submitting onboarding:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [completedSteps, totalSteps, draft])

  const resetDraft = useCallback(() => {
    setDraft(initialOnboardingDraft)
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
        console.error('Error loading onboarding progress:', e)
      }
    }
  }, [])

  const progressPercentage = useMemo(() => {
    return Math.round((completedSteps.length / totalSteps) * 100)
  }, [completedSteps.length, totalSteps])

  const value: OnboardingContextTextT = {
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

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
