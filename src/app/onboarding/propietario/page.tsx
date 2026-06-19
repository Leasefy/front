'use client'

import { LeasefyLogo } from '@/components/brand';
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
      <div className="min-h-screen bg-gradient-to-b from-[#2C7A53] to-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-[#E8F3EC] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#2C7A53]" strokeWidth={2.5} />
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
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <LeasefyLogo size={28} tone="brand" />
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EEF1FF] text-[#1A40FF] rounded-full text-sm font-medium mb-4">
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
                    ¿Cómo te llamas? <span className="text-[#C4503B]">*</span>
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
                        ? "border-[#B7791F]/30 focus:border-[#B7791F]/30"
                        : "border-neutral-200 focus:border-neutral-400"
                    )}
                  />
                  <p className="text-xs text-neutral-400 mt-1.5">
                    Solo para notificaciones importantes de tu propiedad
                  </p>
                  {data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10 && (
                    <p className="mt-1 text-xs text-[#B7791F]">
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
                    ? "bg-[#1A40FF] text-white hover:opacity-90"
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
                <p role="status" className="mt-3 text-xs text-[#B7791F] text-center">
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F3EC] text-[#2C7A53] rounded-full text-sm font-medium mb-4">
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
                    Tipo de propiedad <span className="text-[#C4503B]">*</span>
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
                    Ciudad <span className="text-[#C4503B]">*</span>
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
                  <div className="w-10 h-10 bg-[#E8F3EC] rounded-md flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#2C7A53]" />
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
                        ? "bg-[#1A40FF] text-white hover:opacity-90"
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
                <p role="status" className="mt-3 text-xs text-[#B7791F] text-center">
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
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]" />}>
      <OnboardingPropietarioContent />
    </Suspense>
  )
}
