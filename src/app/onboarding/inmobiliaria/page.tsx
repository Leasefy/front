'use client'

import { LeasefyLogo } from '@/components/brand';
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, SpinnerGap, Shield, Storefront, User, Phone, Envelope, ChatCircle, MapPin, Buildings, Rocket, Briefcase, ChartLineUp, Users, House, Wrench, Scales, Eye, EyeSlash, Lock } from '@phosphor-icons/react'
import { cn, sanitizeReturnUrl } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

// ============================================================================
// Types & Constants
// ============================================================================

type PreferredContact = 'whatsapp' | 'email' | 'phone'
type PortfolioSize = 'small' | 'medium' | 'large' | 'enterprise'
type AgencyService = 'arriendos' | 'ventas' | 'administracion' | 'avaluos'

interface OnboardingData {
  // Step 1: Agency Info
  agencyName: string
  nit: string
  contactPerson: string
  phone: string
  preferredContact: PreferredContact
  // Step 2: Business Details
  city: string
  portfolioSize: PortfolioSize | null
  yearsInBusiness: string
  // Step 3: Services
  services: AgencyService[]
  // Step 4: Account
  email: string
  password: string
  confirmPassword: string
}

// ============================================================================
// Main Component
// ============================================================================

function OnboardingInmobiliariaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithGoogle, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { t } = useI18n()
  const rawReturnUrl = searchParams.get('returnUrl')
  const returnUrl = rawReturnUrl ? sanitizeReturnUrl(rawReturnUrl, '/panel/inmobiliaria') : null

  const PORTFOLIO_SIZES: { value: PortfolioSize; label: string; description: string }[] = useMemo(() => [
    { value: 'small', label: t('inmobiliaria.onboarding.register.portfolioSizes.smallLabel'), description: t('inmobiliaria.onboarding.register.portfolioSizes.smallDesc') },
    { value: 'medium', label: t('inmobiliaria.onboarding.register.portfolioSizes.mediumLabel'), description: t('inmobiliaria.onboarding.register.portfolioSizes.mediumDesc') },
    { value: 'large', label: t('inmobiliaria.onboarding.register.portfolioSizes.largeLabel'), description: t('inmobiliaria.onboarding.register.portfolioSizes.largeDesc') },
    { value: 'enterprise', label: t('inmobiliaria.onboarding.register.portfolioSizes.enterpriseLabel'), description: t('inmobiliaria.onboarding.register.portfolioSizes.enterpriseDesc') },
  ], [t])

  const SERVICES: { value: AgencyService; label: string; icon: typeof House }[] = useMemo(() => [
    { value: 'arriendos', label: t('inmobiliaria.onboarding.register.services.arriendos'), icon: House },
    { value: 'ventas', label: t('inmobiliaria.onboarding.register.services.ventas'), icon: Buildings },
    { value: 'administracion', label: t('inmobiliaria.onboarding.register.services.administracion'), icon: Wrench },
    { value: 'avaluos', label: t('inmobiliaria.onboarding.register.services.avaluos'), icon: Scales },
  ], [t])

  const CITIES = useMemo(() => [
    t('inmobiliaria.onboarding.register.cities.bogota'),
    t('inmobiliaria.onboarding.register.cities.medellin'),
    t('inmobiliaria.onboarding.register.cities.cali'),
    t('inmobiliaria.onboarding.register.cities.barranquilla'),
    t('inmobiliaria.onboarding.register.cities.cartagena'),
    t('inmobiliaria.onboarding.register.cities.bucaramanga'),
    t('inmobiliaria.onboarding.register.cities.pereira'),
    t('inmobiliaria.onboarding.register.cities.santaMarta'),
    t('inmobiliaria.onboarding.register.cities.other'),
  ], [t])
  // When coming from publish wizard (returnUrl present), skip business details + services
  const fromPublish = !!returnUrl
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  // Shown when the user taps a disabled CTA: explains the first missing field
  const [disabledHint, setDisabledHint] = useState<string | null>(null)

  // Clear the disabled-CTA hint when changing steps
  useEffect(() => {
    setDisabledHint(null)
  }, [step])

  const [data, setData] = useState<OnboardingData>({
    agencyName: '',
    nit: '',
    contactPerson: '',
    phone: '',
    preferredContact: 'whatsapp',
    city: '',
    portfolioSize: null,
    yearsInBusiness: '',
    services: ['arriendos'],
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Load saved draft data (but not completion status - that's only set after successful registration)
  useEffect(() => {
    const saved = localStorage.getItem('plan_onboarding_agency')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.draft && !parsed.isComplete) {
          // Only load draft data if not completed - prevents showing old data
          setData(prev => ({
            ...prev,
            agencyName: parsed.draft.agencyName || '',
            nit: parsed.draft.nit || '',
            contactPerson: parsed.draft.contactPerson || '',
            phone: parsed.draft.phone || '',
            preferredContact: parsed.draft.preferredContact || 'whatsapp',
            city: parsed.draft.city || '',
            portfolioSize: parsed.draft.portfolioSize || null,
            yearsInBusiness: parsed.draft.yearsInBusiness?.toString() || '',
            services: parsed.draft.services || ['arriendos'],
          }))
        }
      } catch (e) {
        console.error('Error loading progress:', e)
      }
    }
  }, [])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const toggleService = (service: AgencyService) => {
    setData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }))
  }

  const isStep1Valid = data.agencyName.trim().length > 0 && data.contactPerson.trim().length > 0
  const isStep2Valid = data.city.trim().length > 0 && data.portfolioSize !== null
  const isStep3Valid = data.services.length > 0
  const isStep4Valid = data.email.trim().length > 0 &&
    data.password.length >= 8 &&
    data.password === data.confirmPassword

  // First missing-field message per step (for the disabled-CTA tap affordance)
  const step1HintMessage = !data.agencyName.trim()
    ? `${t('inmobiliaria.onboarding.register.step1.agencyName')}: ${t('validation.required')}`
    : `${t('inmobiliaria.onboarding.register.step1.contactPerson')}: ${t('validation.required')}`
  const step4HintMessage = !data.email.trim()
    ? `${t('inmobiliaria.onboarding.register.step4.email')}: ${t('validation.required')}`
    : data.password.length < 8
      ? t('validation.password')
      : t('validation.passwordMatch')

  const handleNext = () => {
    if (step === 1 && isStep1Valid) {
      // Skip steps 2 & 3 when coming from publish wizard
      setStep(fromPublish ? 4 : 2)
    } else if (step === 2 && isStep2Valid) {
      setStep(3)
    } else if (step === 3 && isStep3Valid) {
      setStep(4)
    }
  }

  const handleBack = () => {
    if (step === 4 && fromPublish) {
      setStep(1)
    } else if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!isStep4Valid) return

    setIsSubmitting(true)
    setAuthError(null)

    try {
      // If not authenticated, trigger Google sign-in
      if (!isAuthenticated) {
        // Save draft before redirecting to Google OAuth
        localStorage.setItem('plan_onboarding_agency_draft', JSON.stringify(data))
        await signInWithGoogle()
        return
      }

      // Save onboarding data to localStorage
      const completionData = {
        draft: {
          agencyName: data.agencyName,
          nit: data.nit,
          contactPerson: data.contactPerson,
          phone: data.phone,
          preferredContact: data.preferredContact,
          ...(fromPublish ? {} : {
            city: data.city,
            portfolioSize: data.portfolioSize,
            yearsInBusiness: data.yearsInBusiness ? parseInt(data.yearsInBusiness) : null,
            services: data.services,
          }),
        },
        completedSteps: fromPublish ? [1, 4] : [1, 2, 3, 4],
        isComplete: true,
        completedAt: new Date().toISOString(),
      }
      localStorage.setItem('plan_onboarding_agency', JSON.stringify(completionData))
      window.dispatchEvent(new Event('onboarding-updated'))

      // Show success screen
      setIsComplete(true)
    } catch (error) {
      console.error('Error:', error)
      setAuthError(t('inmobiliaria.onboarding.register.errors.unexpected'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    router.push(isAuthenticated ? '/panel/inmobiliaria' : '/')
  }

  // Navigate to dashboard - uses window.location to ensure full page load
  const goToDashboard = () => {
    setIsNavigating(true)
    window.location.href = returnUrl || '/panel/inmobiliaria'
  }

  // Success Screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1A40FF] to-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-[#EEF1FF] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#1A40FF]" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            {t('inmobiliaria.onboarding.register.success.welcome', { agencyName: data.agencyName })}
          </h1>
          <p className="text-neutral-600 mb-8">
            {t('inmobiliaria.onboarding.register.success.description')}
          </p>
          <button
            onClick={goToDashboard}
            disabled={isNavigating}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-[#1A40FF] text-white font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isNavigating ? (
              <>
                <SpinnerGap className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                {t('inmobiliaria.onboarding.register.success.goToPanel')}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick stats preview */}
          <div className="mt-8 p-4 bg-white rounded-xl border border-neutral-200">
            <p className="text-sm font-medium text-neutral-900 mb-3">{t('inmobiliaria.onboarding.register.success.planIncludes')}</p>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#EEF1FF] rounded-md flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#1A40FF]" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.ownerManagement')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#E8F3EC] rounded-md flex items-center justify-center">
                  <Buildings className="w-4 h-4 text-[#2C7A53]" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.unlimitedPortfolio')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#F8F0E0] rounded-md flex items-center justify-center">
                  <ChartLineUp className="w-4 h-4 text-[#B7791F]" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.reportsAnalytics')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#F8EAE7] rounded-md flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#C4503B]" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.tenantVerification')}</span>
              </div>
            </div>
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                {(fromPublish ? [1, 4] : [1, 2, 3, 4]).map((s, idx, arr) => (
                  <div key={s} className="flex items-center gap-1.5 sm:gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                      step > s ? "bg-[#1A40FF] text-white uppercase tracking-wide font-mono" :
                      step === s ? "bg-[#1A40FF] text-white uppercase tracking-wide font-mono" : "bg-neutral-100 text-neutral-400"
                    )}>
                      {step > s ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={cn(
                        "w-3 sm:w-6 h-0.5 transition-colors",
                        step > s ? "bg-[#1A40FF]" : "bg-neutral-200"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="shrink-0 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {t('inmobiliaria.onboarding.register.skip')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Agency Info */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EEF1FF] text-[#1A40FF] rounded-full text-sm font-medium mb-4">
                  <Storefront className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.step1.badge')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                  {t('inmobiliaria.onboarding.register.step1.title')}
                </h1>
                <p className="text-neutral-500">
                  {t('inmobiliaria.onboarding.register.step1.subtitle')}
                </p>
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleNext()
                }}
              >
              <div className="space-y-5">
                {/* Agency Name */}
                <div>
                  <label htmlFor="agencyName" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.agencyName')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <input
                    id="agencyName"
                    type="text"
                    autoComplete="organization"
                    value={data.agencyName}
                    onChange={(e) => updateData({ agencyName: e.target.value })}
                    placeholder={t('inmobiliaria.onboarding.register.step1.agencyNamePlaceholder')}
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* NIT */}
                <div>
                  <label htmlFor="nit" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.nit')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    id="nit"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={data.nit}
                    onChange={(e) => updateData({ nit: e.target.value })}
                    placeholder="900.123.456-7"
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.contactPerson')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <input
                    id="contactPerson"
                    type="text"
                    autoComplete="name"
                    value={data.contactPerson}
                    onChange={(e) => updateData({ contactPerson: e.target.value })}
                    placeholder={t('inmobiliaria.onboarding.register.step1.contactPersonPlaceholder')}
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.phone')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    id="phone"
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
                    maxLength={12} // 10 digits + 2 spaces
                    className={cn(
                      "w-full px-4 py-3.5 text-base rounded-xl border bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all",
                      data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10
                        ? "border-[#B7791F]/30 focus:border-[#B7791F]/30"
                        : "border-neutral-200 focus:border-neutral-400"
                    )}
                  />
                  <p className="mt-1.5 text-xs text-neutral-400">
                    {t('inmobiliaria.onboarding.register.step1.phoneHint')}
                  </p>
                  {data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10 && (
                    <p className="mt-1 text-xs text-[#B7791F]">
                      {t('inmobiliaria.onboarding.register.step1.phoneValidation')}
                    </p>
                  )}
                </div>

              </div>

              {/* Continue Button */}
              <span
                className={cn('block', !isStep1Valid && 'cursor-not-allowed')}
                onClick={() => {
                  if (!isStep1Valid) setDisabledHint(step1HintMessage)
                }}
              >
                <button
                  type="submit"
                  disabled={!isStep1Valid}
                  className={cn(
                    "w-full mt-10 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                    isStep1Valid
                      ? "bg-[#1A40FF] text-white hover:opacity-90"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </span>
              {disabledHint && !isStep1Valid && (
                <p role="status" className="mt-3 text-xs text-[#B7791F] text-center">
                  {disabledHint}
                </p>
              )}
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 2: Business Details */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F3EC] text-[#2C7A53] rounded-full text-sm font-medium mb-4">
                  <Briefcase className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.step2.badge')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                  {t('inmobiliaria.onboarding.register.step2.title')}
                </h1>
                <p className="text-neutral-500">
                  {t('inmobiliaria.onboarding.register.step2.subtitle')}
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
                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step2.city')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <select
                    id="city"
                    value={data.city}
                    onChange={(e) => updateData({ city: e.target.value })}
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="">{t('inmobiliaria.onboarding.register.step2.cityPlaceholder')}</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Portfolio Size */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    {t('inmobiliaria.onboarding.register.step2.portfolioSize')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PORTFOLIO_SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => updateData({ portfolioSize: size.value })}
                        className={cn(
                          "flex flex-col items-start px-4 py-3.5 rounded-xl border transition-all text-left",
                          data.portfolioSize === size.value
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 bg-white hover:border-neutral-300"
                        )}
                      >
                        <span className={cn(
                          "font-medium text-sm",
                          data.portfolioSize === size.value ? "text-neutral-900" : "text-neutral-600"
                        )}>
                          {size.label}
                        </span>
                        <span className="text-xs text-neutral-400 mt-0.5">{size.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Years in Business */}
                <div>
                  <label htmlFor="yearsInBusiness" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step2.yearsInBusiness')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    id="yearsInBusiness"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={data.yearsInBusiness}
                    onChange={(e) => updateData({ yearsInBusiness: e.target.value })}
                    placeholder="5"
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-10">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.back')}
                </button>
                <button
                  type="submit"
                  disabled={!isStep2Valid}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                    isStep2Valid
                      ? "bg-[#1A40FF] text-white hover:opacity-90"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 3: Services */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F8F0E0] text-[#B7791F] rounded-full text-sm font-medium mb-4">
                  <ChartLineUp className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.step3.badge')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                  {t('inmobiliaria.onboarding.register.step3.title')}
                </h1>
                <p className="text-neutral-500">
                  {t('inmobiliaria.onboarding.register.step3.subtitle')}
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
                {/* Services Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    {t('inmobiliaria.onboarding.register.step3.mainServices')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {SERVICES.map((service) => {
                      const isSelected = data.services.includes(service.value)
                      const Icon = service.icon
                      return (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() => toggleService(service.value)}
                          className={cn(
                            "relative flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all text-left",
                            isSelected
                              ? "border-[#1A40FF]/30 bg-[#EEF1FF]"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-md flex items-center justify-center transition-colors",
                            isSelected ? "bg-[#EEF1FF]" : "bg-neutral-100"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5 transition-colors",
                              isSelected ? "text-[#1A40FF]" : "text-neutral-500"
                            )} />
                          </div>
                          <span className={cn(
                            "font-medium",
                            isSelected ? "text-[#1A40FF]" : "text-neutral-600"
                          )}>
                            {service.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1A40FF] flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Trust badges */}
                <div className="p-4 bg-[#EEF1FF] rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#EEF1FF] rounded-md flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-[#1A40FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{t('inmobiliaria.onboarding.register.step3.trustBadgeTitle')}</p>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {t('inmobiliaria.onboarding.register.step3.trustBadgeDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-10">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.back')}
                </button>
                <button
                  type="submit"
                  disabled={!isStep3Valid}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                    isStep3Valid
                      ? "bg-[#1A40FF] text-white hover:opacity-90"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              </form>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 4: Create Account */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EEF1FF] text-[#1A40FF] rounded-full text-sm font-medium mb-4">
                  <Lock className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.step4.badge')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                  {t('inmobiliaria.onboarding.register.step4.title')}
                </h1>
                <p className="text-neutral-500">
                  {t('inmobiliaria.onboarding.register.step4.subtitle')}
                </p>
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
              >
              <div className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="accountEmail" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step4.email')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <div className="relative">
                    <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id="accountEmail"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      value={data.email}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.emailPlaceholder')}
                      className="w-full pl-12 pr-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="accountPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step4.password')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id="accountPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={data.password}
                      onChange={(e) => updateData({ password: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.passwordPlaceholder')}
                      className="w-full pl-12 pr-12 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {data.password.length > 0 && data.password.length < 8 && (
                    <p className="mt-1.5 text-xs text-[#B7791F]">
                      {t('validation.password')}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="accountConfirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step4.confirmPassword')} <span className="text-[#C4503B]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id="accountConfirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={data.confirmPassword}
                      onChange={(e) => updateData({ confirmPassword: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.confirmPasswordPlaceholder')}
                      className={cn(
                        "w-full pl-12 pr-12 py-3.5 text-base rounded-xl border bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 transition-all",
                        data.confirmPassword.length > 0 && data.password !== data.confirmPassword
                          ? "border-[#C4503B]/30 focus:border-[#C4503B]/30"
                          : "border-neutral-200 focus:border-[#1A40FF]/30"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showConfirmPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {data.confirmPassword.length > 0 && data.password !== data.confirmPassword && (
                    <p className="mt-1.5 text-xs text-[#C4503B]">
                      {t('validation.passwordMatch')}
                    </p>
                  )}
                </div>

                {/* Error message */}
                {authError && (
                  <div className="p-4 bg-[#F8EAE7] border border-[#C4503B]/30 rounded-xl">
                    <p className="text-sm text-[#C4503B]">{authError}</p>
                  </div>
                )}

                {/* Terms notice */}
                <p className="text-xs text-neutral-400 text-center">
                  {t('inmobiliaria.onboarding.register.step4.termsPrefix')}{' '}
                  <Link href="/terminos" className="text-[#1A40FF] hover:underline">
                    {t('inmobiliaria.onboarding.register.step4.termsOfService')}
                  </Link>{' '}
                  {t('common.and')}{' '}
                  <Link href="/privacidad" className="text-[#1A40FF] hover:underline">
                    {t('inmobiliaria.onboarding.register.step4.privacyPolicy')}
                  </Link>
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-10">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.back')}
                </button>
                <span
                  className={cn('flex-1 flex', !isStep4Valid && !isSubmitting && 'cursor-not-allowed')}
                  onClick={() => {
                    if (!isStep4Valid && !isSubmitting) setDisabledHint(step4HintMessage)
                  }}
                >
                  <button
                    type="submit"
                    disabled={!isStep4Valid || isSubmitting}
                    className={cn(
                      "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                      isStep4Valid && !isSubmitting
                        ? "bg-[#1A40FF] text-white hover:opacity-90"
                        : "bg-neutral-100 text-neutral-400 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <SpinnerGap className="w-4 h-4 animate-spin" />
                        {t('inmobiliaria.onboarding.register.step4.creatingAccount')}
                      </>
                    ) : (
                      <>
                        {t('inmobiliaria.onboarding.register.step4.createAccount')}
                        <Rocket className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </span>
              </div>
              {disabledHint && !isStep4Valid && (
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

export default function OnboardingInmobiliariaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]" />}>
      <OnboardingInmobiliariaContent />
    </Suspense>
  )
}
