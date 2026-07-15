'use client'

import { Wrench } from '@phosphor-icons/react'

export interface WizardStepPlaceholderProps {
  label: string
}

/**
 * Placeholder for the wizard steps not built yet (habeas_data, complete).
 * Real forms land in the following sub-units — this only keeps the stepper
 * honest about `currentStep` while the user is rehydrated onto one of them.
 */
export function WizardStepPlaceholder({ label }: WizardStepPlaceholderProps) {
  return (
    <div
      data-testid="wizard-step-placeholder"
      className="rounded-lg border border-border bg-surface-raised p-8 text-center space-y-3 shadow-sm"
    >
      <div className="w-12 h-12 mx-auto rounded-md bg-surface-brand flex items-center justify-center">
        <Wrench className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-h2">{label}</h2>
      <p className="text-body-sm text-fg-muted">Este paso está próximamente.</p>
    </div>
  )
}
