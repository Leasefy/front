'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Clock, CheckCircle, WarningCircle, Upload, Shield, X, Check, House, Bed, Users, MapPin, User, Calendar, CurrencyDollar } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, Spinner } from '@/components/ui';
import { Eyebrow, StatusBadge, MonoLabel } from '@leasefy/cadence';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { InsuranceSelector } from '@/components/contract/InsuranceSelector';
import { AuditTrail } from '@/components/contract/AuditTrail';
import type { SelectedInsurance } from '@/lib/types/insurance';
import { CONTRACT_TEMPLATES, getTemplateById } from '@/lib/constants/contract-templates';
import { useContracts, useContractActions } from '@/lib/hooks/useContracts';
import { useLandlordProperty, useCandidate } from '@/lib/hooks/useLandlord';
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_DESCRIPTIONS, getContractTypeLabel } from '@/lib/types/contract';
import type { Contract, ContractType } from '@/lib/types/contract';

// ============================================================================
// TextTs
// ============================================================================

interface ContractPageProps {
  params: {
    propertyId: string;
    candidateId: string;
  };
}

// ============================================================================
// Contract Type Selector Component
// ============================================================================

interface ContractTypeSelectorProps {
  selectedType: ContractType | null;
  onSelect: (type: ContractType) => void;
  uploadedFile: File | null;
  onFileChange: (file: File | null) => void;
}

// Template icons mapping
const TEMPLATE_ICONS: Record<ContractType, React.ElementType> = {
  basico: House,
  amoblado: Bed,
  compartido: Users,
  custom: Upload,
};

function ContractTypeSelector({ selectedType, onSelect, uploadedFile, onFileChange }: ContractTypeSelectorProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
      onSelect('custom');
    }
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    // Reset to no selection
    onSelect(null as unknown as ContractType);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Platform templates - Main column - Own card */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-fg">
                  Contratos Leasefy
                </h3>
                <StatusBadge tone="info" dot={false}>Recomendado</StatusBadge>
              </div>
              <p className="text-sm text-fg-muted">
                Plantillas verificadas por nuestro equipo legal
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {CONTRACT_TEMPLATES.map((template) => {
              const Icon = TEMPLATE_ICONS[template.type];
              const isSelected = selectedType === template.type;
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => { onSelect(template.type); onFileChange(null); }}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all group',
                    isSelected
                      ? 'border-primary bg-primary-soft ring-2 ring-primary'
                      : 'border-border hover:border-border-strong hover:bg-surface-hover'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary-soft'
                        : 'bg-surface-muted group-hover:bg-surface-hover'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        isSelected
                          ? 'text-primary'
                          : 'text-fg-muted'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-fg">
                          {CONTRACT_TYPE_LABELS[template.type]}
                        </h4>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-fg-muted">
                        {CONTRACT_TYPE_DESCRIPTIONS[template.type]}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom upload - Side column - Own card */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6">
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-fg-muted" />
              </div>
              <div>
                <h3 className="font-semibold text-fg">
                  ¿Ya tienes contrato?
                </h3>
                <p className="text-xs text-fg-muted">
                  Sube tu PDF para firma digital
                </p>
              </div>
            </div>

            {!uploadedFile ? (
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all',
                  selectedType === 'custom'
                    ? 'border-primary bg-primary-soft'
                    : 'border-border-strong hover:border-border-strong bg-surface-muted'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-fg-subtle" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-fg-muted">
                    Haz clic para subir
                  </p>
                  <p className="text-xs text-fg-muted mt-1">
                    PDF, máx. 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            ) : (
              <div className={cn(
                'flex items-center gap-3 w-full rounded-xl border p-4 transition-all',
                'border-primary bg-primary-soft'
              )}>
                <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="text-fg-muted"
                  aria-label="Quitar archivo"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Fallback
// ============================================================================

function ContractPageLoading() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" variant="muted" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Inner Component (uses useSearchParams)
// ============================================================================

function ContractPageContent({ propertyId, candidateId }: { propertyId: string; candidateId: string }) {
  const { locale } = useI18n();
  const searchParams = useSearchParams();

  // Check if we should force starting fresh (new contract flow)
  const forceNew = searchParams.get('new') === 'true';

  // Fetch real data from API
  const { property, isLoading: propertyLoading } = useLandlordProperty(propertyId);
  const { candidate, isLoading: candidateLoading } = useCandidate(candidateId);
  const { getByPropertyAndTenant, refetch: refetchContracts } = useContracts();
  const actions = useContractActions();

  // State
  const [contract, setContract] = useState<Contract | null>(null);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<SelectedInsurance>({
    policyId: null,
    tier: 'none',
    monthlyPremium: 0,
  });

  // Get existing contract or null (skip if forceNew is true)
  useEffect(() => {
    if (forceNew) {
      setContract(null);
      return;
    }
    const existingContract = getByPropertyAndTenant(propertyId, candidateId);
    if (existingContract) {
      setContract(existingContract);
    }
  }, [propertyId, candidateId, forceNew, getByPropertyAndTenant]);

  // Handle contract creation via API
  const handleCreateContract = async () => {
    // `property.monthlyRent == null` — same SALE-listing guard as the
    // "not found" render branch below; kept here too since this closure is
    // defined before that narrowing in source order (contract.md §3.2.4, C6).
    if (!selectedType || !property || property.monthlyRent == null) return;

    // TODO (paso 2): reemplazar por un form real que capture fechas, depósito y día de pago.
    // Hoy usamos defaults razonables derivados de la propiedad.
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);
    const endDate = end.toISOString().slice(0, 10);

    setIsCreating(true);
    const newContract = await actions.create({
      applicationId: candidateId, // candidateId === applicationId en esta ruta
      startDate,
      endDate,
      monthlyRent: property.monthlyRent,
      deposit: property.deposit ?? property.monthlyRent,
      paymentDay: 1,
      insuranceTier: 'NONE',
    });
    void selectedType;
    if (newContract) {
      setContract(newContract);
      refetchContracts();
    }
    setIsCreating(false);
  };

  // Map the UI tier ('none'|'basic'|'premium') to the contract DTO tier ('NONE'|'BASIC'|'PREMIUM').
  const INSURANCE_TIER_MAP = { none: 'NONE', basic: 'BASIC', premium: 'PREMIUM' } as const;

  // Handle signing via API
  const handleSign = async ({ signatureData, otpVerificationToken }: { otpVerified: boolean; signatureData: string; otpVerificationToken?: string }) => {
    if (!contract) return;

    setIsSigning(true);

    // Persist the selected insurance tier BEFORE collecting the signature.
    // UpdateContractDto edits invalidate the landlord signature (contracts.types.ts:185),
    // so the insurance update must happen first to avoid a re-sign loop.
    const desiredTier = INSURANCE_TIER_MAP[selectedInsurance.tier];
    let contractToSign = contract;
    if (desiredTier !== contractToSign.insuranceTier) {
      const updatedTier = await actions.update(contractToSign.id, { insuranceTier: desiredTier });
      if (updatedTier) {
        contractToSign = updatedTier;
        setContract(updatedTier);
      }
    }

    const consent = contractToSign.uploadedPdfPath
      ? 'Confirmo digitalmente que el PDF adjunto contiene mi firma manuscrita/presencial y acepto todos sus términos.'
      : 'Acepto los términos y condiciones de este contrato de arrendamiento y confirmo que la información proporcionada es verídica.';
    const updated = await actions.signAsLandlord(contractToSign.id, {
      acceptedTerms: true,
      consentText: consent,
      signatureData,
      otpVerificationToken,
    });
    if (updated) {
      setContract(updated);
      refetchContracts();
    }
    setIsSigning(false);
  };

  // Loading state
  if (propertyLoading || candidateLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" variant="muted" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  // `property.monthlyRent == null` — T-0038: a SALE listing has no canon
  // (contract.md §3.2.4). A candidate/Application only exists for a RENT
  // listing (postulación against SALE is a 409, §3.3), so this branch is not
  // expected in practice — treated the same as "not found" rather than
  // creating a contract with a fabricated $0 rent (C6).
  if (!property || !candidate || property.monthlyRent == null) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <BackButton href={`/panel/${propertyId}`} label="Volver a candidatos" />
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-surface-muted flex items-center justify-center mx-auto">
              <WarningCircle className="h-8 w-8 text-fg-subtle" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-fg">
              Información no encontrada
            </h2>
            <p className="mt-2 text-fg-muted">
              No se pudo encontrar la propiedad o el candidato especificado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get template and steps if contract exists
  const template = contract ? getTemplateById(contract.templateId) : null;
  const isLandlordTurn = contract?.status === 'pending_landlord';
  const isTenantTurn = contract?.status === 'pending_tenant';
  const isActive = contract?.status === 'active';

  // Determine active step index (0-based)
  const activeStep = !contract ? 0 : isLandlordTurn ? 1 : isTenantTurn ? 2 : 3;

  const processSteps = [
    { label: 'Plantilla' },
    { label: 'Revisar y firmar' },
    { label: 'Firma inquilino' },
    { label: 'Activo' },
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <BackButton href={`/panel/${propertyId}`} label="Volver a candidatos" />

        {/* Page Header with Info Cards */}
        <div className="mt-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title */}
            <div>
              <Eyebrow accent>Contrato</Eyebrow>
              <h1 className="mt-1 text-2xl font-semibold text-fg">
                {contract ? 'Contrato de Arrendamiento' : 'Generar Contrato'}
              </h1>
              <p className="mt-1 text-fg-muted">
                Crea y firma el contrato para formalizar el arriendo
              </p>
            </div>
          </div>

          {/* Property & Candidate Summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Property */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-fg-muted">Propiedad</p>
                  <p className="text-sm font-medium text-fg truncate">
                    {property.address}
                  </p>
                </div>
              </div>
            </Card>

            {/* Candidate */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-fg-muted">Inquilino</p>
                  <p className="text-sm font-medium text-fg truncate">
                    {candidate.fullName}
                  </p>
                </div>
              </div>
            </Card>

            {/* Monthly Rent */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center flex-shrink-0">
                  <CurrencyDollar className="w-5 h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-fg-muted">Arriendo mensual</p>
                  <p className="text-sm font-medium text-fg font-mono tabular-nums">
                    {formatCurrency(property.monthlyRent)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Duration */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-fg-muted" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-fg-muted">Duración</p>
                  <p className="text-sm font-medium text-fg">
                    12 meses
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Active contract — read-only view, no stepper */}
        {isActive && contract && template && (
          <div className="max-w-3xl space-y-6">
            {/* Contract Preview */}
            <ContractPreview
              contract={contract}
              template={template}
              selectedInsurance={selectedInsurance}
            />

            {/* Audit Trail */}
            <AuditTrail contract={contract} />
          </div>
        )}

        {/* Signing flow — stepper + sidebar */}
        {!isActive && (
          <>
            {/* Shared Process Steps - Horizontal compact */}
            <Card className="mb-8 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                {processSteps.map((step, i) => {
                  const isCompleted = i < activeStep;
                  const isCurrent = i === activeStep;
                  return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all',
                          isCompleted && 'bg-primary text-primary-fg font-mono tabular-nums',
                          isCurrent && 'bg-primary text-primary-fg font-mono tabular-nums',
                          !isCompleted && !isCurrent && 'bg-surface-muted text-fg-subtle',
                        )}>
                          {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                        </div>
                        <div className="hidden sm:block">
                          <p className={cn(
                            'text-sm leading-tight whitespace-nowrap font-medium',
                            isCurrent ? 'text-fg' : isCompleted ? 'text-fg-muted' : 'text-fg-subtle'
                          )}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-primary mt-0.5">Paso actual</p>
                          )}
                        </div>
                      </div>
                      {i < processSteps.length - 1 && (
                        <div className={cn(
                          'h-0.5 flex-1 mx-3 sm:mx-4 rounded-full',
                          i < activeStep ? 'bg-primary' : 'bg-surface-muted',
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* No contract yet - show template selector */}
            {!contract && (
              <div>
                <ContractTypeSelector
                  selectedType={selectedType}
                  onSelect={setSelectedType}
                  uploadedFile={uploadedFile}
                  onFileChange={setUploadedFile}
                />

                {/* Action button - aligned with left card */}
                <div className="mt-6 lg:w-[calc(66.666%-12px)]">
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    hideArrow
                    onClick={handleCreateContract}
                    disabled={!selectedType || (selectedType === 'custom' && !uploadedFile) || isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Spinner size="sm" variant="white" />
                        {selectedType === 'custom' ? 'Procesando contrato...' : 'Generando contrato...'}
                      </>
                    ) : (
                      <>
                        {selectedType === 'custom' ? (
                          <Upload className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        {selectedType === 'custom' ? 'Usar mi contrato' : 'Continuar con el contrato'}
                      </>
                    )}
                  </Button>

                  {/* Help hint */}
                  {!selectedType && (
                    <p className="mt-3 text-center text-xs text-fg-muted">
                      Selecciona una plantilla de contrato para continuar
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Contract exists but not yet active - signing flow */}
            {contract && template && (
              <>
                {/* Status Banner */}
                <div className={cn(
                  'mb-6 rounded-lg px-5 py-4 flex items-center gap-3',
                  isLandlordTurn && 'bg-primary-soft border border-primary text-primary',
                  isTenantTurn && 'bg-primary-soft border border-primary text-primary',
                )}>
                  <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                    {isLandlordTurn && <FileText className="h-5 w-5 text-primary" />}
                    {isTenantTurn && <Clock className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="text-sm font-medium">
                    {isLandlordTurn && 'Revisa el contrato y firma para continuar el proceso'}
                    {isTenantTurn && 'Esperando firma del arrendatario — se le ha enviado una notificación'}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Main Content */}
                  <div className="lg:col-span-2">
                    <ContractPreview
                      contract={contract}
                      template={template}
                      selectedInsurance={selectedInsurance}
                    />
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-4">
                      {/* Insurance Selection (before signing) */}
                      {isLandlordTurn && (
                        <div className="rounded-xl border border-border bg-surface p-4">
                          <InsuranceSelector
                            selected={selectedInsurance}
                            onSelect={setSelectedInsurance}
                            monthlyRent={contract.monthlyRent ?? undefined}
                          />
                        </div>
                      )}

                      {/* Signing Form or Status */}
                      {isLandlordTurn && (
                        <SignatureForm
                          onSign={handleSign}
                          contractId={contract.id}
                          isLandlord={true}
                          isLoading={isSigning}
                          signerName={contract.landlordName}
                          requireOTP={true}
                        />
                      )}

                      {isTenantTurn && (
                        <div className="rounded-lg border border-primary bg-primary-soft p-5">
                          <div className="flex items-center gap-3 text-primary">
                            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm text-primary">Esperando firma</h3>
                              <p className="text-xs text-primary mt-0.5">
                                El arrendatario debe firmar el contrato.
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/panel/${propertyId}`}
                            className="mt-4 w-full flex items-center justify-center px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-xl text-sm font-medium transition-colors"
                          >
                            Entendido, volver a la propiedad
                          </Link>
                        </div>
                      )}

                      {/* Contract Info Card */}
                      <Card className="p-4">
                        <MonoLabel className="block text-xs font-medium tracking-wider text-fg-muted">
                          Tipo de contrato
                        </MonoLabel>
                        <p className="mt-1 font-medium text-fg">
                          {getContractTypeLabel(contract)}
                        </p>
                        <p className="mt-1 text-sm text-fg-muted">
                          {template.clauses.length} cláusulas
                        </p>
                      </Card>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component (with Suspense boundary)
// ============================================================================

export default function ContractPage({ params }: ContractPageProps) {
  const { propertyId, candidateId } = params;

  return (
    <Suspense fallback={<ContractPageLoading />}>
      <ContractPageContent propertyId={propertyId} candidateId={candidateId} />
    </Suspense>
  );
}
