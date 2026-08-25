'use client';

import { useCallback } from 'react';
import { Warning, FileText } from '@phosphor-icons/react';
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
 * Only 2 document types, both REQUIRED (T-0020 slimming):
 *   - idDocument (cédula)
 *   - bankStatement (extracto bancario)
 */
export function StepDocuments() {
  const { application, updateDocuments, attemptedAdvance, mode, existingApplicationId } = useApplication();
  const documents = application.documents;

  type DocField = 'idDocument' | 'bankStatement';

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

  // Shown above a document slot when the file was lost on page reload (create mode only).
  const StaleDocWarning = () => (
    <div className="flex items-start gap-2 p-3 bg-warning-soft border border-warning/30 rounded-sm">
      <Warning className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
      <p className="text-xs text-warning">
        Volvé a adjuntar este archivo — se desconectó al recargar la página
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Warning about file persistence */}
      <div className="flex items-start gap-3 p-4 bg-warning-soft border border-warning/30 rounded-sm">
        <Warning className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-warning font-medium">
            Importante sobre tus documentos
          </p>
          <p className="text-xs text-warning/80 mt-1">
            Los archivos se guardan temporalmente. Si cierras esta página, tendrás que
            volver a subirlos.
          </p>
        </div>
      </div>

      {/* Documentos obligatorios */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Documentos obligatorios
          </h3>
          <span className="text-xs text-danger">*</span>
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
    </div>
  );
}
