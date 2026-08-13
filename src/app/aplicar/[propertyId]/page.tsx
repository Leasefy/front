'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { WizardShell } from '@/components/wizard/WizardShell';
import { ConfirmationScreen, generateTrackingCode } from '@/components/wizard/ConfirmationScreen';
import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';
import { useProperty } from '@/lib/hooks/useProperties';
import { applicationsApi } from '@/lib/api/applications.service';
import { useAuth } from '@/lib/auth/use-auth';
import type { Property } from '@/lib/types/property';

// Step components
import { StepPersonal } from '@/components/wizard/steps/StepPersonal';
import { StepEmployment } from '@/components/wizard/steps/StepEmployment';
import { StepIncome } from '@/components/wizard/steps/StepIncome';
import { StepReferences } from '@/components/wizard/steps/StepReferences';
import { StepDocuments } from '@/components/wizard/steps/StepDocuments';
import { StepReview } from '@/components/wizard/steps/StepReview';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PostulacionDirecta } from '@/components/tenant/PostulacionDirecta';
import { usePostulacionDirecta } from '@/lib/hooks/use-postulacion-directa';

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
  const pathname = usePathname();
  const { property, isLoading, error, errorCrudo } = useProperty(resolvedParams.propertyId);

  // Postulación directa: quien ya se estudió, está vigente, el inmueble le
  // entra en el tope y ya llenó una postulación completa no tiene por qué
  // volver a llenar seis pasos. `?formulario=1` es la salida explícita.
  const verFormulario = searchParams.get('formulario') === '1';
  const {
    cargando: decidiendoCamino,
    prefillDirecto,
    consentText,
  } = usePostulacionDirecta(property?.monthlyRent);
  const [postuladaId, setPostuladaId] = useState<string | null>(null);

  // Get pre-filled name and email from URL params (lead capture)
  const initialName = searchParams.get('name') || '';
  const initialEmail = searchParams.get('email') || '';

  // Get agent attribution from URL params (shareable links)
  const agentCode = searchParams.get('ref') || undefined;
  const linkCode = searchParams.get('link') || undefined;

  // Existing-application detection: an authenticated user who already applied to
  // this property cannot create a second one (backend 409). Detect it up front
  // and show a card instead of letting them redo the whole wizard and dead-end
  // at submit. undefined = still checking, null = none, object = already applied.
  //
  // `useAuth`, no `getAccessToken()`: el token vive en memoria y lo pone el
  // AuthProvider cuando Supabase responde. Leerlo durante el render devuelve
  // null en la primera pasada aunque haya sesión, y entonces esta detección se
  // saltaba entera — quien ya había postulado volvía a llenar los seis pasos
  // para chocar con un 409 al enviar.
  const { isAuthenticated: isAuthed, isLoading: resolviendoSesion } = useAuth();
  const [existingApp, setExistingApp] = useState<
    { id: string; status: string } | null | undefined
  >(undefined);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (resolviendoSesion) return; // todavía no se sabe si hay sesión
    if (!isAuthed) {
      setExistingApp(null); // guests can't have an account-bound application
      return;
    }
    let cancelled = false;
    applicationsApi
      .getMine()
      .then((apps) => {
        if (cancelled) return;
        // Statuses that block a re-apply (mirror the backend guard, which allows
        // a new application only after WITHDRAWN/REJECTED).
        const blocking = ['draft', 'submitted', 'under_review', 'approved'];
        const active = apps.find(
          (a) =>
            a.propertyId === resolvedParams.propertyId &&
            blocking.includes(a.status),
        );
        setExistingApp(active ? { id: active.id, status: active.status } : null);
      })
      .catch(() => {
        // On a failed check, fall through to the wizard rather than blocking.
        if (!cancelled) setExistingApp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthed, resolviendoSesion, resolvedParams.propertyId]);

  const handleWithdrawAndReapply = useCallback(async () => {
    if (!existingApp) return;
    setWithdrawing(true);
    try {
      await applicationsApi.withdraw(existingApp.id);
      setExistingApp(null); // withdrawn → the wizard can render
    } catch {
      setWithdrawing(false);
    }
  }, [existingApp]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 404 handling
    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que esta propiedad había sido eliminada, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <FalloDeCarga
          error={errorCrudo ?? error}
          queEs="esta propiedad"
          volverA={{ label: 'Ver propiedades disponibles', href: '/propiedades' }}
        />
      </div>
    );
  }

  if (!property) {
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

  // Still checking whether this authenticated user already applied, or which
  // of the two paths they take. Se espera a las dos: mostrar el formulario y
  // reemplazarlo un segundo después por la pantalla directa sería peor que
  // esperar.
  if (decidiendoCamino || (isAuthed && existingApp === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already applied → offer to view it or withdraw and start over, instead of a
  // dead-end wizard that 409s at submit.
  if (existingApp) {
    return (
      <AlreadyAppliedCard
        applicationId={existingApp.id}
        onWithdraw={handleWithdrawAndReapply}
        withdrawing={withdrawing}
      />
    );
  }

  // Ya quedó postulada desde la pantalla directa.
  if (postuladaId) {
    return (
      <ConfirmationScreen
        property={property}
        trackingCode={generateTrackingCode()}
        isGuest={false}
      />
    );
  }

  // A quien ya se estudió, tiene la aprobación vigente, el inmueble le entra en
  // el tope y ya llenó una postulación completa, no hay nada que preguntarle:
  // una pantalla de confirmación en vez de los seis pasos.
  if (prefillDirecto && !verFormulario) {
    return (
      <PostulacionDirecta
        property={property}
        prefill={prefillDirecto}
        consentText={consentText}
        hrefFormulario={`${pathname}?formulario=1`}
        onPostulada={setPostuladaId}
      />
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
// Already-applied card
// ============================================================================

interface AlreadyAppliedCardProps {
  applicationId: string;
  onWithdraw: () => void;
  withdrawing: boolean;
}

function AlreadyAppliedCard({
  applicationId,
  onWithdraw,
  withdrawing,
}: AlreadyAppliedCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center mx-auto">
          <CheckCircle className="w-6 h-6 text-primary" weight="fill" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Ya tenés una postulación
          </h1>
          <p className="text-sm text-muted-foreground">
            Ya postulaste a esta propiedad. Podés ver el estado de tu postulación,
            o retirarla para volver a empezar.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/inquilino/aplicaciones/${applicationId}`} className="w-full">
            <Button className="w-full" hideArrow>
              Ver mi postulación
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full"
            hideArrow
            onClick={onWithdraw}
            isLoading={withdrawing}
            disabled={withdrawing}
          >
            Retirar y volver a postular
          </Button>
        </div>
      </div>
    </div>
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
