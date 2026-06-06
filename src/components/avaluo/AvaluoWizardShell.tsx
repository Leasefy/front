'use client';

import { Check, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { useAvaluo } from './AvaluoContext';

// ---------------------------------------------------------------------------
// Step config
// ---------------------------------------------------------------------------

const AVALUO_STEPS = [
  { id: 1, label: 'Inmueble' },
  { id: 2, label: 'Contacto' },
  { id: 3, label: 'Fotos' },
  { id: 4, label: 'Confirmación' },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AvaluoWizardShellProps {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AvaluoWizardShell
 *
 * Layout: vertical stepper sidebar (desktop) + main content area + footer nav.
 * Reads all wizard state from AvaluoContext — no props drilling.
 */
export function AvaluoWizardShell({ children }: AvaluoWizardShellProps) {
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    nextStep,
    submitAvaluo,
    isSubmitting,
    canProceed,
    submitError,
  } = useAvaluo();

  const currentStepConfig = AVALUO_STEPS[currentStep - 1];
  const isLastStep = currentStep === totalSteps;

  // On last step: "Continuar" triggers submit; otherwise advances the step
  const handleNext = () => {
    if (!isLastStep) nextStep();
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-medium text-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            Paso {currentStep} de {totalSteps}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentStepConfig?.label}
          </span>
        </div>
        <div className="h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      {/* Main layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[280px] xl:w-[320px] bg-card border-r border-border lg:sticky lg:top-0 lg:h-screen">
          {/* Brand / title */}
          <div className="p-6 xl:p-8 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Leasefy
            </p>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Avalúo Comercial
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Completá los pasos para enviar tu solicitud.
            </p>
          </div>

          {/* Vertical stepper */}
          <nav className="flex-1 p-6 xl:p-8 overflow-y-auto" aria-label="Pasos del formulario">
            <div className="relative">
              {AVALUO_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep;
                const isClickable = isCompleted || isCurrent;
                const isLast = index === AVALUO_STEPS.length - 1;

                return (
                  <div key={step.id} className="relative">
                    {/* Connecting line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[11px] top-[28px] w-[2px] h-[32px]',
                          isCompleted ? 'bg-primary' : 'bg-black/10'
                        )}
                      />
                    )}

                    {/* Step button */}
                    <button
                      type="button"
                      onClick={() => isClickable && goToStep(step.id)}
                      disabled={!isClickable}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'flex items-center gap-4 w-full py-2 text-left transition-colors',
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                      )}
                    >
                      {/* Circle indicator */}
                      <div
                        className={cn(
                          'relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all border-2',
                          isCompleted
                            ? 'bg-primary border-primary'
                            : isCurrent
                            ? 'bg-primary border-primary'
                            : 'bg-card border-border'
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        ) : null}
                      </div>

                      {/* Label */}
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent
                            ? 'text-foreground'
                            : isCompleted
                            ? 'text-foreground/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {step.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 lg:py-12">
            <div className="bg-card rounded-xl border border-border shadow-sm">
              {/* Step header — desktop */}
              <div className="hidden lg:block px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-medium">
                    {currentStep}
                  </span>
                  <div>
                    <h2 className="text-base font-medium text-foreground">
                      {currentStepConfig?.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Paso {currentStep} de {totalSteps}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step header — mobile */}
              <div className="lg:hidden px-4 py-4 border-b border-border">
                <h2 className="text-base font-medium text-foreground">
                  {currentStepConfig?.label}
                </h2>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">{children}</div>

              {/* Submit error */}
              {submitError && (
                <div
                  className="px-4 lg:px-6 mb-4"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <WarningCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Navigation footer */}
              <div className="px-4 pb-6 lg:px-6 lg:pb-8">
                <WizardNavigation
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onBack={prevStep}
                  onNext={handleNext}
                  onSubmit={submitAvaluo}
                  isSubmitting={isSubmitting}
                  isValid={canProceed}
                />
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Tu información está protegida bajo la Ley 1581 de Habeas Data.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
