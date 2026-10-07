'use client'

import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'
import { OnboardingStepList, type PasoDeLaLista } from '@/components/onboarding/wizard'
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
   * botón que lleva ahí. Sin esto, la lista es sólo informativa.
   */
  onNavigateToStep?: (step: OnboardingWizardStep) => void
}

/**
 * Los 4 pasos visibles del alta de la inmobiliaria. El activo sale de
 * `currentStep` (el estado rehidratado del hook), nunca de estado local: al
 * recargar a mitad del asistente se pinta en el paso correcto.
 *
 * ── Vertical, como el del inquilino (Nico, 30-09) ─────────────────────────
 * «Utiliza la forma en cómo tiene los steps inquilino que son verticales a la
 * izquierda». Antes era una fila horizontal metida en la cabecera; ahora es la
 * lista compartida del marco (`OnboardingStepList`): columna con nombre y una
 * línea de qué se pide en escritorio, fila de círculos en teléfono.
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

  const pasos: PasoDeLaLista[] = WIZARD_STEPS.map((step, idx) => {
    const isCurrent = idx === activeIndex
    const isDone = idx < reachedIndex && !isCurrent
    // Se puede ir a lo hecho y a donde el asistente quedó; no a lo que falta.
    const navegable = Boolean(onNavigateToStep) && !isCurrent && idx <= reachedIndex
    return {
      key: step.key,
      label: step.label,
      descripcion: step.descripcion,
      estado: isCurrent ? 'actual' : isDone ? 'hecho' : 'pendiente',
      onSelect: navegable ? () => onNavigateToStep?.(step.key) : undefined,
      etiquetaDelBoton: `Volver a ${step.label}`,
      testId: `wizard-step-${step.key}`,
      testIdDelBoton: `wizard-step-link-${step.key}`,
    }
  })

  return (
    <OnboardingStepList
      pasos={pasos}
      etiqueta="Progreso del registro de la inmobiliaria"
      nota="Cada paso queda guardado al continuar"
    />
  )
}
