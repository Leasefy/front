// Phase 30 plan 30-05 (COTI-UI-02)

interface WizardStepIndicatorProps {
  totalSteps: number
  currentStep: number
}

export function WizardStepIndicator({ totalSteps, currentStep }: WizardStepIndicatorProps) {
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
            className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary' : 'bg-muted'}`}
          />
        )
      })}
    </div>
  )
}
