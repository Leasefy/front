'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertCircle, Loader2, Upload, Shield, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { InsuranceSelector } from '@/components/contract/InsuranceSelector';
import type { SelectedInsurance } from '@/lib/types/insurance';
import {
  getContractById,
  getTemplateById,
  createContractFromTemplate,
  CONTRACT_TEMPLATES,
} from '@/lib/data/mock-contracts';
import { MOCK_CANDIDATES } from '@/lib/data/mock-candidates';
import { mockProperties } from '@/lib/data/mock-properties';
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_DESCRIPTIONS, CONTRACT_STATUS_LABELS } from '@/lib/types/contract';
import type { Contract, ContractType } from '@/lib/types/contract';

// ============================================================================
// Types
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
    <div className="space-y-5">
      {/* Platform templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Contratos PLan
          </h3>
          <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
            Recomendado
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Plantillas verificadas por nuestro equipo legal, optimizadas para proteger a ambas partes.
        </p>
        <div className="space-y-3">
          {CONTRACT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => { onSelect(template.type); onFileChange(null); }}
              className={cn(
                'w-full rounded-sm border p-4 text-left transition-all',
                selectedType === template.type
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-border hover:border-border hover:bg-muted'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-foreground">
                    {CONTRACT_TYPE_LABELS[template.type]}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {CONTRACT_TYPE_DESCRIPTIONS[template.type]}
                  </p>
                </div>
                {selectedType === template.type && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Custom upload */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Subir contrato propio
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Si ya tienes un contrato, puedes subirlo en PDF. Se usará como base para el proceso de firma digital.
        </p>

        {!uploadedFile ? (
          <label
            className={cn(
              'flex flex-col items-center justify-center gap-2 w-full rounded-sm border-2 border-dashed p-6 cursor-pointer transition-all',
              selectedType === 'custom'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground hover:bg-muted'
            )}
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Arrastra tu contrato o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDF, máximo 10MB
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
            'flex items-center gap-3 w-full rounded-sm border p-4 transition-all',
            'border-primary bg-primary/5 ring-2 ring-primary'
          )}>
            <div className="w-10 h-10 rounded-sm bg-red-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB · PDF
              </p>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1.5 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Loading Fallback
// ============================================================================

function ContractPageLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Inner Component (uses useSearchParams)
// ============================================================================

function ContractPageContent({ propertyId, candidateId }: { propertyId: string; candidateId: string }) {
  const searchParams = useSearchParams();

  // Check if we should force starting fresh (new contract flow)
  const forceNew = searchParams.get('new') === 'true';

  // State
  const [contract, setContract] = useState<Contract | null>(null);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<SelectedInsurance>({
    policyId: null,
    tier: 'none',
    monthlyPremium: 0,
  });

  // Get existing contract or null (skip if forceNew is true)
  useEffect(() => {
    if (forceNew) {
      // Start fresh - don't load existing contract
      setContract(null);
      return;
    }
    const existingContract = getContractById(propertyId, candidateId);
    if (existingContract) {
      setContract(existingContract);
    }
  }, [propertyId, candidateId, forceNew]);

  // Get property and candidate info
  const property = mockProperties.find((p) => p.id === propertyId);
  const candidate = MOCK_CANDIDATES.find((c) => c.id === candidateId);

  // Handle contract creation
  const handleCreateContract = () => {
    if (!selectedType) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newContract = createContractFromTemplate(propertyId, candidateId, selectedType);
      if (newContract) {
        setContract(newContract);
      }
      setIsLoading(false);
    }, 1000);
  };

  // Handle signing
  const handleSign = async () => {
    if (!contract) return;

    setIsSigning(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update contract status (mock)
    const updatedContract: Contract = {
      ...contract,
      status: contract.status === 'pending_landlord' ? 'pending_tenant' : 'active',
      landlordSignature:
        contract.status === 'pending_landlord'
          ? {
              signedAt: new Date().toISOString(),
              signedBy: contract.landlordName,
              signerId: contract.landlordId,
              ipAddress: '190.85.23.145',
              userAgent: navigator.userAgent,
              status: 'signed',
            }
          : contract.landlordSignature,
    };

    setContract(updatedContract);
    setIsSigning(false);
  };

  // Not found state
  if (!property || !candidate) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Link
            href={`/panel/${propertyId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a candidatos
          </Link>
          <div className="mt-8 rounded-sm border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Informacion no encontrada
            </h2>
            <p className="mt-2 text-muted-foreground">
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back link */}
        <Link
          href={`/panel/${propertyId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a candidatos
        </Link>

        {/* Page Header */}
        <div className="mt-6 mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {contract ? 'Contrato de Arrendamiento' : 'Generar Contrato'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {property.address}, {property.city} &mdash; {candidate.fullName}
          </p>
        </div>

        {/* Active contract — read-only view, no stepper */}
        {isActive && contract && template && (
          <div className="max-w-3xl">
            <ContractPreview
              contract={contract}
              template={template}
              selectedInsurance={selectedInsurance}
            />
          </div>
        )}

        {/* Signing flow — stepper + sidebar */}
        {!isActive && (
          <>
            {/* Shared Process Steps */}
            <div className="mb-8">
              <div className="flex items-center">
                {processSteps.map((step, i) => {
                  const isCompleted = i < activeStep;
                  const isCurrent = i === activeStep;
                  return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                          isCompleted && 'bg-primary text-white',
                          isCurrent && 'bg-primary text-white ring-4 ring-primary/15',
                          !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                        )}>
                          {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        <p className={cn(
                          'text-[11px] leading-tight whitespace-nowrap',
                          isCurrent ? 'text-foreground font-semibold' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {step.label}
                        </p>
                      </div>
                      {i < processSteps.length - 1 && (
                        <div className={cn(
                          'h-px flex-1 mx-3 -mt-5',
                          i < activeStep ? 'bg-primary' : 'bg-border',
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* No contract yet - show template selector */}
            {!contract && (
              <div className="max-w-2xl">
                <div className="rounded-sm border border-border bg-card p-6">
                  <ContractTypeSelector
                    selectedType={selectedType}
                    onSelect={setSelectedType}
                    uploadedFile={uploadedFile}
                    onFileChange={setUploadedFile}
                  />

                  <Button
                    onClick={handleCreateContract}
                    disabled={!selectedType || (selectedType === 'custom' && !uploadedFile) || isLoading}
                    className="mt-6 w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        {selectedType === 'custom' ? 'Procesando contrato...' : 'Generando contrato...'}
                      </>
                    ) : (
                      <>
                        {selectedType === 'custom' ? (
                          <Upload className="mr-2 h-4 w-4" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        {selectedType === 'custom' ? 'Usar mi contrato' : 'Generar contrato'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Contract exists but not yet active - signing flow */}
            {contract && template && (
              <>
                {/* Status Banner */}
                <div className={cn(
                  'mb-6 rounded-sm px-5 py-3.5 flex items-center gap-3',
                  isLandlordTurn && 'bg-indigo-50 border border-indigo-200 text-indigo-800',
                  isTenantTurn && 'bg-indigo-50 border border-indigo-200 text-indigo-800',
                )}>
                  {isLandlordTurn && <FileText className="h-4 w-4 shrink-0" />}
                  {isTenantTurn && <Clock className="h-4 w-4 shrink-0" />}
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
                        <div className="rounded-sm border border-border bg-card p-4">
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
                        />
                      )}

                      {isTenantTurn && (
                        <div className="rounded-sm border border-indigo-200 bg-indigo-50 p-5">
                          <div className="flex items-center gap-3 text-indigo-700">
                            <Clock className="h-5 w-5 shrink-0" />
                            <div>
                              <h3 className="font-semibold text-sm">Esperando firma</h3>
                              <p className="text-xs text-indigo-600 mt-0.5">
                                El arrendatario debe firmar el contrato.
                              </p>
                            </div>
                          </div>
                          <Button className="mt-4 w-full" size="sm" asChild>
                            <Link href={`/panel/${propertyId}`}>
                              Entendido, volver a la propiedad
                            </Link>
                          </Button>
                        </div>
                      )}

                      {/* Contract Info Card */}
                      <div className="rounded-sm border border-border bg-card p-4">
                        <h4 className="text-xs font-medium font-mono uppercase tracking-wider text-muted-foreground">
                          Tipo de contrato
                        </h4>
                        <p className="mt-1 font-medium text-foreground">
                          {CONTRACT_TYPE_LABELS[contract.type]}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
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
