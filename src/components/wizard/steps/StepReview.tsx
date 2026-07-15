'use client';

import { useCallback } from 'react';
import { User, Briefcase, CurrencyDollar, Users, FileText, Pencil, Check, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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
    consentText,
    mode,
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
        <div className="flex items-start gap-3 p-4 bg-warning-soft border border-warning/30 rounded-sm">
          <WarningCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-warning font-medium">
              Algunos pasos están incompletos
            </p>
            <p className="text-xs text-warning/80 mt-1">
              Completa todos los pasos antes de enviar tu aplicación.
            </p>
          </div>
        </div>
      )}

      {/* Personal Information Summary */}
      <SummaryCard
        icon={<User className="h-5 w-5 text-muted-foreground" />}
        title="Información Personal"
        onEdit={() => goToStep(1)}
      >
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-foreground">{personal.fullName || '-'}</p>
          <p className="text-muted-foreground">
            {getOptionLabel(DOCUMENT_TYPES, personal.documentType)} {personal.documentNumber || ''}
          </p>
          <p className="text-muted-foreground">
            {personal.email || '-'} | {personal.phone || '-'}
          </p>
          <p className="text-muted-foreground">{personal.currentAddress || '-'}</p>
          {personal.timeAtCurrentAddress !== undefined && personal.timeAtCurrentAddress > 0 && (
            <p className="text-muted-foreground text-xs">
              {personal.timeAtCurrentAddress} meses en dirección actual
            </p>
          )}
        </div>
      </SummaryCard>

      {/* Employment Summary */}
      <SummaryCard
        icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
        title="Empleo"
        onEdit={() => goToStep(2)}
      >
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-foreground">
            {getOptionLabel(EMPLOYMENT_STATUS_OPTIONS, employment.employmentStatus)}
            {employment.contractType &&
              ` - ${getOptionLabel(CONTRACT_TYPE_OPTIONS, employment.contractType)}`}
          </p>
          {employment.companyName && (
            <p className="text-muted-foreground">{employment.companyName}</p>
          )}
          {employment.position && (
            <p className="text-muted-foreground">{employment.position}</p>
          )}
          {employment.timeAtJob !== undefined && employment.timeAtJob > 0 && (
            <p className="text-muted-foreground text-xs">
              {employment.timeAtJob} meses de antigüedad
            </p>
          )}
        </div>
      </SummaryCard>

      {/* Income Summary */}
      <SummaryCard
        icon={<CurrencyDollar className="h-5 w-5 text-muted-foreground" />}
        title="Ingresos"
        onEdit={() => goToStep(3)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salario:</span>
            <span className="font-medium text-foreground">
              {income.monthlySalary ? formatCurrency(income.monthlySalary) : '-'}
            </span>
          </div>
          {income.additionalIncome !== undefined && income.additionalIncome > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adicional:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(income.additionalIncome)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Obligaciones:</span>
            <span className="font-medium text-danger">
              {income.monthlyObligations !== undefined
                ? formatCurrency(income.monthlyObligations)
                : '-'}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-foreground font-medium">Disponible:</span>
            <span className="font-semibold text-success">
              {income.availableForRent ? formatCurrency(income.availableForRent) : '-'}
            </span>
          </div>
        </div>
      </SummaryCard>

      {/* References Summary */}
      <SummaryCard
        icon={<Users className="h-5 w-5 text-muted-foreground" />}
        title="Referencias"
        onEdit={() => goToStep(4)}
      >
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            {landlordCount} arrendador{landlordCount !== 1 ? 'es' : ''} anterior
            {landlordCount !== 1 ? 'es' : ''}
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            {employmentRefCount} referencia{employmentRefCount !== 1 ? 's' : ''} laboral
            {employmentRefCount !== 1 ? 'es' : ''}
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            {personalRefCount} referencia{personalRefCount !== 1 ? 's' : ''} personal
            {personalRefCount !== 1 ? 'es' : ''}
          </p>
        </div>
      </SummaryCard>

      {/* Documents Summary */}
      <SummaryCard
        icon={<FileText className="h-5 w-5 text-muted-foreground" />}
        title="Documentos"
        onEdit={() => goToStep(5)}
      >
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <DocumentStatus
            label="Documento de identidad"
            uploaded={mode === 'update'
              ? (!!documents.idDocument?.fileName || !!documents.idDocument?.file)
              : !!documents.idDocument?.file}
            required
          />
          <DocumentStatus
            label="Extracto bancario"
            uploaded={mode === 'update'
              ? (!!documents.bankStatement?.fileName || !!documents.bankStatement?.file)
              : !!documents.bankStatement?.file}
            required
          />
          <DocumentStatus
            label="Contrato laboral"
            uploaded={mode === 'update'
              ? (!!documents.employmentLetter?.fileName || !!documents.employmentLetter?.file)
              : !!documents.employmentLetter?.file}
          />
          <DocumentStatus
            label="Certificado de ingresos"
            uploaded={mode === 'update'
              ? (!!documents.incomeProof?.fileName || !!documents.incomeProof?.file)
              : !!documents.incomeProof?.file}
          />
          <DocumentStatus
            label="Colilla de nómina"
            uploaded={mode === 'update'
              ? (!!documents.payStub?.fileName || !!documents.payStub?.file)
              : !!documents.payStub?.file}
          />
          <DocumentStatus
            label="Reporte de crédito"
            uploaded={mode === 'update'
              ? (!!documents.creditReport?.fileName || !!documents.creditReport?.file)
              : !!documents.creditReport?.file}
          />
        </div>
      </SummaryCard>

      {/* Terms and Conditions */}
      <div className="border-t border-border pt-6 space-y-4">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={(c) => handleTermsChange(c === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground/70">
              Acepto los{' '}
              <a href="/terminos" className="text-foreground underline hover:no-underline">
                terminos y condiciones
              </a>{' '}
              del servicio
            </span>
          </label>

          {/* Habeas-data consent block */}
          <div className="flex flex-col gap-2">
            {consentText ? (
              <div className="border border-border rounded-md bg-muted/30 p-3">
                <p className="text-xs font-medium text-foreground mb-1.5">
                  {consentText.title}
                </p>
                <div
                  className="text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto pr-1"
                  data-testid="consent-text-body"
                >
                  {consentText.text}
                </div>
              </div>
            ) : null}

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="authorizeVerification"
                checked={authorizeVerification}
                onCheckedChange={(c) => handleAuthorizationChange(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground/70">
                {consentText
                  ? 'He leído y autorizo el tratamiento de mis datos personales'
                  : 'Autorizo la verificación de mis datos personales, laborales y crediticios'}
              </span>
            </label>
          </div>
        </div>

        {!acceptTerms || !authorizeVerification ? (
          <p className="text-xs text-muted-foreground">
            Acepta los términos y autoriza la verificación para continuar.
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
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-hover border-b border-border">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={onEdit}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
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
    <p className={cn(
      'flex items-center gap-2',
      !uploaded && required && 'text-danger'
    )}>
      {uploaded ? (
        <Check className="h-4 w-4 text-success" />
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
