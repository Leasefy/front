'use client'

import { useState, useEffect } from 'react'
import { LeasefyLogo } from '@/components/brand'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Rocket, User, House, Users, CreditCard, X, Shield, Money, SealCheck, Question, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
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
    <div className="min-h-screen bg-bg">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <LeasefyLogo size={28} tone="brand" />
            </Link>

            {/* Desktop: Step indicator + Skip */}
            <div className="hidden lg:flex items-center gap-6">
              <span className="text-sm font-mono tabular-nums text-fg-muted">
                Paso {currentStep} de {totalSteps}
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={handleSkip}
                hideArrow
                className="text-fg-muted hover:text-fg"
              >
                Saltar por ahora
              </Button>
            </div>

            {/* Mobile: Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              aria-label="Cerrar"
              className="lg:hidden -mr-2 text-fg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Progress Bar */}
      <div className="lg:hidden bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono tabular-nums font-medium text-primary">
            Paso {currentStep} de {totalSteps}
          </span>
          <span className="text-xs text-fg-muted">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto lg:flex lg:gap-0 min-h-[calc(100dvh-64px)]">
        {/* Left Sidebar - Step Compass */}
        <aside className="hidden lg:block w-72 xl:w-80 bg-surface border-r border-border p-6 xl:p-8">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <MonoLabel className="text-fg-muted tracking-wider">
                Progreso
              </MonoLabel>
              <span className="text-xs font-mono tabular-nums font-semibold text-primary">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
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
                      ? 'bg-primary-soft border border-primary/30'
                      : 'hover:bg-surface-muted'
                  )}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      isCompleted && !isCurrent
                        ? 'bg-success text-white'
                        : isCurrent
                        ? 'bg-primary text-primary-fg'
                        : 'bg-surface-muted text-fg-subtle'
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="w-4 h-4" weight="bold" />
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
                          ? 'text-primary'
                          : isCompleted
                          ? 'text-success'
                          : 'text-fg'
                      )}
                    >
                      {stepContent?.label}
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5 truncate">
                      {stepContent?.description}
                    </p>
                  </div>

                  {/* Arrow for current */}
                  {isCurrent && (
                    <CaretRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Help link */}
          <div className="mt-8 pt-6 border-t border-border-faint">
            <Link
              href="/ayuda"
              className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors"
            >
              <Question className="w-4 h-4" />
              ¿Necesitas ayuda?
            </Link>
          </div>
        </aside>

        {/* Center - Form Content */}
        <main className="flex-1 bg-surface lg:border-r lg:border-border">
          <div className="max-w-xl mx-auto px-4 py-8 lg:px-12 lg:py-12">
            {/* Step Header */}
            <motion.div
              key={`header-${currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <MonoLabel className="block mb-2 text-primary tracking-wider tabular-nums">
                Paso {currentStep} de {totalSteps}
              </MonoLabel>
              <h1 className="text-2xl lg:text-3xl font-semibold text-fg tracking-tight">
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
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-border-faint">
              {/* Back button */}
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isFirstStep || isSubmitting}
                hideArrow
                className={cn(isFirstStep && 'invisible')}
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </Button>

              {/* Next/Submit button */}
              <span
                className={cn('inline-flex', !canProceed && !isSubmitting && 'cursor-not-allowed')}
                onClick={() => {
                  if (!canProceed && !isSubmitting) setDisabledHint(true)
                }}
              >
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || isSubmitting}
                  hideArrow
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="xs" variant="current" />
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
                </Button>
              </span>
            </div>

            {/* Disabled-CTA hint */}
            {disabledHint && !canProceed && (
              <p role="status" className="mt-3 text-xs text-warning text-right">
                Completa los campos obligatorios para continuar
              </p>
            )}

            {/* Auto-save indicator */}
            <div className="flex items-center justify-center gap-2 mt-6 text-fg-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <p className="text-xs">Tu progreso se guarda automáticamente</p>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Why we need this */}
        <aside className="hidden xl:block w-80 bg-surface-muted p-8">
          <motion.div
            key={`why-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Why section */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
                <Question className="w-4 h-4 text-primary" />
                ¿Por qué lo necesitamos?
              </h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                {whyContent[currentStep - 1]}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-surface rounded-[14px] border border-border"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{benefit.label}</p>
                    <p className="text-xs text-fg-muted">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badge — Cadence success tones */}
            <div className="mt-8 p-4 bg-success-soft rounded-[14px] border border-success/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-success" />
                <p className="text-sm font-medium text-success">Datos seguros</p>
              </div>
              <p className="text-xs text-success">
                Tu información está encriptada y nunca se comparte sin tu permiso.
              </p>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  )
}
