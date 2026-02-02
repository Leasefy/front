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
 * Luxterra-style summary with edit capability and terms acceptance
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
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-200/50 rounded-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">
              Algunos pasos estan incompletos
            </p>
            <p className="text-xs text-amber-700/80 mt-1">
              Completa todos los pasos antes de enviar tu aplicacion.
            </p>
          </div>
        </div>
      )}

      {/* Personal Information Summary */}
      <SummaryCard
        icon={<User className="h-5 w-5 text-black/60" />}
        title="Informacion Personal"
        onEdit={() => goToStep(1)}
      >
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-black">{personal.fullName || '-'}</p>
          <p className="text-black/60">
            {getOptionLabel(DOCUMENT_TYPES, personal.documentType)} {personal.documentNumber || ''}
          </p>
          <p className="text-black/60">
            {personal.email || '-'} | {personal.phone || '-'}
          </p>
          <p className="text-black/60">{personal.currentAddress || '-'}</p>
          {personal.timeAtCurrentAddress !== undefined && personal.timeAtCurrentAddress > 0 && (
            <p className="text-black/40 text-xs">
              {personal.timeAtCurrentAddress} meses en direccion actual
            </p>
          )}
        </div>
      </SummaryCard>

      {/* Employment Summary */}
      <SummaryCard
        icon={<Briefcase className="h-5 w-5 text-black/60" />}
        title="Empleo"
        onEdit={() => goToStep(2)}
      >
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-black">
            {getOptionLabel(EMPLOYMENT_STATUS_OPTIONS, employment.employmentStatus)}
            {employment.contractType &&
              ` - ${getOptionLabel(CONTRACT_TYPE_OPTIONS, employment.contractType)}`}
          </p>
          {employment.companyName && (
            <p className="text-black/60">{employment.companyName}</p>
          )}
          {employment.position && (
            <p className="text-black/60">{employment.position}</p>
          )}
          {employment.timeAtJob !== undefined && employment.timeAtJob > 0 && (
            <p className="text-black/40 text-xs">
              {employment.timeAtJob} meses de antiguedad
            </p>
          )}
        </div>
      </SummaryCard>

      {/* Income Summary */}
      <SummaryCard
        icon={<DollarSign className="h-5 w-5 text-black/60" />}
        title="Ingresos"
        onEdit={() => goToStep(3)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-black/60">Salario:</span>
            <span className="font-medium text-black">
              {income.monthlySalary ? formatCurrency(income.monthlySalary) : '-'}
            </span>
          </div>
          {income.additionalIncome !== undefined && income.additionalIncome > 0 && (
            <div className="flex justify-between">
              <span className="text-black/60">Adicional:</span>
              <span className="font-medium text-black">
                {formatCurrency(income.additionalIncome)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-black/60">Obligaciones:</span>
            <span className="font-medium text-red-600">
              {income.monthlyObligations !== undefined
                ? formatCurrency(income.monthlyObligations)
                : '-'}
            </span>
          </div>
          <div className="border-t border-black/5 pt-2 flex justify-between">
            <span className="text-black font-medium">Disponible:</span>
            <span className="font-semibold text-emerald-600">
              {income.availableForRent ? formatCurrency(income.availableForRent) : '-'}
            </span>
          </div>
        </div>
      </SummaryCard>

      {/* References Summary */}
      <SummaryCard
        icon={<Users className="h-5 w-5 text-black/60" />}
        title="Referencias"
        onEdit={() => goToStep(4)}
      >
        <div className="space-y-1.5 text-sm text-black/60">
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            {landlordCount} arrendador{landlordCount !== 1 ? 'es' : ''} anterior
            {landlordCount !== 1 ? 'es' : ''}
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            {employmentRefCount} referencia{employmentRefCount !== 1 ? 's' : ''} laboral
            {employmentRefCount !== 1 ? 'es' : ''}
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            {personalRefCount} referencia{personalRefCount !== 1 ? 's' : ''} personal
            {personalRefCount !== 1 ? 'es' : ''}
          </p>
        </div>
      </SummaryCard>

      {/* Documents Summary */}
      <SummaryCard
        icon={<FileText className="h-5 w-5 text-black/60" />}
        title="Documentos"
        onEdit={() => goToStep(5)}
      >
        <div className="space-y-1.5 text-sm text-black/60">
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
      <div className="border-t border-black/5 pt-6 space-y-4">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={acceptTerms}
              onChange={(e) => handleTermsChange(e.target.checked)}
              className={cn(
                'mt-0.5 h-4 w-4 rounded-sm border border-black/20',
                'focus:ring-2 focus:ring-black/10 focus:ring-offset-0',
                'checked:bg-black checked:border-black',
                'appearance-none cursor-pointer relative',
                'after:content-[""] after:absolute after:hidden',
                'after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px]',
                'after:border-white after:border-r-2 after:border-b-2 after:rotate-45',
                'checked:after:block'
              )}
            />
            <span className="text-sm text-black/70">
              Acepto los{' '}
              <a href="#" className="text-black underline hover:no-underline">
                terminos y condiciones
              </a>{' '}
              del servicio
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="authorizeVerification"
              checked={authorizeVerification}
              onChange={(e) => handleAuthorizationChange(e.target.checked)}
              className={cn(
                'mt-0.5 h-4 w-4 rounded-sm border border-black/20',
                'focus:ring-2 focus:ring-black/10 focus:ring-offset-0',
                'checked:bg-black checked:border-black',
                'appearance-none cursor-pointer relative',
                'after:content-[""] after:absolute after:hidden',
                'after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px]',
                'after:border-white after:border-r-2 after:border-b-2 after:rotate-45',
                'checked:after:block'
              )}
            />
            <span className="text-sm text-black/70">
              Autorizo la verificacion de mis datos personales, laborales y
              crediticios
            </span>
          </label>
        </div>

        {!acceptTerms || !authorizeVerification ? (
          <p className="text-xs text-black/40">
            Acepta los terminos y autoriza la verificacion para continuar.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// SummaryCard Component - Luxterra style
// ============================================================================

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function SummaryCard({ icon, title, onEdit, children }: SummaryCardProps) {
  return (
    <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-black/[0.02] border-b border-black/5">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-medium text-black">{title}</h4>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
            'text-black/60 hover:text-black',
            'rounded-sm hover:bg-black/5 transition-colors'
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
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
    <p className={cn(
      'flex items-center gap-2',
      !uploaded && required && 'text-red-600'
    )}>
      {uploaded ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <span className="h-4 w-4 flex items-center justify-center text-xs">
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
  const { isStepCompleted } = useApplication();

  const allStepsComplete =
    isStepCompleted(1) &&
    isStepCompleted(2) &&
    isStepCompleted(3) &&
    isStepCompleted(4) &&
    isStepCompleted(5);

  return { allStepsComplete };
}
