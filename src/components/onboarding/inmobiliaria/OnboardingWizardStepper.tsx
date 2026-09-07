'use client'

import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'
import { WIZARD_STEPS, wizardStepIndex } from './wizard-steps'

export interface OnboardingWizardStepperProps {
  currentStep: OnboardingWizardStep | null
  /**
   * Hasta dónde llegó DE VERDAD el asistente (el `currentStep` del hook).
   * Cuando la persona vuelve a un paso anterior, `currentStep` es ese paso y
   * esto sigue siendo el de más adelante: así los pasos de en medio se siguen
   * viendo hechos y se puede volver a ellos.
   */
  reachedStep?: OnboardingWizardStep | null
  /**
   * Con esto, cada paso ya hecho (y el paso donde el asistente quedó) es un
   * botón que lleva ahí. Sin esto, la barra es sólo informativa.
   */
  onNavigateToStep?: (step: OnboardingWizardStep) => void
}

/**
 * 4-step visual stepper. The active step is derived from `currentStep`
 * (the hook's rehydrated state) — never local component state — so a page
 * refresh mid-wizard renders on the correct step automatically.
 *
 * Pattern: numbered circle + connector line, following the stepper the old
 * inmobiliaria onboarding used (`git log` pre-Cadence version), re-tokenized
 * to Cadence semantic classes (bg-primary / text-on-primary / border-border).
 *
 * ── Volver a un paso (Nico, 2026-09-07) ────────────────────────────────────
 * «En estos steps no me deja devolverme al paso anterior, quizás dando clic
 * al step previo». Un paso hecho es un `<button>` que llama a
 * `onNavigateToStep`; el que falta por hacer no, porque no hay a qué volver.
 * El paso actual tampoco: ya estás ahí.
 */
export function OnboardingWizardStepper({
  currentStep,
  reachedStep,
  onNavigateToStep,
}: OnboardingWizardStepperProps) {
  const activeIndex = wizardStepIndex(currentStep)
  const reachedIndex = Math.max(activeIndex, wizardStepIndex(reachedStep ?? currentStep))

  return (
    <ol
      aria-label="Progreso del registro de la inmobiliaria"
      className="flex items-center gap-1.5 sm:gap-2"
    >
      {WIZARD_STEPS.map((step, idx, arr) => {
        const isCurrent = idx === activeIndex
        const isDone = idx < reachedIndex && !isCurrent
        // Se puede ir a lo hecho y a donde el asistente quedó; no a lo que falta.
        const navegable = Boolean(onNavigateToStep) && !isCurrent && idx <= reachedIndex

        const contenido = (
          <>
            <div
              data-testid={`wizard-step-${step.key}`}
              data-active={isCurrent}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-mono tabular-nums transition-colors',
                isDone
                  ? 'bg-primary border-2 border-primary text-primary-fg'
                  : isCurrent
                    ? 'bg-surface border-2 border-primary text-primary'
                    : 'bg-surface border border-border text-fg-subtle',
              )}
            >
              {isDone ? <Check className="w-3.5 h-3.5" weight="bold" /> : idx + 1}
            </div>
            <span
              className={cn(
                'hidden md:inline text-xs font-medium',
                isCurrent ? 'text-primary' : isDone ? 'text-fg' : 'text-fg-subtle',
              )}
            >
              {step.label}
            </span>
          </>
        )

        return (
          <li key={step.key} className="flex items-center gap-1.5 sm:gap-2">
            {navegable ? (
              <button
                type="button"
                onClick={() => onNavigateToStep?.(step.key)}
                aria-label={`Volver a ${step.label}`}
                data-testid={`wizard-step-link-${step.key}`}
                className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&>div]:hover:border-primary/70 [&>span]:hover:text-primary"
              >
                {contenido}
              </button>
            ) : (
              <div className="flex items-center gap-2">{contenido}</div>
            )}
            {idx < arr.length - 1 && (
              <div className={cn('w-3 sm:w-6 h-0.5 transition-colors', isDone ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
