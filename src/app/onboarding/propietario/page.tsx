'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, SpinnerGap, Shield, House, User, Phone, Envelope, ChatCircle, MapPin, CurrencyDollar, Rocket, SealCheck, Money, X } from '@phosphor-icons/react'
import { cn, sanitizeReturnUrl } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { useI18n } from '@/lib/i18n'

// ============================================================================
// TextTs & Constants
// ============================================================================

type PreferredContact = 'whatsapp' | 'email' | 'phone'
type PropertyType = 'apartment' | 'house' | 'studio' | 'room'

interface OnboardingData {
  // Step 1: About You
  displayName: string
  phone: string
  preferredContact: PreferredContact
  // Step 2: Your Property
  propertyTextT: PropertyType | null
  propertyCity: string
  expectedRent: string
}

const PROPERTY_TYPES: { value: PropertyType; label: string; emoji: string }[] = [
  { value: 'apartment', label: 'Apartamento', emoji: '🏢' },
  { value: 'house', label: 'Casa', emoji: '🏠' },
  { value: 'studio', label: 'Estudio', emoji: '🛏️' },
  { value: 'room', label: 'Habitación', emoji: '🚪' },
]

const CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Otra ciudad',
]

// ============================================================================
// Main Component
// ============================================================================

function OnboardingPropietarioContent() {
  const { locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawReturnUrl = searchParams.get('returnUrl')
  const returnUrl = rawReturnUrl ? sanitizeReturnUrl(rawReturnUrl, '/panel') : null
  const { refreshUser, isAuthenticated } = useAuth()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  // Shown when the user taps a disabled CTA: explains the first missing field
  const [disabledHint, setDisabledHint] = useState<string | null>(null)

  // Clear the disabled-CTA hint when changing steps
  useEffect(() => {
    setDisabledHint(null)
  }, [step])

  const [data, setData] = useState<OnboardingData>({
    displayName: '',
    phone: '',
    preferredContact: 'whatsapp',
    propertyTextT: null,
    propertyCity: '',
    expectedRent: '',
  })

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('plan_onboarding_landlord')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.draft) {
          setData(prev => ({
            ...prev,
            displayName: parsed.draft.displayName || '',
            phone: parsed.draft.phone || '',
            preferredContact: parsed.draft.preferredContact || 'whatsapp',
            propertyTextT: parsed.draft.propertyTextT || null,
            propertyCity: parsed.draft.propertyCity || '',
            expectedRent: parsed.draft.rentPrice?.toString() || '',
          }))
        }
        if (parsed.isComplete) {
          setIsComplete(true)
        }
      } catch (e) {
        console.error('Error loading progress:', e)
      }
    }
  }, [])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  // When coming from publish wizard (returnUrl present), skip property step
  const fromPublish = !!returnUrl
  const totalSteps = fromPublish ? 1 : 2

  const isStep1Valid = data.displayName.trim().length > 0
  const isStep2Valid = data.propertyTextT !== null && data.propertyCity.trim().length > 0

  // First missing-field message per step (for the disabled-CTA tap affordance)
  const step1HintMessage = 'Ingresa tu nombre completo para continuar'
  const step2HintMessage = data.propertyTextT === null
    ? 'Selecciona el tipo de propiedad para continuar'
    : 'Selecciona la ciudad para continuar'

  const handleNext = () => {
    if (step === 1 && isStep1Valid) {
      if (fromPublish) {
        // Skip step 2 — property info already captured in publish wizard
        handleSubmit()
      } else {
        setStep(2)
      }
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleSubmit = async () => {
    if (!fromPublish && !isStep2Valid) return

    setIsSubmitting(true)
    try {
      // Split displayName into first/last for backend
      const nameParts = data.displayName.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || firstName

      // Call backend onboarding endpoint
      // Strip spaces from phone — backend expects 3XXXXXXXXX or +573XXXXXXXXX
      const rawPhone = data.phone?.replace(/\s/g, '') || ''
      await apiClient.post('/users/me/onboarding', {
        firstName,
        lastName,
        phone: rawPhone.length >= 10 ? rawPhone : undefined,
        userType: 'LANDLORD',
      })

      // Refresh user in auth context so role/onboardingCompleted updates
      // Fire-and-forget: don't await because supabase.auth.getSession() can hang
      // when called right after a state change. The critical API call already succeeded.
      refreshUser().catch((err) =>
        console.warn('refreshUser failed after onboarding (non-blocking):', err)
      )

      // Save to localStorage for sidebar progress display
      const completionData = {
        draft: {
          displayName: data.displayName,
          phone: data.phone,
          preferredContact: data.preferredContact,
          ...(fromPublish ? {} : {
            propertyTextT: data.propertyTextT,
            propertyCity: data.propertyCity,
            rentPrice: data.expectedRent ? parseInt(data.expectedRent.replace(/\D/g, '')) : null,
          }),
        },
        completedSteps: fromPublish ? [1] : [1, 2],
        isComplete: true,
        completedAt: new Date().toISOString(),
      }
      localStorage.setItem('plan_onboarding_landlord', JSON.stringify(completionData))
      window.dispatchEvent(new Event('onboarding-updated'))

      setIsComplete(true)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    router.push(isAuthenticated ? (returnUrl || '/panel') : '/')
  }

  // Auto-redirect after onboarding completes
  useEffect(() => {
    if (isComplete) {
      const destination = returnUrl || '/panel'
      const timer = setTimeout(() => router.push(destination), 2500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, returnUrl, router])

  // Success Screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            ¡Listo, {data.displayName.split(' ')[0]}!
          </h1>
          <p className="text-neutral-600 mb-8">
            Tu perfil está configurado. Ahora puedes publicar tu propiedad y encontrar inquilinos verificados.
          </p>
          <div className="space-y-3">
            {returnUrl ? (
              <Link
                href={returnUrl}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-neutral-900 text-white font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Ir al panel de propiedades
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/publicar"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-neutral-900 text-white font-semibold rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  Publicar mi propiedad
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/panel"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-white text-neutral-700 font-medium rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                >
                  Ir al panel
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <svg viewBox="0 0 207 60" className="h-6 w-auto text-neutral-900" fill="none">
                <path d="M5 51L29 27L47 45V15" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M65.52 47V15.32H68.05V44.536H83.45V47H65.52ZM94.7989 47.66C92.5256 47.66 90.5602 47.154 88.9029 46.142C87.2456 45.1153 85.9622 43.6707 85.0529 41.808C84.1436 39.9307 83.6889 37.716 83.6889 35.164C83.6889 32.568 84.1362 30.3313 85.0309 28.454C85.9402 26.562 87.2162 25.11 88.8589 24.098C90.5162 23.086 92.4816 22.58 94.7549 22.58C97.0576 22.58 99.0229 23.108 100.651 24.164C102.294 25.2053 103.54 26.716 104.391 28.696C105.256 30.676 105.667 33.0593 105.623 35.846H102.983V34.966C102.91 31.71 102.176 29.2313 100.783 27.53C99.3896 25.8287 97.3949 24.978 94.7989 24.978C92.1149 24.978 90.0396 25.8653 88.5729 27.64C87.1209 29.4 86.3949 31.8933 86.3949 35.12C86.3949 38.3173 87.1209 40.796 88.5729 42.556C90.0396 44.316 92.1002 45.196 94.7549 45.196C96.5882 45.196 98.1869 44.7707 99.5509 43.92C100.93 43.0547 102.022 41.8227 102.829 40.224L105.117 41.236C104.164 43.2893 102.785 44.8733 100.981 45.988C99.1769 47.1027 97.1162 47.66 94.7989 47.66ZM85.4269 35.846V33.558H104.193V35.846H85.4269ZM114.724 47.66C112.89 47.66 111.365 47.3373 110.148 46.692C108.945 46.0467 108.043 45.196 107.442 44.14C106.84 43.0693 106.54 41.9107 106.54 40.664C106.54 39.3147 106.818 38.1853 107.376 37.276C107.948 36.3667 108.703 35.6333 109.642 35.076C110.595 34.5187 111.644 34.1007 112.788 33.822C114.093 33.5287 115.501 33.2793 117.012 33.074C118.522 32.854 119.96 32.6633 121.324 32.502C122.702 32.3407 123.824 32.2013 124.69 32.084L123.766 32.634C123.824 30.0673 123.34 28.1607 122.314 26.914C121.302 25.6527 119.512 25.022 116.946 25.022C115.142 25.022 113.653 25.4327 112.48 26.254C111.321 27.0607 110.507 28.3147 110.038 30.016L107.442 29.29C107.984 27.134 109.077 25.4767 110.72 24.318C112.362 23.1593 114.467 22.58 117.034 22.58C119.219 22.58 121.052 23.0053 122.534 23.856C124.03 24.7067 125.071 25.902 125.658 27.442C125.907 28.0727 126.076 28.8133 126.164 29.664C126.252 30.5 126.296 31.3433 126.296 32.194V47H123.986V40.752L124.844 40.972C124.125 43.1133 122.871 44.7633 121.082 45.922C119.292 47.0807 117.173 47.66 114.724 47.66ZM114.856 45.328C116.469 45.328 117.884 45.042 119.102 44.47C120.319 43.8833 121.302 43.0693 122.05 42.028C122.812 40.972 123.296 39.7327 123.502 38.31C123.648 37.518 123.729 36.66 123.744 35.736C123.758 34.812 123.766 34.13 123.766 33.69L124.866 34.394C123.912 34.5113 122.768 34.636 121.434 34.768C120.114 34.9 118.764 35.0613 117.386 35.252C116.007 35.4427 114.76 35.6847 113.646 35.978C112.956 36.1687 112.26 36.4473 111.556 36.814C110.866 37.166 110.287 37.6573 109.818 38.288C109.363 38.9187 109.136 39.718 109.136 40.686C109.136 41.4047 109.312 42.1233 109.664 42.842C110.03 43.5607 110.632 44.1547 111.468 44.624C112.304 45.0933 113.433 45.328 114.856 45.328ZM138.586 47.616C135.843 47.616 133.577 47.0367 131.788 45.878C130.013 44.7193 128.913 43.106 128.488 41.038L131.084 40.598C131.451 42.006 132.316 43.128 133.68 43.964C135.044 44.8 136.716 45.218 138.696 45.218C140.661 45.218 142.223 44.8 143.382 43.964C144.541 43.128 145.12 41.984 145.12 40.532C145.12 39.74 144.937 39.0947 144.57 38.596C144.218 38.0827 143.514 37.6133 142.458 37.188C141.402 36.7627 139.833 36.264 137.75 35.692C135.55 35.1053 133.827 34.5187 132.58 33.932C131.348 33.3453 130.475 32.678 129.962 31.93C129.463 31.182 129.214 30.2653 129.214 29.18C129.214 27.8747 129.588 26.7307 130.336 25.748C131.084 24.7507 132.125 23.9733 133.46 23.416C134.809 22.8587 136.364 22.58 138.124 22.58C139.884 22.58 141.468 22.8733 142.876 23.46C144.284 24.032 145.421 24.8387 146.286 25.88C147.151 26.9067 147.65 28.102 147.782 29.466L145.186 29.95C144.937 28.4247 144.167 27.222 142.876 26.342C141.585 25.4473 139.972 24.9927 138.036 24.978C136.203 24.9487 134.707 25.3153 133.548 26.078C132.389 26.826 131.81 27.816 131.81 29.048C131.81 29.752 132.008 30.3533 132.404 30.852C132.815 31.336 133.533 31.7833 134.56 32.194C135.587 32.6047 137.039 33.0447 138.916 33.514C141.204 34.1007 142.986 34.702 144.262 35.318C145.553 35.934 146.462 36.66 146.99 37.496C147.518 38.3173 147.782 39.3367 147.782 40.554C147.782 42.754 146.961 44.4847 145.318 45.746C143.69 46.9927 141.446 47.616 138.586 47.616ZM160.257 47.66C157.984 47.66 156.019 47.154 154.361 46.142C152.704 45.1153 151.421 43.6707 150.511 41.808C149.602 39.9307 149.147 37.716 149.147 35.164C149.147 32.568 149.595 30.3313 150.489 28.454C151.399 26.562 152.675 25.11 154.317 24.098C155.975 23.086 157.94 22.58 160.213 22.58C162.516 22.58 164.481 23.108 166.109 24.164C167.752 25.2053 168.999 26.716 169.849 28.696C170.715 30.676 171.125 33.0593 171.081 35.846H168.441V34.966C168.368 31.71 167.635 29.2313 166.241 27.53C164.848 25.8287 162.853 24.978 160.257 24.978C157.573 24.978 155.498 25.8653 154.031 27.64C152.579 29.4 151.853 31.8933 151.853 35.12C151.853 38.3173 152.579 40.796 154.031 42.556C155.498 44.316 157.559 45.196 160.213 45.196C162.047 45.196 163.645 44.7707 165.009 43.92C166.388 43.0547 167.481 41.8227 168.287 40.224L170.575 41.236C169.622 43.2893 168.243 44.8733 166.439 45.988C164.635 47.1027 162.575 47.66 160.257 47.66ZM150.885 35.846V33.558H169.651V35.846H150.885ZM176.212 47V21.018C176.212 20.402 176.241 19.8153 176.3 19.258C176.373 18.7007 176.513 18.1727 176.718 17.674C176.938 17.1753 177.246 16.706 177.642 16.266C178.053 15.826 178.507 15.4887 179.006 15.254C179.519 15.0193 180.062 14.8653 180.634 14.792C181.206 14.704 181.807 14.66 182.438 14.66H185.496V16.86H182.658C181.353 16.86 180.37 17.1753 179.71 17.806C179.065 18.4367 178.742 19.478 178.742 20.93V47H176.212ZM171.988 25.55V23.24H185.496V25.55H171.988ZM190.278 57.56L194.898 45.13L194.942 48.826L184.536 23.24H187.242L196.174 45.46H194.766L202.884 23.24H205.546L192.918 57.56H190.278Z" fill="currentColor"/>
              </svg>
            </Link>

            {/* Progress */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  step >= 1 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                )}>
                  {step > 1 ? <Check className="w-4 h-4" /> : "1"}
                </div>
                {!fromPublish && (
                  <>
                    <div className={cn(
                      "w-12 h-0.5 transition-colors",
                      step > 1 ? "bg-neutral-900" : "bg-neutral-200"
                    )} />
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                      step >= 2 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                    )}>
                      2
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="shrink-0 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Saltar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: About You */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium mb-4">
                  <Shield className="w-4 h-4" />
                  Tu información está protegida
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                  Bienvenido a Leasefy
                </h1>
                <p className="text-neutral-500">
                  Cuéntanos un poco sobre ti para personalizar tu experiencia
                </p>
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleNext()
                }}
              >
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700 mb-2">
                    ¿Cómo te llamas? <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    value={data.displayName}
                    onChange={(e) => updateData({ displayName: e.target.value })}
                    placeholder="Tu nombre completo"
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="ownerPhone" className="block text-sm font-medium text-neutral-700 mb-2">
                    Celular <span className="text-neutral-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="ownerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '')
                      // Limit to 10 digits
                      if (value.length <= 10) {
                        // Format: 300 123 4567
                        let formatted = value
                        if (value.length > 3) {
                          formatted = value.slice(0, 3) + ' ' + value.slice(3)
                        }
                        if (value.length > 6) {
                          formatted = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6)
                        }
                        updateData({ phone: formatted })
                      }
                    }}
                    placeholder="300 123 4567"
                    maxLength={12}
                    className={cn(
                      "w-full px-4 py-3.5 text-base rounded-xl border bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all",
                      data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10
                        ? "border-amber-300 focus:border-amber-400"
                        : "border-neutral-200 focus:border-neutral-400"
                    )}
                  />
                  <p className="text-xs text-neutral-400 mt-1.5">
                    Solo para notificaciones importantes de tu propiedad
                  </p>
                  {data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10 && (
                    <p className="mt-1 text-xs text-amber-600">
                      El número debe tener 10 dígitos
                    </p>
                  )}
                </div>

              </div>

              {/* Continue Button */}
              <span
                className={cn('block', !isStep1Valid && !isSubmitting && 'cursor-not-allowed')}
                onClick={() => {
                  if (!isStep1Valid && !isSubmitting) setDisabledHint(step1HintMessage)
                }}
              >
              <button
                type="submit"
                disabled={!isStep1Valid || isSubmitting}
                className={cn(
                  "w-full mt-10 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                  isStep1Valid && !isSubmitting
                    ? "bg-indigo-600 text-white uppercase tracking-wide font-mono hover:bg-indigo-700"
                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed pointer-events-none"
                )}
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : fromPublish ? (
                  <>
                    Comenzar
                    <Rocket className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              </span>
              {disabledHint && !isStep1Valid && (
                <p role="status" className="mt-3 text-xs text-amber-600 text-center">
                  {disabledHint}
                </p>
              )}
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 2: Your Property */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium mb-4">
                  <House className="w-4 h-4" />
                  Cuéntanos de tu propiedad
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                  Vamos a cuidar tu inversión
                </h1>
                <p className="text-neutral-500">
                  Información básica para encontrarte los mejores inquilinos
                </p>
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
              >
              <div className="space-y-6">
                {/* Property TextT */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Tipo de propiedad <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateData({ propertyTextT: type.value })}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left",
                          data.propertyTextT === type.value
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 bg-white hover:border-neutral-300"
                        )}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className={cn(
                          "font-medium",
                          data.propertyTextT === type.value ? "text-neutral-900" : "text-neutral-600"
                        )}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label htmlFor="propertyCity" className="block text-sm font-medium text-neutral-700 mb-2">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="propertyCity"
                    value={data.propertyCity}
                    onChange={(e) => updateData({ propertyCity: e.target.value })}
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="">Selecciona una ciudad</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Expected Rent */}
                <div>
                  <label htmlFor="expectedRent" className="block text-sm font-medium text-neutral-700 mb-2">
                    Arriendo esperado <span className="text-neutral-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                    <input
                      id="expectedRent"
                      type="text"
                      inputMode="numeric"
                      value={data.expectedRent}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        const formatted = value ? parseInt(value).toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''
                        updateData({ expectedRent: formatted })
                      }}
                      placeholder="2.500.000"
                      className="w-full pl-8 pr-20 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">/mes</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-8 p-4 bg-neutral-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Tu propiedad está protegida</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Verificamos todos los inquilinos y ofrecemos seguro contra impagos hasta 24 meses
                    </p>
                  </div>
                </div>
              </div>

              {/* Compass */}
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <span
                  className={cn('flex-1 flex', !isStep2Valid && !isSubmitting && 'cursor-not-allowed')}
                  onClick={() => {
                    if (!isStep2Valid && !isSubmitting) setDisabledHint(step2HintMessage)
                  }}
                >
                  <button
                    type="submit"
                    disabled={!isStep2Valid || isSubmitting}
                    className={cn(
                      "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                      isStep2Valid && !isSubmitting
                        ? "bg-indigo-600 text-white uppercase tracking-wide font-mono hover:bg-indigo-700"
                        : "bg-neutral-100 text-neutral-400 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <SpinnerGap className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        Comenzar
                        <Rocket className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </span>
              </div>
              {disabledHint && !isStep2Valid && (
                <p role="status" className="mt-3 text-xs text-amber-600 text-center">
                  {disabledHint}
                </p>
              )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function OnboardingPropietarioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OnboardingPropietarioContent />
    </Suspense>
  )
}
