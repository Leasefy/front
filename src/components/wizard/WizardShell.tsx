'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Check, WarningCircle, Info, X } from '@phosphor-icons/react';

import { Progress } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { WizardNavigation } from './WizardNavigation';
import { useApplication } from '@/lib/context/ApplicationContext';
import { WIZARD_STEPS } from '@/lib/types/application';
import type { Property } from '@/lib/types/property';

// ============================================================================
// Props
// ============================================================================

interface WizardShellProps {
  property: Property;
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// Step descriptions for sidebar
// ============================================================================

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Ingresa tu información personal básica',
  2: 'Cuéntanos sobre tu situación laboral',
  3: 'Detalla tus ingresos mensuales',
  4: 'Proporciona referencias de contacto',
  5: 'Sube los documentos requeridos',
  6: 'Revisa toda la información',
};

// ============================================================================
// Helpers
// ============================================================================

/** Scroll to and focus a form field by its id (no-op if not rendered). */
function focusFieldById(fieldId: string | undefined) {
  if (!fieldId) return;
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

// ============================================================================
// Component
// ============================================================================

/**
 * WizardShell - Luxterra-style wizard layout
 * Two-column design: vertical stepper sidebar + form content
 */
export function WizardShell({
  property,
  children,
  className,
}: WizardShellProps) {
  const router = useRouter();

  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    submitApplication,
    isLoading,
    submissionError,
    canSubmit,
    currentStepValidation,
    currentStepMissingFields,
    attemptedAdvance,
    tryAdvanceStep,
    mode,
    showPrefillNotice,
    dismissPrefillNotice,
  } = useApplication();

  const currentStepConfig = WIZARD_STEPS[currentStep - 1];

  // Ids of fields with errors, aligned 1:1 with currentStepMissingFields labels
  const missingFieldIds = Object.keys(currentStepValidation.errors);

  // On a failed advance attempt, scroll to and focus the first invalid field
  const handleNext = useCallback(() => {
    const advanced = tryAdvanceStep();
    if (!advanced) {
      // Wait one frame so the error summary renders before scrolling
      requestAnimationFrame(() => {
        focusFieldById(Object.keys(currentStepValidation.errors)[0]);
      });
    }
  }, [tryAdvanceStep, currentStepValidation.errors]);

  return (
    <div className={cn('min-h-screen bg-bg', className)}>
      {/* Mobile Header - only visible on mobile */}
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
            Volver
          </Button>
        </div>

        {/* Mobile property summary */}
        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface-muted">
            <Image
              src={property.thumbnailUrl}
              alt={property.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-fg truncate">
              {property.title}
            </h1>
            <div className="flex items-center gap-1 text-xs text-fg-muted">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{property.neighborhood}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-mono tabular-nums font-medium text-fg">
              {formatCurrency(property.monthlyRent)}
            </p>
            <p className="text-xs text-fg-muted">/mes</p>
          </div>
        </div>

        {/* Mobile progress indicator */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono tabular-nums font-medium text-fg" aria-live="polite" aria-atomic="true">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-xs text-fg-muted">
              {currentStepConfig?.label}
            </span>
          </div>
          <Progress value={currentStep} max={totalSteps} size="xs" label="Progreso de la solicitud" />
        </div>
      </header>

      {/* Main Layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[320px] xl:w-[360px] bg-surface border-r border-border lg:sticky lg:top-0 lg:h-screen">
          {/* Back link and property info */}
          <div className="p-6 xl:p-8 border-b border-border">
            <Button
              variant="link"
              size="sm"
              onClick={() => router.back()}
              hideArrow
              className="text-fg-muted hover:text-fg gap-2 mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>

            {/* Property card */}
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-muted">
                <Image
                  src={property.thumbnailUrl}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-medium text-fg leading-tight">
                  {property.title}
                </h1>
                <div className="flex items-center gap-1 text-xs text-fg-muted mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{property.neighborhood}, {property.city}</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-mono tabular-nums font-medium text-fg">
                    {formatCurrency(property.monthlyRent)}
                  </span>
                  <span className="text-xs text-fg-muted">/mes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step title and description */}
          <div className="p-6 xl:p-8 border-b border-border">
            <h2 className="text-xl font-semibold text-fg tracking-tight">
              {currentStepConfig?.description}
            </h2>
            <p className="text-sm text-fg-muted mt-2 leading-relaxed">
              {STEP_DESCRIPTIONS[currentStep]}
            </p>
          </div>

          {/* Vertical Stepper */}
          <nav className="flex-1 p-6 xl:p-8 overflow-y-auto">
            <div className="relative">
              {WIZARD_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep;
                const isClickable = isCompleted || isCurrent;
                const isLast = index === WIZARD_STEPS.length - 1;

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
            {/* Prefill disclosure — data was seeded from a previous application */}
            {showPrefillNotice && (
              <div
                role="status"
                className="mb-4 flex items-start gap-3 p-4 bg-primary-soft border border-primary/20 rounded-[14px]"
                data-testid="prefill-notice"
              >
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-sm text-fg">
                  Precargamos los datos de tu postulación anterior. Revisa cada paso
                  antes de enviar.
                </p>
                <button
                  type="button"
                  onClick={dismissPrefillNotice}
                  aria-label="Cerrar aviso"
                  className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Step content */}
            <div className="bg-surface rounded-[22px] border border-border">
              {/* Desktop step header - hidden on mobile since sidebar shows it */}
              <div className="hidden lg:block px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-8 rounded-full bg-ink text-ink-fg font-mono text-sm font-semibold tabular-nums">
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
                <p className="text-sm text-fg-muted mt-1">
                  {STEP_DESCRIPTIONS[currentStep]}
                </p>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">
                {children}
              </div>

              {/* Validation Errors */}
              {attemptedAdvance && !currentStepValidation.isValid && (
                <div className="px-4 lg:px-6 mb-4" aria-live="assertive" role="alert">
                  <div className="flex items-start gap-3 p-4 bg-danger-soft border border-danger/20 rounded-[14px]">
                    <WarningCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-danger">
                        Completa los campos requeridos para continuar
                      </p>
                      <ul className="mt-2 text-sm text-danger list-disc list-inside space-y-1">
                        {currentStepMissingFields.map((field, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => focusFieldById(missingFieldIds[idx])}
                              className="underline-offset-2 hover:underline focus:underline text-left"
                            >
                              {field}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Submission error — otherwise a failed submit (e.g. 403 for a
                  non-tenant account, a blocked consent, or a server error) is
                  invisible and the button looks stuck on "Enviar solicitud". */}
              {submissionError && (
                <div
                  role="alert"
                  className="mx-4 mb-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger lg:mx-6"
                >
                  {submissionError}
                </div>
              )}

              {/* Compass */}
              <div className="px-4 pb-6 lg:px-6 lg:pb-8">
                <WizardNavigation
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onBack={prevStep}
                  onNext={handleNext}
                  onSubmit={submitApplication}
                  isSubmitting={isLoading}
                  isValid={currentStep === totalSteps ? canSubmit : true}
                  mode={mode}
                />
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
