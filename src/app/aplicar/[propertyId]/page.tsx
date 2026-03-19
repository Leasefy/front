'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { WizardShell } from '@/components/wizard/WizardShell';
import { ConfirmationScreen, generateTrackingCode } from '@/components/wizard/ConfirmationScreen';
import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';
import { useProperty } from '@/lib/hooks/useProperties';
import type { Property } from '@/lib/types/property';

// Step components
import { StepPersonal } from '@/components/wizard/steps/StepPersonal';
import { StepEmployment } from '@/components/wizard/steps/StepEmployment';
import { StepIncome } from '@/components/wizard/steps/StepIncome';
import { StepReferences } from '@/components/wizard/steps/StepReferences';
import { StepDocuments } from '@/components/wizard/steps/StepDocuments';
import { StepReview } from '@/components/wizard/steps/StepReview';

// ============================================================================
// Page props
// ============================================================================

interface AplicarPageProps {
  params: Promise<{ propertyId: string }> | { propertyId: string };
}

// ============================================================================
// Page component
// ============================================================================

/**
 * Application wizard page
 * Route: /aplicar/[propertyId]
 */
export default function AplicarPage({ params }: AplicarPageProps) {
  // Handle both Promise and direct params (Next.js version compatibility)
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const searchParams = useSearchParams();
  const { property, isLoading, error } = useProperty(resolvedParams.propertyId);

  // Get pre-filled name and email from URL params (lead capture)
  const initialName = searchParams.get('name') || '';
  const initialEmail = searchParams.get('email') || '';

  // Get agent attribution from URL params (shareable links)
  const agentCode = searchParams.get('ref') || undefined;
  const linkCode = searchParams.get('link') || undefined;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 404 handling
  if (!property || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-foreground">
            Propiedad no encontrada
          </h1>
          <p className="mt-2 text-muted-foreground">
            La propiedad que buscas no existe o ha sido removida.
          </p>
          <Link href="/propiedades">
            <Button className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver propiedades disponibles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Property not available for applications
  if (property.status !== 'available') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-foreground">
            Propiedad no disponible
          </h1>
          <p className="mt-2 text-muted-foreground">
            Esta propiedad ya no está disponible para aplicaciones.
          </p>
          <Link href="/propiedades">
            <Button className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver propiedades disponibles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ApplicationProvider
      propertyId={property.id}
      initialName={initialName}
      initialEmail={initialEmail}
      agentCode={agentCode}
      linkCode={linkCode}
    >
      <WizardContent property={property} />
    </ApplicationProvider>
  );
}

// ============================================================================
// Wizard content wrapper
// ============================================================================

interface WizardContentProps {
  property: Property;
}

/**
 * Wrapper that handles the submission state and switches between wizard and confirmation
 */
function WizardContent({ property }: WizardContentProps) {
  const { application, isGuestSubmission } = useApplication();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');

  // Handle successful submission
  const handleSubmissionComplete = useCallback(() => {
    setTrackingCode(generateTrackingCode());
    setIsSubmitted(true);
  }, []);

  // Show confirmation screen after successful submission
  if (isSubmitted || application.status === 'submitted') {
    return (
      <ConfirmationScreen
        property={property}
        trackingCode={trackingCode || generateTrackingCode()}
        isGuest={isGuestSubmission}
        guestEmail={application.personal.email}
      />
    );
  }

  return (
    <WizardShell property={property}>
      <WizardStepContent onSubmissionComplete={handleSubmissionComplete} />
    </WizardShell>
  );
}

// ============================================================================
// Step content component
// ============================================================================

interface WizardStepContentProps {
  onSubmissionComplete: () => void;
}

/**
 * Renders the appropriate step component based on current step
 */
function WizardStepContent({ onSubmissionComplete }: WizardStepContentProps) {
  const { currentStep, application, submitApplication, isLoading } = useApplication();

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    await submitApplication();
    onSubmissionComplete();
  }, [submitApplication, onSubmissionComplete]);

  return (
    <div className="space-y-6">
      {/* Step 1: Personal Information */}
      {currentStep === 1 && <StepPersonal />}

      {/* Step 2: Employment Information */}
      {currentStep === 2 && <StepEmployment />}

      {/* Step 3: Income Information */}
      {currentStep === 3 && <StepIncome />}

      {/* Step 4: References */}
      {currentStep === 4 && <StepReferences />}

      {/* Step 5: Documents */}
      {currentStep === 5 && <StepDocuments />}

      {/* Step 6: Review */}
      {currentStep === 6 && <StepReview />}
    </div>
  );
}
