'use client'

import { LeasefyLogo } from '@/components/brand';
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/use-auth'
import { getUserHomeRoute } from '@/lib/auth/role-routes'
import { sanitizeReturnUrl } from '@/lib/utils'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Rocket, User, House, Shield, Clock, Lightning, Info, Eye, SealCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTenantOnboarding, TENANT_ONBOARDING_STEPS } from '@/lib/context/TenantOnboardingContext'
import { useI18n } from '@/lib/i18n'

interface TenantOnboardingShellProps {
  children: React.ReactNode
}

const STEP_ICONS = {
  user: User,
  home: House,
}

// Step-specific "why we need this" content
const STEP_WHY_CONTENT = {
  es: [
    {
      title: '¿Por qué necesitamos esto?',
      points: [
        { icon: SealCheck, text: 'Verificamos tu identidad para proteger a todos' },
        { icon: Shield, text: 'Tu información está encriptada y segura' },
        { icon: Lightning, text: 'Propietarios ven tu perfil verificado' },
      ],
    },
    {
      title: '¿Por qué preferencias?',
      points: [
        { icon: Eye, text: 'Te mostramos solo propiedades relevantes' },
        { icon: Clock, text: 'Ahorra tiempo en tu búsqueda' },
        { icon: Lightning, text: 'Recibe alertas personalizadas' },
      ],
    },
  ],
  en: [
    {
      title: 'Why do we need this?',
      points: [
        { icon: SealCheck, text: 'We verify your identity to protect everyone' },
        { icon: Shield, text: 'Your information is encrypted and secure' },
        { icon: Lightning, text: 'Landlords see your verified profile' },
      ],
    },
    {
      title: 'Why preferences?',
      points: [
        { icon: Eye, text: 'We show you only relevant properties' },
        { icon: Clock, text: 'Save time in your search' },
        { icon: Lightning, text: 'Receive personalized alerts' },
      ],
    },
  ],
}

export function TenantOnboardingShell({ children }: TenantOnboardingShellProps) {
  const router = useRouter()
  const returnUrl = useSearchParams().get('returnUrl')
  const { isAuthenticated, user } = useAuth()
  const { locale } = useI18n()
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    nextStep,
    submitOnboarding,
    isSubmitting,
    canProceed,
    progressPercentage,
  } = useTenantOnboarding()

  const currentStepConfig = TENANT_ONBOARDING_STEPS[currentStep - 1]
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps
  // Cap step index to valid range (in case localStorage has old step 4)
  const safeStepIndex = Math.min(currentStep - 1, STEP_WHY_CONTENT.es.length - 1)
  const whyContent = STEP_WHY_CONTENT[locale as 'es' | 'en']?.[safeStepIndex] || STEP_WHY_CONTENT.es[safeStepIndex]

  // Localized content
  const content = {
    es: {
      steps: [
        { label: 'Información básica', description: 'Nombre y contacto' },
        { label: 'Preferencias', description: 'Tu hogar ideal' },
      ],
      stepTitle: ['Cuéntanos sobre ti', 'Tu hogar ideal'],
      stepSubtitle: [
        'Esta información nos ayuda a personalizar tu experiencia',
        'Dinos qué estás buscando',
      ],
      stepOf: 'Paso',
      of: 'de',
      skip: 'Saltar por ahora',
      back: 'Atrás',
      continue: 'Continuar',
      submit: 'Completar perfil',
      saving: 'Guardando...',
      autoFloppyDisk: 'Tu progreso se guarda automáticamente',
    },
    en: {
      steps: [
        { label: 'Basic Information', description: 'Name and contact' },
        { label: 'Preferences', description: 'Your ideal home' },
      ],
      stepTitle: ['Tell us about you', 'Your ideal home'],
      stepSubtitle: [
        'This information helps us personalize your experience',
        'Tell us what you\'re looking for',
      ],
      stepOf: 'Step',
      of: 'of',
      skip: 'Skip for now',
      back: 'Back',
      continue: 'Continue',
      submit: 'Complete profile',
      saving: 'Saving...',
      autoFloppyDisk: 'Your progress is saved automatically',
    },
  }

  const t = content[locale as 'es' | 'en'] || content.es

  const handleNext = () => {
    if (isLastStep) {
      submitOnboarding()
        .then(() => {
          // Owner rule: after completing the wizard, land DIRECTLY on the
          // dashboard — no intermediate stop. submitOnboarding resolves AFTER
          // refreshUser(), so /inquilino renders with the fresh backend flag
          // (no empty-state flash). The wizard just provisioned a TENANT: if
          // this closure's `user` is still the pre-submit null, route as a
          // tenant rather than to the public landing.
          // `returnUrl` honrado: quien llega desde el recorrido de aprobación
          // venía a ver SU catálogo, no la home. Sin esto el onboarding lo
          // descartaba y el recorrido terminaba en otro lado del prometido.
          // `sanitizeReturnUrl` evita que un link externo lo mande a cualquier
          // parte; sin parámetro, el destino de siempre.
          const destino = getUserHomeRoute(user ?? { role: 'tenant' })
          router.push(sanitizeReturnUrl(returnUrl, destino))
        })
        .catch((err) => {
          // Stay in the wizard — the context already surfaced the error toast.
          console.error('[Onboarding] submitOnboarding failed:', err)
        })
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    router.push(isAuthenticated ? '/inquilino' : '/')
  }

  return (
    <div className="min-h-screen w-full bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <BrandHomeLink className="flex items-center">
              <LeasefyLogo size={28} tone="brand" />
            </BrandHomeLink>

            {/* Progress - Mobile */}
            <div className="sm:hidden text-sm font-mono tabular-nums text-fg-muted">
              {t.stepOf} {currentStep} {t.of} {totalSteps}
            </div>

            {/* Skip button */}
            <Button
              variant="link"
              size="sm"
              onClick={handleSkip}
              hideArrow
              className="text-fg-muted hover:text-fg"
            >
              {t.skip}
            </Button>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="sm:hidden h-1 bg-surface-muted">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main Content - Centered 3-column layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Left Column - Steps (Hidden on mobile) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28">
              <nav className="space-y-1">
                {TENANT_ONBOARDING_STEPS.map(({ id: step }) => {
                  const Icon = STEP_ICONS[TENANT_ONBOARDING_STEPS[step - 1].icon as keyof typeof STEP_ICONS] || User
                  const isCompleted = completedSteps.includes(step)
                  const isCurrent = step === currentStep
                  const isClickable = isCompleted || isCurrent || step === 1

                  return (
                    <button
                      key={step}
                      onClick={() => isClickable && goToStep(step)}
                      disabled={!isClickable}
                      className={cn(
                        'w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200',
                        isCurrent
                          ? 'bg-surface border border-border'
                          : isCompleted
                          ? 'hover:bg-surface-muted'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {/* Step Number/Check — Cadence: cobalt active, success done, mono numeral */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                          isCurrent
                            ? 'bg-primary text-primary-fg'
                            : isCompleted
                            ? 'bg-success-soft text-success'
                            : 'bg-surface-muted text-fg-subtle'
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="w-5 h-5" weight="bold" />
                        ) : (
                          <span className="text-sm font-mono font-semibold tabular-nums">{step}</span>
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'font-medium text-sm',
                            isCurrent
                              ? 'text-fg'
                              : 'text-fg-muted'
                          )}
                        >
                          {t.steps[step - 1].label}
                        </p>
                        <p className="text-xs text-fg-subtle mt-0.5">
                          {t.steps[step - 1].description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </nav>

              {/* Auto-save indicator */}
              <div className="mt-6 flex items-center gap-2 text-fg-muted px-4">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs">{t.autoFloppyDisk}</span>
              </div>
            </div>
          </aside>

          {/* Center Column - Form */}
          <div className="flex-1 max-w-xl">
            <div className="bg-surface rounded-[22px] border border-border overflow-hidden">
              {/* Step Header */}
              <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-border-faint">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`header-${currentStep}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Mobile step indicator */}
                    <div className="flex items-center gap-2 mb-4 lg:hidden">
                      {TENANT_ONBOARDING_STEPS.map(({ id: step }) => (
                        <div
                          key={step}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            step === currentStep
                              ? 'bg-primary'
                              : step < currentStep
                              ? 'bg-success'
                              : 'bg-border'
                          )}
                        />
                      ))}
                    </div>

                    <h1 className="text-xl sm:text-2xl font-semibold text-fg tracking-tight">
                      {t.stepTitle[currentStep - 1]}
                    </h1>
                    <p className="text-fg-muted mt-1">
                      {t.stepSubtitle[currentStep - 1]}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Form Content */}
              <div className="px-6 sm:px-8 py-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer Compass */}
              <div className="px-6 sm:px-8 py-5 bg-bg border-t border-border-faint">
                <div className="flex items-center justify-between">
                  {/* Back button */}
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={isFirstStep || isSubmitting}
                    hideArrow
                    className={cn((isFirstStep || isSubmitting) && 'opacity-0 pointer-events-none')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t.back}
                  </Button>

                  {/* Next/Submit button */}
                  {isSubmitting ? (
                    <Button isLoading disabled>
                      {t.saving}
                    </Button>
                  ) : isLastStep ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed}
                      hideArrow
                    >
                      {t.submit}
                      <Rocket className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed}
                    >
                      {t.continue}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Why we need this (Hidden on mobile) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`why-${currentStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-primary-soft rounded-[14px] border border-primary/30 p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                      <Info className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-fg text-sm">
                      {whyContent.title}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {whyContent.points.map((point, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                          <point.icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-sm text-fg-muted leading-relaxed">
                          {point.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Trust badge */}
              <div className="mt-6 flex items-center gap-3 px-2">
                <Shield className="w-5 h-5 text-success" />
                <p className="text-xs text-fg-muted">
                  {locale === 'es'
                    ? 'Datos protegidos con encriptación de nivel bancario'
                    : 'Data protected with bank-level encryption'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
