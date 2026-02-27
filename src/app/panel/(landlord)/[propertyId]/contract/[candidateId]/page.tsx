'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Clock, CheckCircle, WarningCircle, SpinnerGap, Upload, Shield, X, Check, House, Bed, Users, MapPin, User, Calendar, CurrencyDollar } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { InsuranceSelector } from '@/components/contract/InsuranceSelector';
import { AuditTrail } from '@/components/contract/AuditTrail';
import type { SelectedInsurance } from '@/lib/types/insurance';
import { CONTRACT_TEMPLATES, getTemplateById } from '@/lib/constants/contract-templates';
import { useContracts, useContractActions } from '@/lib/hooks/useContracts';
import { useLandlordProperty, useCandidate } from '@/lib/hooks/useLandlord';
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_DESCRIPTIONS } from '@/lib/types/contract';
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
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Contratos Leasefy
                </h3>
                <span className="text-[10px] font-medium uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                  onClick={() => { onSelect(template.type); onFileChange(null); }}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all group',
                    isSelected
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900/40'
                        : 'bg-neutral-100 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-neutral-500 dark:text-neutral-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-neutral-900 dark:text-white">
                          {CONTRACT_TYPE_LABELS[template.type]}
                        </h4>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
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
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Upload className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  ¿Ya tienes contrato?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Sube tu PDF para firma digital
                </p>
              </div>
            </div>

            {!uploadedFile ? (
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all',
                  selectedType === 'custom'
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50 dark:bg-neutral-800/50'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Haz clic para subir
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
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
                'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
              )}>
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
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
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center py-24">
          <SpinnerGap className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
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
    if (!selectedType) return;

    setIsCreating(true);
    const newContract = await actions.create({
      propertyId,
      tenantId: candidateId,
      templateType: selectedType,
    });
    if (newContract) {
      setContract(newContract);
      refetchContracts();
    }
    setIsCreating(false);
  };

  // Handle signing via API
  const handleSign = async (otpVerified: boolean = false) => {
    if (!contract) return;

    setIsSigning(true);
    const updated = await actions.sign(contract.id, { otpVerified });
    if (updated) {
      setContract(updated);
      refetchContracts();
    }
    setIsSigning(false);
  };

  // Loading state
  if (propertyLoading || candidateLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center py-24">
            <SpinnerGap className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!property || !candidate) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <BackButton href={`/panel/${propertyId}`} label="Volver a candidatos" />
          <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto">
              <WarningCircle className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Información no encontrada
            </h2>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">
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
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <BackButton href={`/panel/${propertyId}`} label="Volver a candidatos" />

        {/* Page Header with Info Cards */}
        <div className="mt-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {contract ? 'Contrato de Arrendamiento' : 'Generar Contrato'}
              </h1>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                Crea y firma el contrato para formalizar el arriendo
              </p>
            </div>
          </div>

          {/* Property & Candidate Summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Property */}
            <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Propiedad</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {property.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Candidate */}
            <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Inquilino</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {candidate.fullName}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Rent */}
            <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <CurrencyDollar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Arriendo mensual</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {formatCurrency(property.monthlyRent)}
                  </p>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Duración</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    12 meses
                  </p>
                </div>
              </div>
            </div>
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
            <div className="mb-8 bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                {processSteps.map((step, i) => {
                  const isCompleted = i < activeStep;
                  const isCurrent = i === activeStep;
                  return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all',
                          isCompleted && 'bg-indigo-600 text-white',
                          isCurrent && 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25',
                          !isCompleted && !isCurrent && 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
                        )}>
                          {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                        </div>
                        <div className="hidden sm:block">
                          <p className={cn(
                            'text-sm leading-tight whitespace-nowrap font-medium',
                            isCurrent ? 'text-neutral-900 dark:text-white' : isCompleted ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'
                          )}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Paso actual</p>
                          )}
                        </div>
                      </div>
                      {i < processSteps.length - 1 && (
                        <div className={cn(
                          'h-0.5 flex-1 mx-3 sm:mx-4 rounded-full',
                          i < activeStep ? 'bg-indigo-600' : 'bg-neutral-200 dark:bg-neutral-700',
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

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
                  <button
                    onClick={handleCreateContract}
                    disabled={!selectedType || (selectedType === 'custom' && !uploadedFile) || isCreating}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all',
                      selectedType
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    )}
                  >
                    {isCreating ? (
                      <>
                        <SpinnerGap className="h-4 w-4 animate-spin" />
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
                  </button>

                  {/* Help hint */}
                  {!selectedType && (
                    <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
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
                  'mb-6 rounded-2xl px-5 py-4 flex items-center gap-3',
                  isLandlordTurn && 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200',
                  isTenantTurn && 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200',
                )}>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                    {isLandlordTurn && <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                    {isTenantTurn && <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
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
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-4">
                          <InsuranceSelector
                            selected={selectedInsurance}
                            onSelect={setSelectedInsurance}
                            monthlyRent={contract.monthlyRent}
                          />
                        </div>
                      )}

                      {/* Signing Form or Status */}
                      {isLandlordTurn && (
                        <SignatureForm
                          onSign={handleSign}
                          isLandlord={true}
                          isLoading={isSigning}
                          signerName={contract.landlordName}
                          signerPhone="+57 310 456 7890"
                          requireOTP={true}
                        />
                      )}

                      {isTenantTurn && (
                        <div className="rounded-xl border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 p-5">
                          <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm text-indigo-800 dark:text-indigo-200">Esperando firma</h3>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                                El arrendatario debe firmar el contrato.
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/panel/${propertyId}`}
                            className="mt-4 w-full flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
                          >
                            Entendido, volver a la propiedad
                          </Link>
                        </div>
                      )}

                      {/* Contract Info Card */}
                      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-4">
                        <h4 className="text-xs font-medium font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Tipo de contrato
                        </h4>
                        <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                          {CONTRACT_TYPE_LABELS[contract.type]}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                          {template.clauses.length} cláusulas
                        </p>
                      </div>
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
