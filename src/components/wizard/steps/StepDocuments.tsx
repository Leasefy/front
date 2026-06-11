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

  const hasEmploymentOrIncome =
    !!(documents.employmentLetter?.file || documents.employmentLetter?.fileName) ||
    !!(documents.incomeProof?.file || documents.incomeProof?.fileName);

  const oneOfError =
    attemptedAdvance && !hasEmploymentOrIncome
      ? 'Debés subir al menos uno: contrato laboral o certificado de ingresos'
      : undefined;

  return (
    <div className="space-y-6">
      {/* Warning about file persistence */}
      <div className="flex items-start gap-3 p-4 bg-[#F8F0E0]/50 border border-[#B7791F]/30 rounded-sm">
        <Warning className="h-5 w-5 text-[#B7791F] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-[#B7791F] font-medium">
            Importante sobre tus documentos
          </p>
          <p className="text-xs text-[#B7791F]/80 mt-1">
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
          <span className="text-xs text-[#C4503B]">*</span>
        </div>

        <div className="space-y-6">
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
      </section>

      {/* Section 2 — One of two required */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <ArrowsHorizontal className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Uno de los dos obligatorio
          </h3>
          <span className="text-xs text-[#C4503B]">*</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 ml-7">
          Subí el contrato laboral o el certificado de ingresos — basta con uno.
        </p>

        {oneOfError && (
          <p className="text-xs text-[#C4503B] mb-3">{oneOfError}</p>
        )}

        <div className="space-y-6">
          <DocumentUpload
            label="Contrato laboral"
            accept=".pdf"
            maxSizeMB={5}
            value={documents.employmentLetter || null}
            onChange={(data) => handleDocumentChange('employmentLetter', data)}
            onDelete={buildOnDelete('employmentLetter')}
            hint="Carta con fecha reciente indicando cargo y salario"
          />

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
          <DocumentUpload
            label="Colilla de nómina"
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={5}
            value={documents.payStub || null}
            onChange={(data) => handleDocumentChange('payStub', data)}
            onDelete={buildOnDelete('payStub')}
            hint="Último desprendible de pago de tu empleador"
          />

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
      </section>
    </div>
  );
}
