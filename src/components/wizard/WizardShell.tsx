'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { WizardProgress } from './WizardProgress';
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
// Component
// ============================================================================

/**
 * WizardShell - Main wizard container
 * Includes property summary header, progress indicator, and navigation
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
    nextStep,
    prevStep,
    submitApplication,
    isLoading,
    canSubmit,
  } = useApplication();

  const currentStepConfig = WIZARD_STEPS[currentStep - 1];

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header with property summary */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          {/* Back link */}
          <div className="py-3 border-b border-gray-100">
            <Link
              href={`/propiedades/${property.id}`}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la propiedad
            </Link>
          </div>

          {/* Property summary */}
          <div className="py-4 flex items-center gap-4">
            {/* Property image */}
            <div className="hidden sm:block relative w-20 h-16 rounded-sm overflow-hidden flex-shrink-0">
              <Image
                src={property.thumbnailUrl}
                alt={property.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Property info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-medium text-gray-900 truncate">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">
                  {property.neighborhood}, {property.city}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0">
              <p className="text-base font-medium text-gray-900">
                {formatCurrency(property.monthlyRent)}
              </p>
              <p className="text-xs text-gray-500">/mes</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress indicator */}
          <WizardProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            className="mb-8"
          />

          {/* Step content card */}
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
            {/* Step header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                {currentStepConfig?.description}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {getStepSubtitle(currentStep)}
              </p>
            </div>

            {/* Step form content */}
            <div className="px-6 py-6">{children}</div>

            {/* Navigation */}
            <div className="px-6 pb-6">
              <WizardNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onBack={prevStep}
                onNext={nextStep}
                onSubmit={submitApplication}
                isSubmitting={isLoading}
                isValid={currentStep === totalSteps ? canSubmit : true}
              />
            </div>
          </div>

          {/* Save indicator */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Tu progreso se guarda automaticamente
          </p>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Helper
// ============================================================================

function getStepSubtitle(step: number): string {
  const subtitles: Record<number, string> = {
    1: 'Ingresa tu informacion personal basica',
    2: 'Cuentanos sobre tu situacion laboral',
    3: 'Detalla tus ingresos y gastos mensuales',
    4: 'Proporciona contactos que puedan darte referencias',
    5: 'Sube los documentos requeridos para la verificacion',
    6: 'Revisa toda la informacion antes de enviar',
  };
  return subtitles[step] || '';
}
