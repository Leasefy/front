'use client'

import { LeasefyLogo } from '@/components/brand';
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
    <div className="min-h-screen bg-neutral-100">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <LeasefyLogo size={28} tone="brand" />
            </Link>

            {/* Desktop: Step indicator + Skip */}
            <div className="hidden lg:flex items-center gap-6">
              <span className="text-sm text-neutral-500">
                Paso {currentStep} de {totalSteps}
              </span>
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                Saltar por ahora
              </button>
            </div>

            {/* Mobile: Close button */}
            <button
              type="button"
              onClick={handleSkip}
              className="lg:hidden p-2 -mr-2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Progress Bar */}
      <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#1A40FF]">
            Paso {currentStep} de {totalSteps}
          </span>
          <span className="text-xs text-neutral-500">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#1A40FF]"
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto lg:flex lg:gap-0 min-h-[calc(100vh-64px)]">
        {/* Left Sidebar - Step Compass */}
        <aside className="hidden lg:block w-72 xl:w-80 bg-white border-r border-neutral-200 p-6 xl:p-8">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Progreso
              </span>
              <span className="text-xs font-semibold text-[#1A40FF]">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#1A40FF]"
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
                      ? 'bg-[#EEF1FF] border border-[#1A40FF]/30'
                      : 'hover:bg-neutral-50'
                  )}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
                      isCompleted && !isCurrent
                        ? 'bg-[#2C7A53] text-white'
                        : isCurrent
                        ? 'bg-[#1A40FF] text-white uppercase tracking-wide font-mono'
                        : 'bg-neutral-100 text-neutral-400'
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
                          ? 'text-[#1A40FF]'
                          : isCompleted
                          ? 'text-[#2C7A53]'
                          : 'text-neutral-700'
                      )}
                    >
                      {stepContent?.label}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                      {stepContent?.description}
                    </p>
                  </div>

                  {/* Arrow for current */}
                  {isCurrent && (
                    <CaretRight className="w-4 h-4 text-[#1A40FF] flex-shrink-0 mt-1" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Help link */}
          <div className="mt-8 pt-6 border-t border-neutral-100">
            <Link
              href="/ayuda"
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <Question className="w-4 h-4" />
              ¿Necesitas ayuda?
            </Link>
          </div>
        </aside>

        {/* Center - Form Content */}
        <main className="flex-1 bg-white lg:border-r lg:border-neutral-200">
          <div className="max-w-xl mx-auto px-4 py-8 lg:px-12 lg:py-12">
            {/* Step Header */}
            <motion.div
              key={`header-${currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <p className="text-xs font-semibold text-[#1A40FF] uppercase tracking-wider mb-2">
                Paso {currentStep} de {totalSteps}
              </p>
              <h1 className="text-2xl lg:text-3xl font-semibold text-neutral-900 tracking-tight">
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
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-neutral-100">
              {/* Back button */}
              <button
                type="button"
                onClick={prevStep}
                disabled={isFirstStep || isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium',
                  'rounded-md border border-neutral-200 bg-white',
                  'text-neutral-600 hover:text-neutral-900 hover:border-neutral-300',
                  'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                  isFirstStep && 'invisible'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>

              {/* Next/Submit button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold',
                  'rounded-md bg-neutral-900 text-white',
                  'hover:bg-neutral-800 transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
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
            </div>

            {/* Auto-save indicator */}
            <div className="flex items-center justify-center gap-2 mt-6 text-neutral-400">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2C7A53]" />
              <p className="text-xs">Tu progreso se guarda automáticamente</p>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Why we need this */}
        <aside className="hidden xl:block w-80 bg-neutral-50 p-8">
          <motion.div
            key={`why-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Why section */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <Question className="w-4 h-4 text-[#1A40FF]" />
                ¿Por qué lo necesitamos?
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {whyContent[currentStep - 1]}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200"
                >
                  <div className="w-9 h-9 rounded-md bg-[#EEF1FF] flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-4 h-4 text-[#1A40FF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{benefit.label}</p>
                    <p className="text-xs text-neutral-500">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badge */}
            <div className="mt-8 p-4 bg-[#E8F3EC] rounded-xl border border-[#2C7A53]/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#2C7A53]" />
                <p className="text-sm font-medium text-[#2C7A53]">Datos seguros</p>
              </div>
              <p className="text-xs text-[#2C7A53]">
                Tu información está encriptada y nunca se comparte sin tu permiso.
              </p>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  )
}
