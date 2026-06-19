'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, SpinnerGap, Rocket, User, House, Users, CreditCard, X, Shield, Money, SealCheck, Question, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useOnboarding, ONBOARDING_STEPS } from '@/lib/context/OnboardingContext'

interface OnboardingShellProps {
  children: React.ReactNode
}

const STEP_ICONS = {
  user: User,
  home: House,
  users: Users,
  'credit-card': CreditCard,
}

export function OnboardingShell({ children }: OnboardingShellProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
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
  } = useOnboarding()

  const currentStepConfig = ONBOARDING_STEPS[currentStep - 1]
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  // Shown when the user taps the disabled CTA: explains why it is disabled
  const [disabledHint, setDisabledHint] = useState(false)

  // Clear the disabled-CTA hint when changing steps or when the form becomes valid
  useEffect(() => {
    setDisabledHint(false)
  }, [currentStep])

  // Step content
  const steps = [
    { label: 'Bienvenida', description: 'Cuéntanos sobre ti' },
    { label: 'Tu propiedad', description: 'Describe tu inmueble' },
    { label: 'Inquilino ideal', description: 'Define tu candidato perfecto' },
    { label: 'Cobros', description: 'Configura los pagos' },
  ]

  const stepDescriptions = [
    'Configura tu perfil de propietario',
    'Agrega tu primera propiedad',
    'Define el perfil de inquilino ideal',
    'Configura cómo recibir pagos',
  ]

  // Why we need this content
  const whyContent = [
    'Tu información nos ayuda a personalizar tu experiencia y conectarte con inquilinos verificados que cumplan tus requisitos.',
    'Conocer los detalles de tu propiedad nos permite mostrarla a los inquilinos adecuados y sugerir precios competitivos.',
    'Definir tu inquilino ideal nos ayuda a filtrar candidatos y mostrarte solo los que cumplen tus criterios.',
    'Configurar tus datos de cobro permite recibir el arriendo automáticamente cada mes, sin preocupaciones.',
  ]

  // Benefits
  const benefits = [
    { icon: SealCheck, label: 'Inquilinos verificados', desc: 'Candidatos evaluados' },
    { icon: Shield, label: 'Protección garantizada', desc: 'Seguro incluido' },
    { icon: Money, label: 'Cobros automáticos', desc: 'Pago puntual' },
  ]

  const handleNext = () => {
    if (isLastStep) {
      submitOnboarding()
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    router.push(isAuthenticated ? '/panel' : '/')
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <svg viewBox="0 0 207 60" className="h-7 w-auto text-neutral-900" fill="none">
                <path d="M5 51L29 27L47 45V15" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M65.52 47V15.32H68.05V44.536H83.45V47H65.52ZM94.7989 47.66C92.5256 47.66 90.5602 47.154 88.9029 46.142C87.2456 45.1153 85.9622 43.6707 85.0529 41.808C84.1436 39.9307 83.6889 37.716 83.6889 35.164C83.6889 32.568 84.1362 30.3313 85.0309 28.454C85.9402 26.562 87.2162 25.11 88.8589 24.098C90.5162 23.086 92.4816 22.58 94.7549 22.58C97.0576 22.58 99.0229 23.108 100.651 24.164C102.294 25.2053 103.54 26.716 104.391 28.696C105.256 30.676 105.667 33.0593 105.623 35.846H102.983V34.966C102.91 31.71 102.176 29.2313 100.783 27.53C99.3896 25.8287 97.3949 24.978 94.7989 24.978C92.1149 24.978 90.0396 25.8653 88.5729 27.64C87.1209 29.4 86.3949 31.8933 86.3949 35.12C86.3949 38.3173 87.1209 40.796 88.5729 42.556C90.0396 44.316 92.1002 45.196 94.7549 45.196C96.5882 45.196 98.1869 44.7707 99.5509 43.92C100.93 43.0547 102.022 41.8227 102.829 40.224L105.117 41.236C104.164 43.2893 102.785 44.8733 100.981 45.988C99.1769 47.1027 97.1162 47.66 94.7989 47.66ZM85.4269 35.846V33.558H104.193V35.846H85.4269ZM114.724 47.66C112.89 47.66 111.365 47.3373 110.148 46.692C108.945 46.0467 108.043 45.196 107.442 44.14C106.84 43.0693 106.54 41.9107 106.54 40.664C106.54 39.3147 106.818 38.1853 107.376 37.276C107.948 36.3667 108.703 35.6333 109.642 35.076C110.595 34.5187 111.644 34.1007 112.788 33.822C114.093 33.5287 115.501 33.2793 117.012 33.074C118.522 32.854 119.96 32.6633 121.324 32.502C122.702 32.3407 123.824 32.2013 124.69 32.084L123.766 32.634C123.824 30.0673 123.34 28.1607 122.314 26.914C121.302 25.6527 119.512 25.022 116.946 25.022C115.142 25.022 113.653 25.4327 112.48 26.254C111.321 27.0607 110.507 28.3147 110.038 30.016L107.442 29.29C107.984 27.134 109.077 25.4767 110.72 24.318C112.362 23.1593 114.467 22.58 117.034 22.58C119.219 22.58 121.052 23.0053 122.534 23.856C124.03 24.7067 125.071 25.902 125.658 27.442C125.907 28.0727 126.076 28.8133 126.164 29.664C126.252 30.5 126.296 31.3433 126.296 32.194V47H123.986V40.752L124.844 40.972C124.125 43.1133 122.871 44.7633 121.082 45.922C119.292 47.0807 117.173 47.66 114.724 47.66ZM114.856 45.328C116.469 45.328 117.884 45.042 119.102 44.47C120.319 43.8833 121.302 43.0693 122.05 42.028C122.812 40.972 123.296 39.7327 123.502 38.31C123.648 37.518 123.729 36.66 123.744 35.736C123.758 34.812 123.766 34.13 123.766 33.69L124.866 34.394C123.912 34.5113 122.768 34.636 121.434 34.768C120.114 34.9 118.764 35.0613 117.386 35.252C116.007 35.4427 114.76 35.6847 113.646 35.978C112.956 36.1687 112.26 36.4473 111.556 36.814C110.866 37.166 110.287 37.6573 109.818 38.288C109.363 38.9187 109.136 39.718 109.136 40.686C109.136 41.4047 109.312 42.1233 109.664 42.842C110.03 43.5607 110.632 44.1547 111.468 44.624C112.304 45.0933 113.433 45.328 114.856 45.328ZM138.586 47.616C135.843 47.616 133.577 47.0367 131.788 45.878C130.013 44.7193 128.913 43.106 128.488 41.038L131.084 40.598C131.451 42.006 132.316 43.128 133.68 43.964C135.044 44.8 136.716 45.218 138.696 45.218C140.661 45.218 142.223 44.8 143.382 43.964C144.541 43.128 145.12 41.984 145.12 40.532C145.12 39.74 144.937 39.0947 144.57 38.596C144.218 38.0827 143.514 37.6133 142.458 37.188C141.402 36.7627 139.833 36.264 137.75 35.692C135.55 35.1053 133.827 34.5187 132.58 33.932C131.348 33.3453 130.475 32.678 129.962 31.93C129.463 31.182 129.214 30.2653 129.214 29.18C129.214 27.8747 129.588 26.7307 130.336 25.748C131.084 24.7507 132.125 23.9733 133.46 23.416C134.809 22.8587 136.364 22.58 138.124 22.58C139.884 22.58 141.468 22.8733 142.876 23.46C144.284 24.032 145.421 24.8387 146.286 25.88C147.151 26.9067 147.65 28.102 147.782 29.466L145.186 29.95C144.937 28.4247 144.167 27.222 142.876 26.342C141.585 25.4473 139.972 24.9927 138.036 24.978C136.203 24.9487 134.707 25.3153 133.548 26.078C132.389 26.826 131.81 27.816 131.81 29.048C131.81 29.752 132.008 30.3533 132.404 30.852C132.815 31.336 133.533 31.7833 134.56 32.194C135.587 32.6047 137.039 33.0447 138.916 33.514C141.204 34.1007 142.986 34.702 144.262 35.318C145.553 35.934 146.462 36.66 146.99 37.496C147.518 38.3173 147.782 39.3367 147.782 40.554C147.782 42.754 146.961 44.4847 145.318 45.746C143.69 46.9927 141.446 47.616 138.586 47.616ZM160.257 47.66C157.984 47.66 156.019 47.154 154.361 46.142C152.704 45.1153 151.421 43.6707 150.511 41.808C149.602 39.9307 149.147 37.716 149.147 35.164C149.147 32.568 149.595 30.3313 150.489 28.454C151.399 26.562 152.675 25.11 154.317 24.098C155.975 23.086 157.94 22.58 160.213 22.58C162.516 22.58 164.481 23.108 166.109 24.164C167.752 25.2053 168.999 26.716 169.849 28.696C170.715 30.676 171.125 33.0593 171.081 35.846H168.441V34.966C168.368 31.71 167.635 29.2313 166.241 27.53C164.848 25.8287 162.853 24.978 160.257 24.978C157.573 24.978 155.498 25.8653 154.031 27.64C152.579 29.4 151.853 31.8933 151.853 35.12C151.853 38.3173 152.579 40.796 154.031 42.556C155.498 44.316 157.559 45.196 160.213 45.196C162.047 45.196 163.645 44.7707 165.009 43.92C166.388 43.0547 167.481 41.8227 168.287 40.224L170.575 41.236C169.622 43.2893 168.243 44.8733 166.439 45.988C164.635 47.1027 162.575 47.66 160.257 47.66ZM150.885 35.846V33.558H169.651V35.846H150.885ZM176.212 47V21.018C176.212 20.402 176.241 19.8153 176.3 19.258C176.373 18.7007 176.513 18.1727 176.718 17.674C176.938 17.1753 177.246 16.706 177.642 16.266C178.053 15.826 178.507 15.4887 179.006 15.254C179.519 15.0193 180.062 14.8653 180.634 14.792C181.206 14.704 181.807 14.66 182.438 14.66H185.496V16.86H182.658C181.353 16.86 180.37 17.1753 179.71 17.806C179.065 18.4367 178.742 19.478 178.742 20.93V47H176.212ZM171.988 25.55V23.24H185.496V25.55H171.988ZM190.278 57.56L194.898 45.13L194.942 48.826L184.536 23.24H187.242L196.174 45.46H194.766L202.884 23.24H205.546L192.918 57.56H190.278Z" fill="currentColor"/>
              </svg>
            </Link>

            {/* Desktop: Step indicator + Skip */}
            <div className="hidden lg:flex items-center gap-6">
              <span className="text-sm text-stone-500">
                Paso {currentStep} de {totalSteps}
              </span>
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                Saltar por ahora
              </button>
            </div>

            {/* Mobile: Close button */}
            <button
              type="button"
              onClick={handleSkip}
              className="lg:hidden p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Progress Bar */}
      <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-indigo-600">
            Paso {currentStep} de {totalSteps}
          </span>
          <span className="text-xs text-stone-500">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-600"
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto lg:flex lg:gap-0 min-h-[calc(100dvh-64px)]">
        {/* Left Sidebar - Step Compass */}
        <aside className="hidden lg:block w-72 xl:w-80 bg-white border-r border-stone-200 p-6 xl:p-8">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Progreso
              </span>
              <span className="text-xs font-semibold text-indigo-600">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-600"
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Vertical Step Compass */}
          <nav className="space-y-1">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[step.icon as keyof typeof STEP_ICONS] || User
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = step.id === currentStep
              const isClickable = isCompleted || isCurrent || step.id === 1
              const stepContent = steps[index]

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => isClickable && goToStep(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200',
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                    isCurrent
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-stone-50'
                  )}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      isCompleted && !isCurrent
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono'
                        : 'bg-stone-100 text-stone-400'
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent
                          ? 'text-indigo-900'
                          : isCompleted
                          ? 'text-emerald-700'
                          : 'text-stone-700'
                      )}
                    >
                      {stepContent?.label}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      {stepContent?.description}
                    </p>
                  </div>

                  {/* Arrow for current */}
                  {isCurrent && (
                    <CaretRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-1" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Help link */}
          <div className="mt-8 pt-6 border-t border-stone-100">
            <Link
              href="/ayuda"
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              <Question className="w-4 h-4" />
              ¿Necesitas ayuda?
            </Link>
          </div>
        </aside>

        {/* Center - Form Content */}
        <main className="flex-1 bg-white lg:border-r lg:border-stone-200">
          <div className="max-w-xl mx-auto px-4 py-8 lg:px-12 lg:py-12">
            {/* Step Header */}
            <motion.div
              key={`header-${currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                Paso {currentStep} de {totalSteps}
              </p>
              <h1 className="text-2xl lg:text-3xl font-semibold text-stone-900 tracking-tight">
                {stepDescriptions[currentStep - 1]}
              </h1>
            </motion.div>

            {/* Form Content */}
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

            {/* Compass */}
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-stone-100">
              {/* Back button */}
              <button
                type="button"
                onClick={prevStep}
                disabled={isFirstStep || isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium',
                  'rounded-lg border border-stone-200 bg-white',
                  'text-stone-600 hover:text-stone-900 hover:border-stone-300',
                  'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                  isFirstStep && 'invisible'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>

              {/* Next/Submit button */}
              <span
                className={cn('inline-flex', !canProceed && !isSubmitting && 'cursor-not-allowed')}
                onClick={() => {
                  if (!canProceed && !isSubmitting) setDisabledHint(true)
                }}
              >
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed || isSubmitting}
                  className={cn(
                    'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold',
                    'rounded-lg bg-neutral-900 text-white',
                    'hover:bg-neutral-800 transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : isLastStep ? (
                    <>
                      Comenzar
                      <Rocket className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </span>
            </div>

            {/* Disabled-CTA hint */}
            {disabledHint && !canProceed && (
              <p role="status" className="mt-3 text-xs text-amber-600 text-right">
                Completa los campos obligatorios para continuar
              </p>
            )}

            {/* Auto-save indicator */}
            <div className="flex items-center justify-center gap-2 mt-6 text-stone-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs">Tu progreso se guarda automáticamente</p>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Why we need this */}
        <aside className="hidden xl:block w-80 bg-stone-50 p-8">
          <motion.div
            key={`why-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Why section */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Question className="w-4 h-4 text-indigo-600" />
                ¿Por qué lo necesitamos?
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                {whyContent[currentStep - 1]}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-900">{benefit.label}</p>
                    <p className="text-xs text-stone-500">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badge */}
            <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">Datos seguros</p>
              </div>
              <p className="text-xs text-emerald-700">
                Tu información está encriptada y nunca se comparte sin tu permiso.
              </p>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  )
}
