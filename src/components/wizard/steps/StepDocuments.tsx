'use client';

import { useCallback } from 'react';
import { Warning, FileText, FolderOpen, ArrowsHorizontal } from '@phosphor-icons/react';
import { DocumentUpload } from '@/components/wizard/DocumentUpload';
import { useApplication } from '@/lib/context/ApplicationContext';
import { validateDocumentsStep } from '@/lib/validation/applicationValidation';
import { applicationsApi } from '@/lib/api/applications.service';
import type { DocumentUpload as DocumentUploadT } from '@/lib/types/application';

// ============================================================================
// Component
// ============================================================================

/**
 * StepDocuments - Step 5 of application wizard
 * 6 document types:
 *   - REQUIRED: idDocument, bankStatement
 *   - ONE OF (required): employmentLetter OR incomeProof
 *   - OPTIONAL: payStub, creditReport
 */
export function StepDocuments() {
  const { application, updateDocuments, attemptedAdvance, mode, existingApplicationId } = useApplication();
  const documents = application.documents;

  type DocField = 'idDocument' | 'bankStatement' | 'incomeProof' | 'employmentLetter' | 'payStub' | 'creditReport';

  const handleRemoteDelete = useCallback(
    async (field: DocField, remoteId: string): Promise<boolean> => {
      if (mode !== 'update' || !existingApplicationId) return true;
      // Backend only allows deleting docs on DRAFT applications.
      // For any other status (UNDER_REVIEW, NEEDS_INFO, etc.) we just clear
      // locally so the user can re-upload — the new file is sent on submit.
      if (application.status !== 'draft') {
        updateDocuments({ [field]: null });
        return true;
      }
      try {
        await applicationsApi.deleteDocument(existingApplicationId, remoteId);
        updateDocuments({ [field]: null });
        return true;
      } catch {
        return false;
      }
    },
    [mode, existingApplicationId, application.status, updateDocuments]
  );

  const buildOnDelete = useCallback(
    (field: DocField) =>
      mode === 'update' && existingApplicationId
        ? (remoteId: string) => handleRemoteDelete(field, remoteId)
        : undefined,
    [mode, existingApplicationId, handleRemoteDelete]
  );

  const validation = validateDocumentsStep(documents);

  const getDocumentError = useCallback(
    (fieldName: string): string | undefined => {
      return attemptedAdvance ? validation.errors[fieldName] : undefined;
    },
    [attemptedAdvance, validation.errors]
  );

  const handleDocumentChange = useCallback(
    (field: DocField, data: DocumentUploadT | null) => {
      updateDocuments({ [field]: data });
    },
    [updateDocuments]
  );

  // In create mode, only a real File object counts — a fileName-only slot means
  // the file was lost during page reload (stale localStorage). In update mode,
  // fileName without a file means the document already lives on the server.
  const hasEmploymentOrIncome = mode === 'update'
    ? (!!(documents.employmentLetter?.file || documents.employmentLetter?.fileName) ||
       !!(documents.incomeProof?.file || documents.incomeProof?.fileName))
    : (!!(documents.employmentLetter?.file) || !!(documents.incomeProof?.file));

  const oneOfError =
    attemptedAdvance && !hasEmploymentOrIncome
      ? 'Debés subir al menos uno: contrato laboral o certificado de ingresos'
      : undefined;

  // Shown above a document slot when the file was lost on page reload (create mode only).
  const StaleDocWarning = () => (
    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-sm">
      <Warning className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Volvé a adjuntar este archivo — se desconectó al recargar la página
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Warning about file persistence */}
      <div className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-200/50 rounded-sm">
        <Warning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800 font-medium">
            Importante sobre tus documentos
          </p>
          <p className="text-xs text-amber-700/80 mt-1">
            Los archivos se guardan temporalmente. Si cierras esta página, tendrás que
            volver a subirlos.
          </p>
        </div>
      </div>

      {/* Section 1 — Always required */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Documentos obligatorios
          </h3>
          <span className="text-xs text-red-500">*</span>
        </div>

        <div className="space-y-6">
          <div>
            {mode !== 'update' && documents.idDocument?.fileName && !documents.idDocument?.file && (
              <div className="mb-2"><StaleDocWarning /></div>
            )}
            <DocumentUpload
              label="Documento de identidad"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={5}
              value={documents.idDocument || null}
              onChange={(data) => handleDocumentChange('idDocument', data)}
              onDelete={buildOnDelete('idDocument')}
              hint="Cédula de ciudadanía o extranjería por ambos lados"
              error={getDocumentError('idDocument')}
            />
          </div>

          <div>
            {mode !== 'update' && documents.bankStatement?.fileName && !documents.bankStatement?.file && (
              <div className="mb-2"><StaleDocWarning /></div>
            )}
            <DocumentUpload
              label="Extracto bancario"
              required
              accept=".pdf"
              maxSizeMB={5}
              value={documents.bankStatement || null}
              onChange={(data) => handleDocumentChange('bankStatement', data)}
              onDelete={buildOnDelete('bankStatement')}
              hint="Últimos 3 meses de tu cuenta principal"
              error={getDocumentError('bankStatement')}
            />
          </div>
        </div>
      </section>

      {/* Section 2 — One of two required */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <ArrowsHorizontal className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Uno de los dos obligatorio
          </h3>
          <span className="text-xs text-red-500">*</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 ml-7">
          Subí el contrato laboral o el certificado de ingresos — basta con uno.
        </p>

        {oneOfError && (
          <p className="text-xs text-red-500 mb-3">{oneOfError}</p>
        )}

        <div className="space-y-6">
          <div>
            {mode !== 'update' && documents.employmentLetter?.fileName && !documents.employmentLetter?.file && (
              <div className="mb-2"><StaleDocWarning /></div>
            )}
            <DocumentUpload
              label="Contrato laboral"
              accept=".pdf"
              maxSizeMB={5}
              value={documents.employmentLetter || null}
              onChange={(data) => handleDocumentChange('employmentLetter', data)}
              onDelete={buildOnDelete('employmentLetter')}
              hint="Carta con fecha reciente indicando cargo y salario"
            />
          </div>

          <div>
            {mode !== 'update' && documents.incomeProof?.fileName && !documents.incomeProof?.file && (
              <div className="mb-2"><StaleDocWarning /></div>
            )}
            <DocumentUpload
              label="Certificado de ingresos"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={5}
              value={documents.incomeProof || null}
              onChange={(data) => handleDocumentChange('incomeProof', data)}
              onDelete={buildOnDelete('incomeProof')}
              hint="Últimos 3 desprendibles de nómina o declaración de renta"
            />
          </div>
        </div>
      </section>

      {/* Section 3 — Optional */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Documentos opcionales
          </h3>
          <span className="text-xs text-muted-foreground ml-1">
            (mejoran tu perfil)
          </span>
        </div>

        <div className="space-y-6">
          <div>
            {mode !== 'update' && documents.payStub?.fileName && !documents.payStub?.file && (
              <div className="mb-2"><StaleDocWarning /></div>
            )}
            <DocumentUpload
              label="Colilla de nómina"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={5}
              value={documents.payStub || null}
              onChange={(data) => handleDocumentChange('payStub', data)}
              onDelete={buildOnDelete('payStub')}
              hint="Último desprendible de pago de tu empleador"
            />
          </div>

          <div>
            {mode !== 'update' && documents.creditReport?.fileName && !documents.creditReport?.file && (
              <div className="mb-2"><StaleDocWarning /></div>
            )}
            <DocumentUpload
              label="Reporte de crédito"
              accept=".pdf"
              maxSizeMB={5}
              value={documents.creditReport || null}
              onChange={(data) => handleDocumentChange('creditReport', data)}
              onDelete={buildOnDelete('creditReport')}
              hint="Descarga gratuita de Datacrédito o TransUnion"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
