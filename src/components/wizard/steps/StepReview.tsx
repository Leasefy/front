'use client';

import { useCallback } from 'react';
import {
  User,
  Briefcase,
  DollarSign,
  Users,
  FileText,
  Pencil,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useApplication } from '@/lib/context/ApplicationContext';
import {
  DOCUMENT_TYPES,
  MARITAL_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
} from '@/lib/types/application';

// ============================================================================
// Component
// ============================================================================

/**
 * StepReview - Step 6 of application wizard
 * Shows summary of all data with edit capability and terms acceptance
 */
export function StepReview() {
  const {
    application,
    goToStep,
    isStepCompleted,
    acceptTerms,
    setAcceptTerms,
    authorizeVerification,
    setAuthorizeVerification,
  } = useApplication();
  const { personal, employment, income, references, documents } = application;

  // Check if all required steps are complete
  const allStepsComplete =
    isStepCompleted(1) &&
    isStepCompleted(2) &&
    isStepCompleted(3) &&
    isStepCompleted(4) &&
    isStepCompleted(5);

  // Get label from options
  const getOptionLabel = (
    options: readonly { value: string; label: string }[],
    value: string | undefined
  ): string => {
    return options.find((o) => o.value === value)?.label || value || '-';
  };

  // Count references
  const landlordCount = references.previousLandlords?.length || 0;
  const employmentRefCount = references.employmentReferences?.length || 0;
  const personalRefCount = references.personalReferences?.length || 0;

  // Count documents
  const uploadedDocs = [
    documents.idDocument?.fileName || documents.idDocument?.file,
    documents.incomeProof?.fileName || documents.incomeProof?.file,
    documents.employmentLetter?.fileName || documents.employmentLetter?.file,
    documents.bankStatements?.fileName || documents.bankStatements?.file,
    documents.creditReport?.fileName || documents.creditReport?.file,
  ].filter(Boolean).length;

  const handleTermsChange = useCallback(
    (checked: boolean) => {
      setAcceptTerms(checked);
    },
    [setAcceptTerms]
  );

  const handleAuthorizationChange = useCallback(
    (checked: boolean) => {
      setAuthorizeVerification(checked);
    },
    [setAuthorizeVerification]
  );

  return (
    <div className="space-y-6">
      {/* Incomplete steps warning */}
      {!allStepsComplete && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">
              Algunos pasos estan incompletos
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Completa todos los pasos antes de enviar tu aplicacion.
            </p>
          </div>
        </div>
      )}

      {/* Personal Information Summary */}
      <SummaryCard
        icon={<User className="h-5 w-5 text-blue-600" />}
        title="Informacion Personal"
        onEdit={() => goToStep(1)}
      >
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-gray-900">{personal.fullName || '-'}</p>
          <p className="text-gray-600">
            {getOptionLabel(DOCUMENT_TYPES, personal.documentType)} {personal.documentNumber || ''}
          </p>
          <p className="text-gray-600">
            {personal.email || '-'} | {personal.phone || '-'}
          </p>
          <p className="text-gray-600">{personal.currentAddress || '-'}</p>
          {personal.timeAtCurrentAddress !== undefined && personal.timeAtCurrentAddress > 0 && (
            <p className="text-gray-500 text-xs">
              {personal.timeAtCurrentAddress} meses en direccion actual
            </p>
          )}
        </div>
      </SummaryCard>

      {/* Employment Summary */}
      <SummaryCard
        icon={<Briefcase className="h-5 w-5 text-green-600" />}
        title="Empleo"
        onEdit={() => goToStep(2)}
      >
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-gray-900">
            {getOptionLabel(EMPLOYMENT_STATUS_OPTIONS, employment.employmentStatus)}
            {employment.contractType &&
              ` - ${getOptionLabel(CONTRACT_TYPE_OPTIONS, employment.contractType)}`}
          </p>
          {employment.companyName && (
            <p className="text-gray-600">{employment.companyName}</p>
          )}
          {employment.position && (
            <p className="text-gray-600">{employment.position}</p>
          )}
          {employment.timeAtJob !== undefined && employment.timeAtJob > 0 && (
            <p className="text-gray-500 text-xs">
              {employment.timeAtJob} meses de antiguedad
            </p>
          )}
        </div>
      </SummaryCard>

      {/* Income Summary */}
      <SummaryCard
        icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
        title="Ingresos"
        onEdit={() => goToStep(3)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Salario:</span>
            <span className="font-medium">
              {income.monthlySalary ? formatCurrency(income.monthlySalary) : '-'}
            </span>
          </div>
          {income.additionalIncome !== undefined && income.additionalIncome > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Adicional:</span>
              <span className="font-medium">
                {formatCurrency(income.additionalIncome)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Obligaciones:</span>
            <span className="font-medium text-red-600">
              {income.monthlyObligations !== undefined
                ? formatCurrency(income.monthlyObligations)
                : '-'}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="text-gray-700 font-medium">Disponible:</span>
            <span className="font-semibold text-emerald-600">
              {income.availableForRent ? formatCurrency(income.availableForRent) : '-'}
            </span>
          </div>
        </div>
      </SummaryCard>

      {/* References Summary */}
      <SummaryCard
        icon={<Users className="h-5 w-5 text-purple-600" />}
        title="Referencias"
        onEdit={() => goToStep(4)}
      >
        <div className="space-y-1.5 text-sm text-gray-600">
          <p>
            <Check className="h-4 w-4 inline mr-1 text-green-500" />
            {landlordCount} arrendador{landlordCount !== 1 ? 'es' : ''} anterior
            {landlordCount !== 1 ? 'es' : ''}
          </p>
          <p>
            <Check className="h-4 w-4 inline mr-1 text-green-500" />
            {employmentRefCount} referencia{employmentRefCount !== 1 ? 's' : ''} laboral
            {employmentRefCount !== 1 ? 'es' : ''}
          </p>
          <p>
            <Check className="h-4 w-4 inline mr-1 text-green-500" />
            {personalRefCount} referencia{personalRefCount !== 1 ? 's' : ''} personal
            {personalRefCount !== 1 ? 'es' : ''}
          </p>
        </div>
      </SummaryCard>

      {/* Documents Summary */}
      <SummaryCard
        icon={<FileText className="h-5 w-5 text-orange-600" />}
        title="Documentos"
        onEdit={() => goToStep(5)}
      >
        <div className="space-y-1.5 text-sm text-gray-600">
          <DocumentStatus
            label="Documento de identidad"
            uploaded={!!documents.idDocument?.fileName || !!documents.idDocument?.file}
            required
          />
          <DocumentStatus
            label="Comprobante de ingresos"
            uploaded={!!documents.incomeProof?.fileName || !!documents.incomeProof?.file}
            required
          />
          <DocumentStatus
            label="Carta laboral"
            uploaded={!!documents.employmentLetter?.fileName || !!documents.employmentLetter?.file}
          />
          <DocumentStatus
            label="Extractos bancarios"
            uploaded={!!documents.bankStatements?.fileName || !!documents.bankStatements?.file}
          />
          <DocumentStatus
            label="Reporte de credito"
            uploaded={!!documents.creditReport?.fileName || !!documents.creditReport?.file}
          />
        </div>
      </SummaryCard>

      {/* Terms and Conditions */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={handleTermsChange}
            />
            <Label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
              Acepto los{' '}
              <a href="#" className="text-blue-600 hover:underline">
                terminos y condiciones
              </a>{' '}
              del servicio
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="authorizeVerification"
              checked={authorizeVerification}
              onCheckedChange={handleAuthorizationChange}
            />
            <Label
              htmlFor="authorizeVerification"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Autorizo la verificacion de mis datos personales, laborales y
              crediticios
            </Label>
          </div>
        </div>

        {!acceptTerms || !authorizeVerification ? (
          <p className="text-xs text-gray-500">
            Acepta los terminos y autoriza la verificacion para continuar.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// SummaryCard Component
// ============================================================================

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function SummaryCard({ icon, title, onEdit, children }: SummaryCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ============================================================================
// DocumentStatus Component
// ============================================================================

interface DocumentStatusProps {
  label: string;
  uploaded: boolean;
  required?: boolean;
}

function DocumentStatus({ label, uploaded, required }: DocumentStatusProps) {
  return (
    <p className={cn(!uploaded && required && 'text-red-600')}>
      {uploaded ? (
        <Check className="h-4 w-4 inline mr-1 text-green-500" />
      ) : (
        <span className="h-4 w-4 inline-block mr-1 text-center">
          {required ? '!' : '-'}
        </span>
      )}
      {label}
      {required && !uploaded && ' (requerido)'}
    </p>
  );
}

// ============================================================================
// Export validation check
// ============================================================================

export function useReviewValidation() {
  const { application, isStepCompleted } = useApplication();

  const allStepsComplete =
    isStepCompleted(1) &&
    isStepCompleted(2) &&
    isStepCompleted(3) &&
    isStepCompleted(4) &&
    isStepCompleted(5);

  return { allStepsComplete };
}
