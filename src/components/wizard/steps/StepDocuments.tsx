'use client';

import { useCallback } from 'react';
import { Warning, FileText, FolderOpen } from '@phosphor-icons/react';
import { DocumentUpload } from '@/components/wizard/DocumentUpload';
import { useApplication } from '@/lib/context/ApplicationContext';
import { validateDocumentsStep } from '@/lib/validation/applicationValidation';
import type { DocumentUpload as DocumentUploadTextT } from '@/lib/types/application';

// ============================================================================
// Component
// ============================================================================

/**
 * StepDocuments - Step 5 of application wizard
 * Collects documents with Luxterra-style UI
 */
export function StepDocuments() {
  const { application, updateDocuments, attemptedAdvance } = useApplication();
  const documents = application.documents;

  // Validate documents
  const validation = validateDocumentsStep(documents);

  // Get error for document (only show if user tried to advance)
  const getDocumentError = useCallback(
    (fieldName: string): string | undefined => {
      return attemptedAdvance ? validation.errors[fieldName] : undefined;
    },
    [attemptedAdvance, validation.errors]
  );

  // Handle document change
  const handleDocumentChange = useCallback(
    (
      field: 'idDocument' | 'incomeProof' | 'employmentLetter' | 'bankStatements' | 'creditReport',
      data: DocumentUploadTextT | null
    ) => {
      updateDocuments({ [field]: data });
    },
    [updateDocuments]
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

      {/* Required Documents Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Documentos Requeridos
          </h3>
          <span className="text-xs text-red-500">*</span>
        </div>

        <div className="space-y-6">
          {/* ID Document */}
          <DocumentUpload
            label="Documento de identidad"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={5}
            value={documents.idDocument || null}
            onChange={(data) => handleDocumentChange('idDocument', data)}
            hint="Cédula de ciudadanía o extranjería por ambos lados"
            error={getDocumentError('idDocument')}
          />

          {/* Income Proof */}
          <DocumentUpload
            label="Comprobante de ingresos"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={5}
            value={documents.incomeProof || null}
            onChange={(data) => handleDocumentChange('incomeProof', data)}
            hint="Últimos 3 desprendibles de nómina o declaración de renta"
            error={getDocumentError('incomeProof')}
          />
        </div>
      </section>

      {/* Optional Documents Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Documentos Opcionales
          </h3>
          <span className="text-xs text-muted-foreground ml-1">
            (mejoran tu perfil)
          </span>
        </div>

        <div className="space-y-6">
          {/* Employment Letter */}
          <DocumentUpload
            label="Carta laboral"
            accept=".pdf"
            maxSizeMB={5}
            value={documents.employmentLetter || null}
            onChange={(data) => handleDocumentChange('employmentLetter', data)}
            hint="Carta con fecha reciente indicando cargo y salario"
          />

          {/* Bank Statements */}
          <DocumentUpload
            label="Extractos bancarios"
            accept=".pdf"
            maxSizeMB={5}
            value={documents.bankStatements || null}
            onChange={(data) => handleDocumentChange('bankStatements', data)}
            hint="Últimos 3 meses de tu cuenta principal"
          />

          {/* Credit Report */}
          <DocumentUpload
            label="Reporte de crédito"
            accept=".pdf"
            maxSizeMB={5}
            value={documents.creditReport || null}
            onChange={(data) => handleDocumentChange('creditReport', data)}
            hint="Descarga gratuita de Datacrédito o TransUnion"
          />
        </div>
      </section>
    </div>
  );
}
