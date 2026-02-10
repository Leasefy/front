'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, SpinnerGap, Shield, Storefront, User, Phone, Envelope, ChatCircle, MapPin, Buildings, Rocket, Briefcase, ChartLineUp, Users, House, Wrench, Scales, Eye, EyeSlash, Lock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'

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
  const { register, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { t } = useTranslation()
  const returnUrl = searchParams.get('returnUrl')

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
      // Register the user
      const result = await register(data.contactPerson, data.email, data.password, 'agency')

      if (!result.success) {
        setAuthError(result.error || t('inmobiliaria.onboarding.register.errors.createAccount'))
        setIsSubmitting(false)
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-indigo-600" strokeWidth={2.5} />
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
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.ownerManagement')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Buildings className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.unlimitedPortfolio')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <ChartLineUp className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs text-neutral-600">{t('inmobiliaria.onboarding.register.success.reportsAnalytics')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-rose-600" />
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <svg viewBox="0 0 207 60" className="h-6 w-auto text-neutral-900" fill="none">
                <path d="M5 51L29 27L47 45V15" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M65.52 47V15.32H68.05V44.536H83.45V47H65.52ZM94.7989 47.66C92.5256 47.66 90.5602 47.154 88.9029 46.142C87.2456 45.1153 85.9622 43.6707 85.0529 41.808C84.1436 39.9307 83.6889 37.716 83.6889 35.164C83.6889 32.568 84.1362 30.3313 85.0309 28.454C85.9402 26.562 87.2162 25.11 88.8589 24.098C90.5162 23.086 92.4816 22.58 94.7549 22.58C97.0576 22.58 99.0229 23.108 100.651 24.164C102.294 25.2053 103.54 26.716 104.391 28.696C105.256 30.676 105.667 33.0593 105.623 35.846H102.983V34.966C102.91 31.71 102.176 29.2313 100.783 27.53C99.3896 25.8287 97.3949 24.978 94.7989 24.978C92.1149 24.978 90.0396 25.8653 88.5729 27.64C87.1209 29.4 86.3949 31.8933 86.3949 35.12C86.3949 38.3173 87.1209 40.796 88.5729 42.556C90.0396 44.316 92.1002 45.196 94.7549 45.196C96.5882 45.196 98.1869 44.7707 99.5509 43.92C100.93 43.0547 102.022 41.8227 102.829 40.224L105.117 41.236C104.164 43.2893 102.785 44.8733 100.981 45.988C99.1769 47.1027 97.1162 47.66 94.7989 47.66ZM85.4269 35.846V33.558H104.193V35.846H85.4269ZM114.724 47.66C112.89 47.66 111.365 47.3373 110.148 46.692C108.945 46.0467 108.043 45.196 107.442 44.14C106.84 43.0693 106.54 41.9107 106.54 40.664C106.54 39.3147 106.818 38.1853 107.376 37.276C107.948 36.3667 108.703 35.6333 109.642 35.076C110.595 34.5187 111.644 34.1007 112.788 33.822C114.093 33.5287 115.501 33.2793 117.012 33.074C118.522 32.854 119.96 32.6633 121.324 32.502C122.702 32.3407 123.824 32.2013 124.69 32.084L123.766 32.634C123.824 30.0673 123.34 28.1607 122.314 26.914C121.302 25.6527 119.512 25.022 116.946 25.022C115.142 25.022 113.653 25.4327 112.48 26.254C111.321 27.0607 110.507 28.3147 110.038 30.016L107.442 29.29C107.984 27.134 109.077 25.4767 110.72 24.318C112.362 23.1593 114.467 22.58 117.034 22.58C119.219 22.58 121.052 23.0053 122.534 23.856C124.03 24.7067 125.071 25.902 125.658 27.442C125.907 28.0727 126.076 28.8133 126.164 29.664C126.252 30.5 126.296 31.3433 126.296 32.194V47H123.986V40.752L124.844 40.972C124.125 43.1133 122.871 44.7633 121.082 45.922C119.292 47.0807 117.173 47.66 114.724 47.66ZM114.856 45.328C116.469 45.328 117.884 45.042 119.102 44.47C120.319 43.8833 121.302 43.0693 122.05 42.028C122.812 40.972 123.296 39.7327 123.502 38.31C123.648 37.518 123.729 36.66 123.744 35.736C123.758 34.812 123.766 34.13 123.766 33.69L124.866 34.394C123.912 34.5113 122.768 34.636 121.434 34.768C120.114 34.9 118.764 35.0613 117.386 35.252C116.007 35.4427 114.76 35.6847 113.646 35.978C112.956 36.1687 112.26 36.4473 111.556 36.814C110.866 37.166 110.287 37.6573 109.818 38.288C109.363 38.9187 109.136 39.718 109.136 40.686C109.136 41.4047 109.312 42.1233 109.664 42.842C110.03 43.5607 110.632 44.1547 111.468 44.624C112.304 45.0933 113.433 45.328 114.856 45.328ZM138.586 47.616C135.843 47.616 133.577 47.0367 131.788 45.878C130.013 44.7193 128.913 43.106 128.488 41.038L131.084 40.598C131.451 42.006 132.316 43.128 133.68 43.964C135.044 44.8 136.716 45.218 138.696 45.218C140.661 45.218 142.223 44.8 143.382 43.964C144.541 43.128 145.12 41.984 145.12 40.532C145.12 39.74 144.937 39.0947 144.57 38.596C144.218 38.0827 143.514 37.6133 142.458 37.188C141.402 36.7627 139.833 36.264 137.75 35.692C135.55 35.1053 133.827 34.5187 132.58 33.932C131.348 33.3453 130.475 32.678 129.962 31.93C129.463 31.182 129.214 30.2653 129.214 29.18C129.214 27.8747 129.588 26.7307 130.336 25.748C131.084 24.7507 132.125 23.9733 133.46 23.416C134.809 22.8587 136.364 22.58 138.124 22.58C139.884 22.58 141.468 22.8733 142.876 23.46C144.284 24.032 145.421 24.8387 146.286 25.88C147.151 26.9067 147.65 28.102 147.782 29.466L145.186 29.95C144.937 28.4247 144.167 27.222 142.876 26.342C141.585 25.4473 139.972 24.9927 138.036 24.978C136.203 24.9487 134.707 25.3153 133.548 26.078C132.389 26.826 131.81 27.816 131.81 29.048C131.81 29.752 132.008 30.3533 132.404 30.852C132.815 31.336 133.533 31.7833 134.56 32.194C135.587 32.6047 137.039 33.0447 138.916 33.514C141.204 34.1007 142.986 34.702 144.262 35.318C145.553 35.934 146.462 36.66 146.99 37.496C147.518 38.3173 147.782 39.3367 147.782 40.554C147.782 42.754 146.961 44.4847 145.318 45.746C143.69 46.9927 141.446 47.616 138.586 47.616ZM160.257 47.66C157.984 47.66 156.019 47.154 154.361 46.142C152.704 45.1153 151.421 43.6707 150.511 41.808C149.602 39.9307 149.147 37.716 149.147 35.164C149.147 32.568 149.595 30.3313 150.489 28.454C151.399 26.562 152.675 25.11 154.317 24.098C155.975 23.086 157.94 22.58 160.213 22.58C162.516 22.58 164.481 23.108 166.109 24.164C167.752 25.2053 168.999 26.716 169.849 28.696C170.715 30.676 171.125 33.0593 171.081 35.846H168.441V34.966C168.368 31.71 167.635 29.2313 166.241 27.53C164.848 25.8287 162.853 24.978 160.257 24.978C157.573 24.978 155.498 25.8653 154.031 27.64C152.579 29.4 151.853 31.8933 151.853 35.12C151.853 38.3173 152.579 40.796 154.031 42.556C155.498 44.316 157.559 45.196 160.213 45.196C162.047 45.196 163.645 44.7707 165.009 43.92C166.388 43.0547 167.481 41.8227 168.287 40.224L170.575 41.236C169.622 43.2893 168.243 44.8733 166.439 45.988C164.635 47.1027 162.575 47.66 160.257 47.66ZM150.885 35.846V33.558H169.651V35.846H150.885ZM176.212 47V21.018C176.212 20.402 176.241 19.8153 176.3 19.258C176.373 18.7007 176.513 18.1727 176.718 17.674C176.938 17.1753 177.246 16.706 177.642 16.266C178.053 15.826 178.507 15.4887 179.006 15.254C179.519 15.0193 180.062 14.8653 180.634 14.792C181.206 14.704 181.807 14.66 182.438 14.66H185.496V16.86H182.658C181.353 16.86 180.37 17.1753 179.71 17.806C179.065 18.4367 178.742 19.478 178.742 20.93V47H176.212ZM171.988 25.55V23.24H185.496V25.55H171.988ZM190.278 57.56L194.898 45.13L194.942 48.826L184.536 23.24H187.242L196.174 45.46H194.766L202.884 23.24H205.546L192.918 57.56H190.278Z" fill="currentColor"/>
              </svg>
            </Link>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {(fromPublish ? [1, 4] : [1, 2, 3, 4]).map((s, idx, arr) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                      step > s ? "bg-indigo-600 text-white" :
                      step === s ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-400"
                    )}>
                      {step > s ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={cn(
                        "w-6 h-0.5 transition-colors",
                        step > s ? "bg-indigo-600" : "bg-neutral-200"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium mb-4">
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

              <div className="space-y-5">
                {/* Agency Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.agencyName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.agencyName}
                    onChange={(e) => updateData({ agencyName: e.target.value })}
                    placeholder={t('inmobiliaria.onboarding.register.step1.agencyNamePlaceholder')}
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* NIT */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.nit')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    type="text"
                    value={data.nit}
                    onChange={(e) => updateData({ nit: e.target.value })}
                    placeholder="900.123.456-7"
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.contactPerson')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.contactPerson}
                    onChange={(e) => updateData({ contactPerson: e.target.value })}
                    placeholder={t('inmobiliaria.onboarding.register.step1.contactPersonPlaceholder')}
                    className="w-full px-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step1.phone')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
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
                        ? "border-amber-300 focus:border-amber-400"
                        : "border-neutral-200 focus:border-neutral-400"
                    )}
                  />
                  <p className="mt-1.5 text-xs text-neutral-400">
                    {t('inmobiliaria.onboarding.register.step1.phoneHint')}
                  </p>
                  {data.phone && data.phone.replace(/\s/g, '').length > 0 && data.phone.replace(/\s/g, '').length < 10 && (
                    <p className="mt-1 text-xs text-amber-600">
                      {t('inmobiliaria.onboarding.register.step1.phoneValidation')}
                    </p>
                  )}
                </div>

              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!isStep1Valid}
                className={cn(
                  "w-full mt-10 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                  isStep1Valid
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                )}
              >
                {t('inmobiliaria.onboarding.register.continue')}
                <ArrowRight className="w-4 h-4" />
              </button>
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium mb-4">
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

              <div className="space-y-6">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step2.city')} <span className="text-red-500">*</span>
                  </label>
                  <select
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
                    {t('inmobiliaria.onboarding.register.step2.portfolioSize')} <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step2.yearsInBusiness')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    type="number"
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
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                    isStep2Valid
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-sm font-medium mb-4">
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

              <div className="space-y-6">
                {/* Services Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    {t('inmobiliaria.onboarding.register.step3.mainServices')} <span className="text-red-500">*</span>
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
                              ? "border-indigo-600 bg-indigo-50"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                            isSelected ? "bg-indigo-100" : "bg-neutral-100"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5 transition-colors",
                              isSelected ? "text-indigo-600" : "text-neutral-500"
                            )} />
                          </div>
                          <span className={cn(
                            "font-medium",
                            isSelected ? "text-indigo-900" : "text-neutral-600"
                          )}>
                            {service.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center"
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
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-indigo-600" />
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
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep3Valid}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                    isStep3Valid
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  {t('inmobiliaria.onboarding.register.continue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium mb-4">
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

              <div className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step4.email')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.emailPlaceholder')}
                      className="w-full pl-12 pr-4 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step4.password')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={data.password}
                      onChange={(e) => updateData({ password: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.passwordPlaceholder')}
                      className="w-full pl-12 pr-12 py-3.5 text-base rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
                    <p className="mt-1.5 text-xs text-amber-600">
                      {t('validation.password')}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('inmobiliaria.onboarding.register.step4.confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={data.confirmPassword}
                      onChange={(e) => updateData({ confirmPassword: e.target.value })}
                      placeholder={t('inmobiliaria.onboarding.register.step4.confirmPasswordPlaceholder')}
                      className={cn(
                        "w-full pl-12 pr-12 py-3.5 text-base rounded-xl border bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all",
                        data.confirmPassword.length > 0 && data.password !== data.confirmPassword
                          ? "border-red-300 focus:border-red-400"
                          : "border-neutral-200 focus:border-indigo-500"
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
                    <p className="mt-1.5 text-xs text-red-500">
                      {t('validation.passwordMatch')}
                    </p>
                  )}
                </div>

                {/* Error message */}
                {authError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-600">{authError}</p>
                  </div>
                )}

                {/* Terms notice */}
                <p className="text-xs text-neutral-400 text-center">
                  {t('inmobiliaria.onboarding.register.step4.termsPrefix')}{' '}
                  <Link href="/terminos" className="text-indigo-600 hover:underline">
                    {t('inmobiliaria.onboarding.register.step4.termsOfService')}
                  </Link>{' '}
                  {t('common.and')}{' '}
                  <Link href="/privacidad" className="text-indigo-600 hover:underline">
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
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isStep4Valid || isSubmitting}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                    isStep4Valid && !isSubmitting
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function OnboardingInmobiliariaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OnboardingInmobiliariaContent />
    </Suspense>
  )
}
