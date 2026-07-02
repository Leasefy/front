'use client'

import { LeasefyLogo } from '@/components/brand';
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, Shield, Storefront, User, Phone, Envelope, ChatCircle, MapPin, Buildings, Rocket, Briefcase, ChartLineUp, Users, House, Wrench, Scales, Eye, EyeSlash, Lock } from '@phosphor-icons/react'
import { cn, sanitizeReturnUrl } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { IconButton } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" weight="bold" />
          </div>
          <h1 className="text-3xl font-bold text-fg mb-3">
            {t('inmobiliaria.onboarding.register.success.welcome', { agencyName: data.agencyName })}
          </h1>
          <p className="text-fg-muted mb-8">
            {t('inmobiliaria.onboarding.register.success.description')}
          </p>
          <Button
            onClick={goToDashboard}
            disabled={isNavigating}
            hideArrow
            size="lg"
            className="w-full"
          >
            {isNavigating ? (
              <>
                <Spinner size="xs" variant="current" />
                {t('common.loading')}
              </>
            ) : (
              <>
                {t('inmobiliaria.onboarding.register.success.goToPanel')}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Quick stats preview */}
          <div className="mt-8 p-4 bg-surface rounded-[20px] border border-border">
            <p className="text-sm font-medium text-fg mb-3">{t('inmobiliaria.onboarding.register.success.planIncludes')}</p>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-soft rounded-[10px] flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-fg-muted">{t('inmobiliaria.onboarding.register.success.ownerManagement')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-success-soft rounded-[10px] flex items-center justify-center">
                  <Buildings className="w-4 h-4 text-success" />
                </div>
                <span className="text-xs text-fg-muted">{t('inmobiliaria.onboarding.register.success.unlimitedPortfolio')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-warning-soft rounded-[10px] flex items-center justify-center">
                  <ChartLineUp className="w-4 h-4 text-warning" />
                </div>
                <span className="text-xs text-fg-muted">{t('inmobiliaria.onboarding.register.success.reportsAnalytics')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-danger-soft rounded-[10px] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-danger" />
                </div>
                <span className="text-xs text-fg-muted">{t('inmobiliaria.onboarding.register.success.tenantVerification')}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border-faint">
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
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-mono tabular-nums transition-colors",
                        step > s ? "bg-primary border-2 border-primary text-primary-fg" :
                        step === s ? "bg-surface border-2 border-primary text-primary" : "bg-surface border border-border text-fg-subtle"
                      )}
                      style={step === s ? { boxShadow: '0 0 0 4px rgba(26,64,255,0.14)' } : undefined}
                    >
                      {step > s ? <Check className="w-3.5 h-3.5" weight="bold" /> : idx + 1}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={cn(
                        "w-3 sm:w-6 h-0.5 transition-colors",
                        step > s ? "bg-primary" : "bg-border"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleSkip}
                hideArrow
                className="shrink-0 text-fg-subtle hover:text-fg-muted"
              >
                {t('inmobiliaria.onboarding.register.skip')}
              </Button>
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-soft text-primary rounded-full text-sm font-medium mb-4">
                  <Storefront className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.step1.badge')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-2">
                  {t('inmobiliaria.onboarding.register.step1.title')}
                </h1>
                <p className="text-fg-muted">
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
                  <label htmlFor="agencyName" className="block text-sm font-medium text-fg mb-2">
                    {t('inmobiliaria.onboarding.register.step1.agencyName')} <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="agencyName"
                    type="text"
                    autoComplete="organization"
                    value={data.agencyName}
                    onChange={(e) => updateData({ agencyName: e.target.value })}
                    placeholder={t('inmobiliaria.onboarding.register.step1.agencyNamePlaceholder')}
                  />
                </div>

                {/* NIT */}
                <div>
                  <label htmlFor="nit" className="block text-sm font-medium text-fg mb-2">
                    {t('inmobiliaria.onboarding.register.step1.nit')} <span className="text-fg-subtle font-normal">({t('common.optional')})</span>
                  </label>
                  <Input
                    id="nit"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={data.nit}
                    onChange={(e) => updateData({ nit: e.target.value })}
                    placeholder="900.123.456-7"
                    className="font-mono tabular-nums"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-fg mb-2">
                    {t('inmobiliaria.onboarding.register.step1.contactPerson')} <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="contactPerson"
                    type="text"
                    autoComplete="name"
                    value={data.contactPerson}
                    onChange={(e) => updateData({ contactPerson: e.target.value })}
                    placeholder={t('inmobiliaria.onboarding.register.step1.contactPersonPlaceholder')}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.phone')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <Input
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
                      "h-12 rounded-xl",
                      data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10 && "border-warning/40 focus-visible:border-warning/40"
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
                <Button
                  type="submit"
                  disabled={!isStep1Valid}
                  hideArrow
                  size="lg"
                  className="w-full mt-10"
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
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
                  <Select value={data.city} onValueChange={(v) => updateData({ city: v })}>
                    <SelectTrigger id="city" className="h-12 rounded-xl">
                      <SelectValue placeholder={t('inmobiliaria.onboarding.register.step2.cityPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Input
                    id="yearsInBusiness"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={data.yearsInBusiness}
                    onChange={(e) => updateData({ yearsInBusiness: e.target.value })}
                    placeholder="5"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-10">
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  size="lg"
                  onClick={handleBack}
                  className="rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.back')}
                </Button>
                <Button
                  type="submit"
                  disabled={!isStep2Valid}
                  hideArrow
                  size="lg"
                  className="flex-1 rounded-xl"
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
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
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  size="lg"
                  onClick={handleBack}
                  className="rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.back')}
                </Button>
                <Button
                  type="submit"
                  disabled={!isStep3Valid}
                  hideArrow
                  size="lg"
                  className="flex-1 rounded-xl"
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
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
                    <Input
                      id="accountEmail"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      value={data.email}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.emailPlaceholder')}
                      className="h-12 pl-12 rounded-xl"
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
                    <Input
                      id="accountPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={data.password}
                      onChange={(e) => updateData({ password: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.passwordPlaceholder')}
                      className="h-12 pl-12 pr-12 rounded-xl"
                    />
                    <IconButton
                      type="button"
                      variant="ghost"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(!showPassword)}
                      icon={showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 hover:bg-transparent"
                    />
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
                    <Input
                      id="accountConfirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={data.confirmPassword}
                      onChange={(e) => updateData({ confirmPassword: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.confirmPasswordPlaceholder')}
                      className={cn(
                        "h-12 pl-12 pr-12 rounded-xl",
                        data.confirmPassword.length > 0 && data.password !== data.confirmPassword && "border-danger/40 focus-visible:border-danger/40 focus-visible:ring-danger/20"
                      )}
                    />
                    <IconButton
                      type="button"
                      variant="ghost"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      icon={showConfirmPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 hover:bg-transparent"
                    />
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
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  size="lg"
                  onClick={handleBack}
                  className="rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('inmobiliaria.onboarding.register.back')}
                </Button>
                <span
                  className={cn('flex-1 flex', !isStep4Valid && !isSubmitting && 'cursor-not-allowed')}
                  onClick={() => {
                    if (!isStep4Valid && !isSubmitting) setDisabledHint(step4HintMessage)
                  }}
                >
                  <Button
                    type="submit"
                    disabled={!isStep4Valid || isSubmitting}
                    hideArrow
                    size="lg"
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="xs" variant="current" />
                        {t('inmobiliaria.onboarding.register.step4.creatingAccount')}
                      </>
                    ) : (
                      <>
                        {t('inmobiliaria.onboarding.register.step4.createAccount')}
                        <Rocket className="w-4 h-4" />
                      </>
                    )}
                  </Button>
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
