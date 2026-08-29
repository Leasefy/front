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
  // Backend emits canonical UPPER_SNAKE types (ID_DOCUMENT, BANK_STATEMENT, etc.)
  // plus some legacy lowercase variants. Support both. Only cédula and
  // extracto bancario have a slot in `DocumentInfo` since T-0020 — a legacy
  // document of any other type (EMPLOYMENT_LETTER, INCOME_PROOF, PAY_STUB,
  // CREDIT_REPORT) has nowhere to go and is silently ignored, same as an
  // unrecognized type.
  const typeMap: Record<string, keyof DocumentInfo> = {
    ID_DOCUMENT: 'idDocument',
    BANK_STATEMENT: 'bankStatement',
    BANK_STATEMENTS: 'bankStatement', // legacy fallback
    // Legacy lowercase
    id_document: 'idDocument',
    bank_statement: 'bankStatement',
    bank_statements: 'bankStatement', // legacy fallback
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
  const thumbnail = images[0]?.url ?? '/placeholder-property.svg';
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
    department: null,
    // An Application only ever exists for a RENT listing — postulación
    // against a SALE listing is a 409 (contract.md T-0038 §3.3) — so this
    // sub-object (BackendApplication['property']) never carries a sale price.
    listingType: 'rent',
    salePrice: null,
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
          setError(err instanceof Error ? err.message : 'Error cargando la postulación');
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
          <p className="text-fg-muted mb-4">{error ?? 'No se pudo cargar la postulación.'}</p>
          <a
            href={`/inquilino/aplicaciones/${applicationId}`}
            className="text-primary hover:underline text-sm"
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
          className="bg-surface rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold text-fg mb-3">
            ¡Información actualizada!
          </h2>
          <p className="text-fg-muted mb-8">
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
    <div className="sticky top-0 z-40 bg-danger-soft border-b border-danger/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-danger">
            No pudimos completar tu solicitud
          </p>
          <p className="text-xs text-danger mt-0.5 break-words">
            {message}
          </p>
        </div>
        <IconButton
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 w-7 h-7 rounded-sm hover:bg-danger-soft"
          aria-label="Cerrar"
          icon={<X className="w-4 h-4 text-danger" />}
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
      {currentStep === 4 && <StepDocuments />}
      {currentStep === 5 && <StepReview />}
    </div>
  );
}
