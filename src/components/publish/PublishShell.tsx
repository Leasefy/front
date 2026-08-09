'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, SpinnerGap, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react';
import { Progress } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePublish } from '@/lib/context/PublishContext';
import { PUBLISH_STEPS } from '@/lib/types/publish';

interface PublishShellProps {
  children: React.ReactNode;
}

export function PublishShell({ children }: PublishShellProps) {
  const router = useRouter();
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    nextStep,
    submitProperty,
    isSubmitting,
    canProceed,
    submissionError,
  } = usePublish();

  const currentStepConfig = PUBLISH_STEPS[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const handleNext = () => {
    if (isLastStep) {
      submitProperty();
    } else {
      nextStep();
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-10 bg-surface border-b border-border">
        <div className="px-4 py-3">
          <Button
            variant="link"
            size="sm"
            onClick={() => router.back()}
            hideArrow
            className="text-fg-muted hover:text-fg gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </Button>
        </div>

        {/* Mobile progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono tabular-nums font-medium text-fg">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-xs text-fg-muted">
              {currentStepConfig?.label}
            </span>
          </div>
          <Progress value={currentStep} max={totalSteps} size="sm" label="Progreso de la publicación" />
        </div>
      </header>

      {/* Main Layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[320px] xl:w-[360px] bg-surface border-r border-border lg:sticky lg:top-0 lg:h-screen">
          {/* Header */}
          <div className="p-6 xl:p-8 border-b border-border">
            <Button
              variant="link"
              size="sm"
              onClick={() => router.back()}
              hideArrow
              className="text-fg-muted hover:text-fg gap-2 mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancelar
            </Button>

            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              Publicar Inmueble
            </h1>
            <p className="text-sm text-fg-muted mt-2">
              Completa la información de tu propiedad para publicarla
            </p>
          </div>

          {/* Current step info */}
          <div className="p-6 xl:p-8 border-b border-border">
            <h2 className="text-xl font-semibold text-fg tracking-tight">
              {currentStepConfig?.description}
            </h2>
            <p className="text-sm text-fg-muted mt-2">
              Paso {currentStep} de {totalSteps}
            </p>
          </div>

          {/* Vertical Stepper */}
          <nav className="flex-1 p-6 xl:p-8 overflow-y-auto">
            <div className="relative">
              {PUBLISH_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep;
                const isClickable = isCompleted || isCurrent || step.id === 1;
                const isLast = index === PUBLISH_STEPS.length - 1;

                return (
                  <div key={step.id} className="relative">
                    {/* Connecting line — Cadence #steps: 2px, cobalt done / hairline pending */}
                    {!isLast && (
                      <div
                        aria-hidden
                        className={cn(
                          'absolute left-[15px] top-[36px] w-[2px] h-[24px] rounded-full',
                          completedSteps.includes(step.id) ? 'bg-primary' : 'bg-border'
                        )}
                      />
                    )}

                    {/* Step item */}
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

                      {/* Step label */}
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent
                            ? 'text-fg'
                            : isCompleted
                            ? 'text-fg-muted'
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

        {/* Main Content */}
        <main className="flex-1 lg:overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 lg:py-12">
            {/* Step content */}
            <div className="bg-surface rounded-[22px] border border-border">
              {/* Desktop step header */}
              <div className="hidden lg:block px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-fg font-mono text-sm font-semibold tabular-nums">
                    {currentStep}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-fg">
                      {currentStepConfig?.description}
                    </h3>
                    <p className="text-sm text-fg-muted">
                      Paso {currentStep} de {totalSteps}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile step header */}
              <div className="lg:hidden px-4 py-4 border-b border-border">
                <h3 className="text-base font-medium text-fg">
                  {currentStepConfig?.description}
                </h3>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">
                {children}
              </div>

              {/* Error message — Cadence error alert */}
              {submissionError && (
                <div className="mx-4 mb-4 lg:mx-6 p-3 bg-danger-soft border border-danger/20 rounded-[14px] flex items-start gap-2">
                  <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{submissionError}</p>
                </div>
              )}

              {/* Compass */}
              <div className="px-4 pb-6 lg:px-6 lg:pb-8">
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  {/* Back button */}
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={isFirstStep || isSubmitting}
                    hideArrow
                    className={cn(isFirstStep && 'invisible')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Atrás</span>
                  </Button>

                  {/* Step indicator (mobile) */}
                  <span className="text-sm font-mono tabular-nums text-fg-muted sm:hidden">
                    {currentStep}/{totalSteps}
                  </span>

                  {/* Next/Submit button */}
                  {isSubmitting ? (
                    <Button isLoading disabled>
                      Publicando...
                    </Button>
                  ) : isLastStep ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed}
                      hideArrow
                    >
                      Publicar inmueble
                      <PaperPlaneTilt className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed}
                    >
                      Continuar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* FloppyDisk indicator */}
            <p className="text-center text-xs text-fg-muted mt-4">
              Tu progreso se guarda automáticamente
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
