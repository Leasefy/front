'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  type AvaluoFormData,
  createEmptyAvaluoFormData,
} from '@/lib/types/avaluo'
import { submitIntake, uploadPhoto, persistCapToken } from '@/lib/api/avaluo.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

interface AvaluoContextValue {
  // Form data
  formData: AvaluoFormData
  updateFormData: (partial: Partial<AvaluoFormData>) => void

  // Navigation
  currentStep: number
  totalSteps: number
  nextStep: () => void
  prevStep: () => void
  goToStep: (n: number) => void

  // Validation
  isStepValid: (step: number) => boolean
  canProceed: boolean
  completedSteps: number[]

  // Submission
  isSubmitting: boolean
  submitError: string | null
  submitAvaluo: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AvaluoContext = createContext<AvaluoContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

interface AvaluoProviderProps {
  children: ReactNode
  initialEmail?: string
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export function AvaluoProvider({ children, initialEmail }: AvaluoProviderProps) {
  const router = useRouter()

  const [formData, setFormData] = useState<AvaluoFormData>(() =>
    createEmptyAvaluoFormData(initialEmail)
  )
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ──────────────────────────────────────────────────────────────────────────
  // Form data updater — shallow merge
  // ──────────────────────────────────────────────────────────────────────────

  const updateFormData = useCallback((partial: Partial<AvaluoFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }))
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation — clamped to 1..TOTAL_STEPS
  // ──────────────────────────────────────────────────────────────────────────

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }, [])

  const goToStep = useCallback((n: number) => {
    setCurrentStep(Math.max(1, Math.min(n, TOTAL_STEPS)))
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Validation
  // ──────────────────────────────────────────────────────────────────────────

  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1:
          return (
            !!formData.address &&
            !!formData.city &&
            !!formData.propertyType &&
            formData.areaM2 !== '' &&
            Number(formData.areaM2) > 0
          )
        case 2:
          return (
            EMAIL_RE.test(formData.identity) && formData.purposeAvaluo === true
          )
        case 3:
          // Photos are optional — always valid
          return true
        case 4:
          // Confirmation — always valid (user reviews before submitting)
          return true
        default:
          return false
      }
    },
    [formData]
  )

  const canProceed = useMemo(
    () => isStepValid(currentStep),
    [isStepValid, currentStep]
  )

  const completedSteps = useMemo(() => {
    const completed: number[] = []
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (isStepValid(i)) completed.push(i)
    }
    return completed
  }, [isStepValid])

  // ──────────────────────────────────────────────────────────────────────────
  // Submission — intake first, photos after
  //
  // Order:
  //   1. POST /intake (photoKeys: []) → {id, token, paymentUrl, paymentProvider}
  //   2. Persist token to localStorage (avaluo:cap:<id>)
  //   3. Upload each staged File via uploadPhoto (presign → PUT → attach)
  //   4. Navigate — payment happens AT INTAKE: if paymentProvider is 'wompi'
  //      and paymentUrl is present, redirect the tab to the Wompi hosted
  //      checkout. Otherwise (stub / null), go straight to the estado page.
  //
  // If the micro is down, submitIntake throws AvaluoApiError → caught below.
  // Photo upload errors are non-fatal: we navigate anyway (photos optional).
  // ──────────────────────────────────────────────────────────────────────────

  const submitAvaluo = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { id, token, paymentUrl, paymentProvider } = await submitIntake(formData)

      // Persist capability token — cannot be recovered later
      persistCapToken(id, token)

      // Upload staged photos (optional — failures are non-fatal)
      const pendingFiles = formData.pendingPhotoFiles ?? []
      if (pendingFiles.length > 0) {
        await Promise.allSettled(
          pendingFiles.map((file) => uploadPhoto(file, id, token))
        )
        // Partial failures are silently accepted — the avalúo proceeds without
        // those photos. A toast could be added here if visibility is needed.
      }

      if (paymentProvider === 'wompi' && paymentUrl) {
        // Pay-at-intake: redirect the whole tab to the Wompi hosted checkout.
        // The cap token is already persisted, so returning to
        // /avaluo/estado/<id> after payment still works.
        window.location.href = paymentUrl
      } else {
        router.push(`/avaluo/estado/${id}`)
      }
    } catch (err) {
      // AvaluoApiError carries a user-facing Spanish message
      const friendlyMessage =
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos enviar tu solicitud. Intentá de nuevo.'

      setSubmitError(friendlyMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, router])

  // ──────────────────────────────────────────────────────────────────────────
  // Context value
  // ──────────────────────────────────────────────────────────────────────────

  const value: AvaluoContextValue = {
    formData,
    updateFormData,
    currentStep,
    totalSteps: TOTAL_STEPS,
    nextStep,
    prevStep,
    goToStep,
    isStepValid,
    canProceed,
    completedSteps,
    isSubmitting,
    submitError,
    submitAvaluo,
  }

  return (
    <AvaluoContext.Provider value={value}>{children}</AvaluoContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook — throws if used outside provider
// ---------------------------------------------------------------------------

export function useAvaluo(): AvaluoContextValue {
  const context = useContext(AvaluoContext)
  if (!context) {
    throw new Error('useAvaluo must be used within an AvaluoProvider')
  }
  return context
}
