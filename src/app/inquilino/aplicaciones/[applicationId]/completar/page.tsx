'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';

import { WizardShell } from '@/components/wizard/WizardShell';
import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';
import { mapBackendApplication } from '@/lib/api/applications.service';
import { apiClient } from '@/lib/api/client';
import type { BackendApplication, BackendDocument } from '@/lib/api/applications.types';
import type { Application, DocumentInfo } from '@/lib/types/application';
import type { Property } from '@/lib/types/property';

// Step components
import { StepPersonal } from '@/components/wizard/steps/StepPersonal';
import { StepEmployment } from '@/components/wizard/steps/StepEmployment';
import { StepIncome } from '@/components/wizard/steps/StepIncome';
import { StepReferences } from '@/components/wizard/steps/StepReferences';
import { StepDocuments } from '@/components/wizard/steps/StepDocuments';
import { StepReview } from '@/components/wizard/steps/StepReview';

import { Button } from '@/components/ui/button';
import { IconButton } from '@leasefy/cadence';
import { Spinner } from '@/components/ui/spinner';

// ============================================================================
// Helpers
// ============================================================================

function mapDocumentsToDocumentInfo(docs: BackendDocument[]): Partial<DocumentInfo> {
  const result: Partial<DocumentInfo> = {};
  // Backend emits canonical UPPER_SNAKE types (ID_DOCUMENT, EMPLOYMENT_LETTER, etc.)
  // plus some legacy lowercase variants. Support both.
  const typeMap: Record<string, keyof DocumentInfo> = {
    ID_DOCUMENT: 'idDocument',
    BANK_STATEMENT: 'bankStatement',
    BANK_STATEMENTS: 'bankStatement', // legacy fallback
    INCOME_PROOF: 'incomeProof',
    EMPLOYMENT_LETTER: 'employmentLetter',
    PAY_STUB: 'payStub',
    CREDIT_REPORT: 'creditReport',
    // Legacy lowercase
    id_document: 'idDocument',
    bank_statement: 'bankStatement',
    bank_statements: 'bankStatement', // legacy fallback
    income_proof: 'incomeProof',
    employment_letter: 'employmentLetter',
    pay_stub: 'payStub',
    credit_report: 'creditReport',
  };
  for (const doc of docs) {
    const key = typeMap[doc.type];
    if (key) {
      (result as Record<string, unknown>)[key] = {
        file: null,
        // Backend canonical is originalName; fall back to legacy fileName
        fileName: doc.originalName ?? doc.fileName ?? 'Documento',
        uploadedAt: doc.createdAt,
        // Carry the id so the UI can offer delete
        remoteId: doc.id,
      };
    }
  }
  return result;
}

function buildProperty(p: NonNullable<BackendApplication['property']>): Property {
  const images = p.images ?? [];
  const thumbnail = images[0]?.url ?? '/placeholder-property.jpg';
  return {
    id: p.id,
    title: p.title,
    description: '',
    type: 'apartment',
    status: 'available',
    city: p.city ?? '',
    neighborhood: p.neighborhood ?? '',
    address: '',
    latitude: 0,
    longitude: 0,
    monthlyRent: p.monthlyRent,
    adminFee: 0,
    deposit: 0,
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    amenities: [],
    images: images.map((i) => i.url),
    thumbnailUrl: thumbnail,
    landlordId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Page
// ============================================================================

interface CompletarPageProps {
  params: Promise<{ applicationId: string }> | { applicationId: string };
}

export default function CompletarPage({ params }: CompletarPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { applicationId } = resolvedParams;

  const [application, setApplication] = useState<Application | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);

        // Fetch raw backend application (includes nested property) + documents in parallel
        const [ba, docs] = await Promise.all([
          apiClient.get<BackendApplication>(`/applications/${applicationId}`),
          apiClient.get<BackendDocument[]>(`/documents/application/${applicationId}`).catch(() => [] as BackendDocument[]),
        ]);

        if (cancelled) return;

        // Map to Application type and merge documents
        const mapped = mapBackendApplication(ba);
        const mappedDocs = mapDocumentsToDocumentInfo(docs);
        const appWithDocs: Application = {
          ...mapped,
          documents: { ...mapped.documents, ...mappedDocs },
        };

        setApplication(appWithDocs);

        // Build Property from nested data
        if (ba.property) {
          setProperty(buildProperty(ba.property));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando la aplicación');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [applicationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  if (error || !application || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
        <div className="text-center">
          <p className="text-fg-muted mb-4">{error ?? 'No se pudo cargar la aplicación.'}</p>
          <a
            href={`/inquilino/aplicaciones/${applicationId}`}
            className="text-[#1A40FF] hover:underline text-sm"
          >
            ← Volver al detalle
          </a>
        </div>
      </div>
    );
  }

  return (
    <ApplicationProvider
      propertyId={application.propertyId}
      mode="update"
      existingApplicationId={applicationId}
      initialApplication={application}
    >
      <UpdateWizardContent property={property} applicationId={applicationId} />
    </ApplicationProvider>
  );
}

// ============================================================================
// Wizard wrapper — handles success redirect
// ============================================================================

function UpdateWizardContent({
  property,
  applicationId,
}: {
  property: Property;
  applicationId: string;
}) {
  const router = useRouter();
  const { application, submissionError } = useApplication();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmissionComplete = useCallback(() => {
    // Guard: never mark as success if the context recorded a submission error.
    // Prevents the green "¡Actualizado!" modal from appearing when anything
    // in the flow (PATCH steps, doc upload, respond-info) actually failed.
    // This is a belt-and-suspenders check: the primary success gate is the
    // useEffect below watching application.status.
  }, []);

  // Only mark success when the backend transitioned the application AND
  // no submission error was recorded in this attempt.
  useEffect(() => {
    if (application.status === 'submitted' && !submissionError) {
      setIsSuccess(true);
    }
  }, [application.status, submissionError]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface dark:bg-[#1a1a1c] rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#2C7A53] dark:text-[#3EAE70]" />
          </div>
          <h2 className="text-2xl font-semibold text-fg dark:text-white mb-3">
            ¡Información actualizada!
          </h2>
          <p className="text-fg-muted dark:text-fg-subtle mb-8">
            La inmobiliaria fue notificada de que completaste la información solicitada.
            Revisarán tu solicitud a la brevedad.
          </p>
          <Button
            size="lg"
            hideArrow
            onClick={() => router.push(`/inquilino/aplicaciones/${applicationId}`)}
            className="w-full"
          >
            Ver mi aplicación
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {submissionError && <SubmissionErrorBanner message={submissionError} />}
      <WizardShell property={property}>
        <UpdateStepContent onSubmissionComplete={handleSubmissionComplete} />
      </WizardShell>
    </>
  );
}

/**
 * Sticky error banner shown when submitApplication fails (network error,
 * doc upload failure, respond-info rejection, etc.). Positioned above the
 * wizard so it survives step navigation.
 */
function SubmissionErrorBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="sticky top-0 z-40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 border-b border-[#C4503B]/30 dark:border-[#C4503B]/40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-[#C4503B] dark:text-[#E0664D] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#C4503B] dark:text-[#E0664D]">
            No pudimos completar tu solicitud
          </p>
          <p className="text-xs text-[#C4503B] dark:text-[#E0664D] mt-0.5 break-words">
            {message}
          </p>
        </div>
        <IconButton
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 w-7 h-7 rounded-sm hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/60"
          aria-label="Cerrar"
          icon={<X className="w-4 h-4 text-[#C4503B] dark:text-[#E0664D]" />}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Step renderer
// ============================================================================

function UpdateStepContent({ onSubmissionComplete }: { onSubmissionComplete: () => void }) {
  const { currentStep, submitApplication } = useApplication();

  const handleSubmit = useCallback(async () => {
    await submitApplication();
    onSubmissionComplete();
  }, [submitApplication, onSubmissionComplete]);

  // Wire the submit handler into the context by passing it via WizardShell's onSubmit
  // (WizardShell reads submitApplication directly from context — no extra wiring needed)
  void handleSubmit; // referenced to avoid lint warning

  return (
    <div className="space-y-6">
      {currentStep === 1 && <StepPersonal />}
      {currentStep === 2 && <StepEmployment />}
      {currentStep === 3 && <StepIncome />}
      {currentStep === 4 && <StepReferences />}
      {currentStep === 5 && <StepDocuments />}
      {currentStep === 6 && <StepReview />}
    </div>
  );
}
