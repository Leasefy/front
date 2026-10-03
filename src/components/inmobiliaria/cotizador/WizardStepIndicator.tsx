'use client'
// Phase 30 plan 30-05 (COTI-UI-02)
// Movimiento: el punto del paso actual se DESLIZA al siguiente (o al anterior)
// con `MotionIndicator` (resorte del sistema), en vez de prenderse y apagarse.

import { useId } from 'react'
import { MotionIndicator } from '@leasefy/cadence'

interface WizardStepIndicatorProps {
  totalSteps: number
  currentStep: number
}

export function WizardStepIndicator({ totalSteps, currentStep }: WizardStepIndicatorProps) {
  const id = useId()
  return (
    <div
      className="flex w-full justify-center gap-2 py-4"
      aria-label={`Paso ${currentStep} de ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        return (
          <span
            key={step}
            className="relative isolate h-2 w-2 rounded-full bg-surface-muted"
          >
            {isActive && (
              <MotionIndicator
                layoutId={`${id}-paso`}
                className="inset-0 rounded-full bg-primary"
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
