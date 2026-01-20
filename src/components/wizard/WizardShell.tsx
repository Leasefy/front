'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Check, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
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
  1: 'Ingresa tu informacion personal basica',
  2: 'Cuentanos sobre tu situacion laboral',
  3: 'Detalla tus ingresos mensuales',
  4: 'Proporciona referencias de contacto',
  5: 'Sube los documentos requeridos',
  6: 'Revisa toda la informacion',
};

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
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    submitApplication,
    isLoading,
    canSubmit,
    currentStepValidation,
    currentStepMissingFields,
    attemptedAdvance,
    tryAdvanceStep,
  } = useApplication();

  const currentStepConfig = WIZARD_STEPS[currentStep - 1];

  return (
    <div className={cn('min-h-screen bg-[#fafafa]', className)}>
      {/* Mobile Header - only visible on mobile */}
      <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-black/5">
        <div className="px-4 py-3">
          <Link
            href={`/propiedades/${property.id}`}
            className="inline-flex items-center text-sm text-black/60 hover:text-black transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la propiedad
          </Link>
        </div>

        {/* Mobile property summary */}
        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-sm overflow-hidden flex-shrink-0 bg-black/5">
            <Image
              src={property.thumbnailUrl}
              alt={property.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-black truncate">
              {property.title}
            </h1>
            <div className="flex items-center gap-1 text-xs text-black/50">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{property.neighborhood}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-black">
              {formatCurrency(property.monthlyRent)}
            </p>
            <p className="text-xs text-black/50">/mes</p>
          </div>
        </div>

        {/* Mobile progress indicator */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-black">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-xs text-black/50">
              {currentStepConfig?.label}
            </span>
          </div>
          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[320px] xl:w-[360px] bg-white border-r border-black/5 lg:sticky lg:top-0 lg:h-screen">
          {/* Back link and property info */}
          <div className="p-6 xl:p-8 border-b border-black/5">
            <Link
              href={`/propiedades/${property.id}`}
              className="inline-flex items-center text-sm text-black/60 hover:text-black transition-colors mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la propiedad
            </Link>

            {/* Property card */}
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-16 rounded-sm overflow-hidden flex-shrink-0 bg-black/5">
                <Image
                  src={property.thumbnailUrl}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-medium text-black leading-tight">
                  {property.title}
                </h1>
                <div className="flex items-center gap-1 text-xs text-black/50 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{property.neighborhood}, {property.city}</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-medium text-black">
                    {formatCurrency(property.monthlyRent)}
                  </span>
                  <span className="text-xs text-black/50">/mes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step title and description */}
          <div className="p-6 xl:p-8 border-b border-black/5">
            <h2 className="text-xl font-semibold text-black tracking-tight">
              {currentStepConfig?.description}
            </h2>
            <p className="text-sm text-black/50 mt-2 leading-relaxed">
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
                    {/* Connecting line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[11px] top-[28px] w-[2px] h-[32px]',
                          completedSteps.includes(step.id) ? 'bg-black' : 'bg-black/10'
                        )}
                      />
                    )}

                    {/* Step item */}
                    <button
                      type="button"
                      onClick={() => isClickable && goToStep(step.id)}
                      disabled={!isClickable}
                      className={cn(
                        'flex items-center gap-4 w-full py-2 text-left transition-colors',
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                      )}
                    >
                      {/* Circle indicator */}
                      <div
                        className={cn(
                          'relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all',
                          'border-2',
                          isCompleted
                            ? 'bg-black border-black'
                            : isCurrent
                            ? 'bg-black border-black'
                            : 'bg-white border-black/20'
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        ) : null}
                      </div>

                      {/* Step label */}
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent
                            ? 'text-black'
                            : isCompleted
                            ? 'text-black/70'
                            : 'text-black/40'
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
            <div className="bg-white rounded-sm border border-black/5 shadow-sm">
              {/* Desktop step header - hidden on mobile since sidebar shows it */}
              <div className="hidden lg:block px-6 py-5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm font-medium">
                    {currentStep}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-black">
                      {currentStepConfig?.description}
                    </h3>
                    <p className="text-sm text-black/50">
                      Paso {currentStep} de {totalSteps}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile step header */}
              <div className="lg:hidden px-4 py-4 border-b border-black/5">
                <h3 className="text-base font-medium text-black">
                  {currentStepConfig?.description}
                </h3>
                <p className="text-sm text-black/50 mt-1">
                  {STEP_DESCRIPTIONS[currentStep]}
                </p>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">
                {children}
              </div>

              {/* Validation Errors */}
              {attemptedAdvance && !currentStepValidation.isValid && (
                <div className="px-4 lg:px-6 mb-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-sm">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        Completa los campos requeridos para continuar
                      </p>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                        {currentStepMissingFields.map((field, idx) => (
                          <li key={idx}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="px-4 pb-6 lg:px-6 lg:pb-8">
                <WizardNavigation
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onBack={prevStep}
                  onNext={tryAdvanceStep}
                  onSubmit={submitApplication}
                  isSubmitting={isLoading}
                  isValid={currentStep === totalSteps ? canSubmit : true}
                />
              </div>
            </div>

            {/* Save indicator */}
            <p className="text-center text-xs text-black/40 mt-4">
              Tu progreso se guarda automaticamente
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
