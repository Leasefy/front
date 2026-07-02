'use client';

import { Check, WarningCircle } from '@phosphor-icons/react';
import { Eyebrow, Progress } from '@leasefy/cadence';
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
    <div className="min-h-screen bg-bg">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-20 bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-mono tabular-nums font-medium text-fg"
            aria-live="polite"
            aria-atomic="true"
          >
            Paso {currentStep} de {totalSteps}
          </span>
          <span className="text-xs text-fg-muted">
            {currentStepConfig?.label}
          </span>
        </div>
        <Progress value={currentStep} max={totalSteps} size="xs" label="Progreso del avalúo" />
      </header>

      {/* Main layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[280px] xl:w-[320px] bg-surface border-r border-border lg:sticky lg:top-0 lg:h-screen">
          {/* Brand / title */}
          <div className="p-6 xl:p-8 border-b border-border">
            <Eyebrow className="mb-1.5">Leasefy</Eyebrow>
            <h1 className="text-lg font-semibold text-fg leading-tight tracking-tight">
              Avalúo comercial
            </h1>
            <p className="text-sm text-fg-muted mt-1">
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
                    {/* Connecting line — Cadence #steps: 2px, cobalt done / hairline pending */}
                    {!isLast && (
                      <div
                        aria-hidden
                        className={cn(
                          'absolute left-[15px] top-[36px] w-[2px] h-[24px] rounded-full',
                          isCompleted ? 'bg-primary' : 'bg-border'
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
                      {/* Circle indicator — Cadence #steps: 32px; done = cobalt fill + check;
                          active = white + 2px cobalt ring (halo) + mono numeral; pending = hairline */}
                      <div
                        style={
                          isCurrent
                            ? { boxShadow: '0 0 0 4px rgba(26,64,255,0.14)' }
                            : undefined
                        }
                        className={cn(
                          'relative z-10 size-8 rounded-full flex items-center justify-center transition-all',
                          'font-mono text-[13px] font-semibold tabular-nums',
                          isCompleted && !isCurrent
                            ? 'bg-primary border-2 border-primary text-primary-fg'
                            : isCurrent
                            ? 'bg-surface border-2 border-primary text-primary'
                            : 'bg-surface border border-border text-fg-subtle'
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="h-4 w-4" weight="bold" />
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </div>

                      {/* Label */}
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent
                            ? 'text-fg'
                            : isCompleted
                            ? 'text-fg/70'
                            : 'text-fg-muted'
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
            <div className="bg-surface rounded-[22px] border border-border">
              {/* Step header — desktop */}
              <div className="hidden lg:block px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-8 rounded-full bg-ink text-ink-fg font-mono text-sm font-semibold tabular-nums">
                    {currentStep}
                  </span>
                  <div>
                    <h2 className="text-base font-medium text-fg">
                      {currentStepConfig?.label}
                    </h2>
                    <p className="text-sm text-fg-muted">
                      Paso {currentStep} de {totalSteps}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step header — mobile */}
              <div className="lg:hidden px-4 py-4 border-b border-border">
                <h2 className="text-base font-medium text-fg">
                  {currentStepConfig?.label}
                </h2>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">{children}</div>

              {/* Submit error — Cadence error alert */}
              {submitError && (
                <div
                  className="px-4 lg:px-6 mb-4"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-start gap-3 p-4 bg-danger-soft border border-danger/20 rounded-[14px]">
                    <WarningCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-danger">{submitError}</p>
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

            <p className="text-center text-xs text-fg-muted mt-4">
              Tu información está protegida bajo la Ley 1581 de Habeas Data.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
