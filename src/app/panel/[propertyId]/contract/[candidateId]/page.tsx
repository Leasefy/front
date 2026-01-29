'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ContractTimeline } from '@/components/contract/ContractTimeline';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { InsuranceSelector } from '@/components/contract/InsuranceSelector';
import type { SelectedInsurance } from '@/lib/types/insurance';
import {
  getContractById,
  getContractSteps,
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
}

function ContractTypeSelector({ selectedType, onSelect }: ContractTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Seleccione el tipo de contrato
      </h3>
      <div className="space-y-3">
        {CONTRACT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.type)}
            className={cn(
              'w-full rounded-sm border p-4 text-left transition-all',
              selectedType === template.type
                ? 'border-primary bg-primary/5 ring-2 ring-primary'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-slate-900">
                  {CONTRACT_TYPE_LABELS[template.type]}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
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
  );
}

// ============================================================================
// Loading Fallback
// ============================================================================

function ContractPageLoading() {
  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
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
      <div className="min-h-screen bg-[#FBFBFB]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            href={`/panel/${propertyId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a candidatos
          </Link>
          <div className="mt-8 rounded-sm border border-slate-200 bg-white p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Informacion no encontrada
            </h2>
            <p className="mt-2 text-slate-500">
              No se pudo encontrar la propiedad o el candidato especificado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get template and steps if contract exists
  const template = contract ? getTemplateById(contract.templateId) : null;
  const steps = contract ? getContractSteps(contract) : [];
  const isLandlordTurn = contract?.status === 'pending_landlord';
  const isTenantTurn = contract?.status === 'pending_tenant';
  const isActive = contract?.status === 'active';

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Back link */}
        <Link
          href={`/panel/${propertyId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a candidatos
        </Link>

        {/* Page Header */}
        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {contract ? 'Contrato de Arrendamiento' : 'Generar Contrato'}
          </h1>
          <p className="mt-1 text-slate-500">
            {property.address}, {property.city} &mdash; {candidate.fullName}
          </p>
        </div>

        {/* No contract yet - show template selector */}
        {!contract && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Template Selector */}
            <div className="rounded-sm border border-slate-200 bg-white p-6">
              <ContractTypeSelector
                selectedType={selectedType}
                onSelect={setSelectedType}
              />

              <Button
                onClick={handleCreateContract}
                disabled={!selectedType || isLoading}
                className="mt-6 w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generando contrato...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar contrato
                  </>
                )}
              </Button>
            </div>

            {/* Right: Info */}
            <div className="rounded-sm border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Informacion del Proceso
              </h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                    1
                  </div>
                  <p>Seleccione el tipo de contrato adecuado</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                    2
                  </div>
                  <p>Revise los terminos y firme el contrato</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                    3
                  </div>
                  <p>El arrendatario recibira notificacion para firmar</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                    4
                  </div>
                  <p>Una vez firmado por ambos, el contrato quedara activo</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contract exists - show signing flow */}
        {contract && template && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Timeline */}
            <div className="lg:col-span-3">
              <div className="sticky top-6 rounded-sm border border-slate-200 bg-white p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Estado del contrato
                </h3>

                {/* Status Badge */}
                <div className="mb-4 rounded-sm border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Estado actual</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {CONTRACT_STATUS_LABELS[contract.status]}
                  </p>
                </div>

                <ContractTimeline steps={steps} />
              </div>
            </div>

            {/* Center: Contract Preview */}
            <div className="lg:col-span-6">
              <ContractPreview
                contract={contract}
                template={template}
                selectedInsurance={selectedInsurance}
              />
            </div>

            {/* Right: Actions */}
            <div className="lg:col-span-3">
              <div className="sticky top-6 space-y-4">
                {/* Insurance Selection (before signing) */}
                {isLandlordTurn && (
                  <div className="rounded-sm border border-slate-200 bg-white p-4">
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
                  <div className="rounded-sm border border-blue-200 bg-blue-50 p-6">
                    <div className="flex items-center gap-3 text-blue-700">
                      <Clock className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">Esperando firma</h3>
                        <p className="text-sm text-blue-600">
                          El arrendatario debe firmar el contrato. Se le ha enviado una
                          notificacion.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isActive && (
                  <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-6">
                    <div className="flex items-center gap-3 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">Contrato activo</h3>
                        <p className="text-sm text-emerald-600">
                          Ambas partes han firmado. El contrato esta vigente.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="mt-4 w-full" asChild>
                      <Link href={`/panel/${propertyId}`}>
                        Volver al panel
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Contract Info Card */}
                <div className="rounded-sm border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Tipo de contrato
                  </h4>
                  <p className="mt-1 font-medium text-slate-900">
                    {CONTRACT_TYPE_LABELS[contract.type]}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {template.clauses.length} clausulas
                  </p>
                </div>
              </div>
            </div>
          </div>
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
