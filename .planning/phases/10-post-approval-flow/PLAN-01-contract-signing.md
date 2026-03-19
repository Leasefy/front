---
phase: "10-post-approval-flow"
plan: "01"
title: "Contract Generation & Signing UI"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Contract types defined (Básico, Amoblado, Compartido)"
    - "Deel-style signing flow with sequential signatures"
    - "Contract preview with terms and conditions"
    - "E-signature with legal compliance UI elements"
    - "Status timeline showing contract progress"
  artifacts:
    - path: "src/lib/types/contract.ts"
      description: "Contract types and interfaces"
      min_lines: 80
    - path: "src/lib/data/mock-contracts.ts"
      description: "Mock contract templates and signed contracts"
      min_lines: 100
    - path: "src/components/contract/ContractTimeline.tsx"
      description: "Vertical timeline showing signing progress"
      min_lines: 60
    - path: "src/components/contract/ContractPreview.tsx"
      description: "Contract document preview component"
      min_lines: 80
    - path: "src/components/contract/SignatureForm.tsx"
      description: "Signature form with legal checkboxes"
      min_lines: 70
    - path: "src/app/panel/[propertyId]/contract/[candidateId]/page.tsx"
      description: "Contract signing page"
      min_lines: 120
  key_links:
    - from: "SignatureForm"
      to: "ContractTimeline"
      via: "signing status updates"
---

# Plan 01: Contract Generation & Signing UI

## Objective

Create a Deel-style contract signing flow that guides both landlord and tenant through the signature process with clear status tracking.

## Context

After a landlord approves a candidate, they need to formalize the rental with a contract. The flow follows Deel's pattern:
1. Landlord selects contract template
2. Landlord reviews and signs first
3. Tenant receives notification to sign
4. Both parties have signed contract

### Reference: Deel Signing Flow
- Clear timeline on the left showing steps
- Document preview/edit in the center
- Action buttons on the right
- Progress indication at all times

## Tasks

### Task 1: Create Contract Types
**File**: `src/lib/types/contract.ts`

```tsx
export type ContractType = 'basico' | 'amoblado' | 'compartido';
export type ContractStatus = 'draft' | 'pending_landlord' | 'pending_tenant' | 'active' | 'expired' | 'cancelled';
export type SignatureStatus = 'pending' | 'signed';

export interface ContractTemplate {
  id: string;
  type: ContractType;
  name: string;
  description: string;
  clauses: ContractClause[];
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  required: boolean;
}

export interface Signature {
  signedAt: string;
  signedBy: string;
  ipAddress: string;
  userAgent: string;
  status: SignatureStatus;
}

export interface Contract {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  templateId: string;
  type: ContractType;
  status: ContractStatus;

  // Terms
  monthlyRent: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  paymentDueDay: number;

  // Signatures
  landlordSignature: Signature | null;
  tenantSignature: Signature | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Contract timeline step
export interface ContractStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  completedAt?: string;
}
```

**Verification**: Contract types defined with signatures and status tracking.

### Task 2: Create Mock Contract Data
**File**: `src/lib/data/mock-contracts.ts`

Create mock templates and sample contracts:

```tsx
export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'template-basico',
    type: 'basico',
    name: 'Contrato Básico',
    description: 'Arriendo estándar sin muebles',
    clauses: [
      {
        id: 'clause-1',
        title: 'Objeto del contrato',
        content: 'El arrendador entrega al arrendatario...',
        required: true,
      },
      // ... more clauses
    ],
  },
  // amoblado, compartido templates
];

export const MOCK_CONTRACTS: Contract[] = [
  // Sample contracts in different states
];

export function getContractSteps(contract: Contract): ContractStep[] {
  // Return timeline steps based on contract status
}
```

**Verification**: Templates and mock data available.

### Task 3: Create ContractTimeline Component
**File**: `src/components/contract/ContractTimeline.tsx`

Vertical timeline showing signing progress:

```tsx
'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Clock } from 'lucide-react';
import type { ContractStep } from '@/lib/types/contract';

interface ContractTimelineProps {
  steps: ContractStep[];
  className?: string;
}

export function ContractTimeline({ steps, className }: ContractTimelineProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-4">
          {/* Step indicator */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              step.status === 'completed' && 'bg-emerald-500 text-white',
              step.status === 'current' && 'bg-primary text-white',
              step.status === 'pending' && 'bg-slate-200 text-slate-400',
            )}>
              {step.status === 'completed' ? (
                <Check className="w-4 h-4" />
              ) : step.status === 'current' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'w-0.5 h-12 mt-2',
                step.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
              )} />
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 pb-8">
            <h4 className={cn(
              'font-medium',
              step.status === 'pending' && 'text-slate-400'
            )}>
              {step.title}
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {step.description}
            </p>
            {step.completedAt && (
              <p className="text-xs text-slate-400 mt-1">
                {formatDate(step.completedAt)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Verification**: Timeline renders with correct step states.

### Task 4: Create ContractPreview Component
**File**: `src/components/contract/ContractPreview.tsx`

Document preview with contract details:

```tsx
'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Contract, ContractTemplate } from '@/lib/types/contract';

interface ContractPreviewProps {
  contract: Contract;
  template: ContractTemplate;
  className?: string;
}

export function ContractPreview({ contract, template, className }: ContractPreviewProps) {
  return (
    <div className={cn('bg-white rounded-sm border border-slate-100 p-6', className)}>
      {/* Header */}
      <div className="text-center border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          CONTRATO DE ARRENDAMIENTO
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {template.name}
        </p>
      </div>

      {/* Contract details */}
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500">Canon mensual</p>
            <p className="font-medium">{formatCurrency(contract.monthlyRent)}</p>
          </div>
          <div>
            <p className="text-slate-500">Depósito</p>
            <p className="font-medium">{formatCurrency(contract.depositAmount)}</p>
          </div>
          <div>
            <p className="text-slate-500">Fecha inicio</p>
            <p className="font-medium">{formatDate(contract.startDate)}</p>
          </div>
          <div>
            <p className="text-slate-500">Fecha fin</p>
            <p className="font-medium">{formatDate(contract.endDate)}</p>
          </div>
        </div>

        {/* Clauses */}
        <div className="mt-6 space-y-4">
          {template.clauses.map((clause) => (
            <div key={clause.id}>
              <h4 className="font-medium text-slate-900">{clause.title}</h4>
              <p className="text-slate-600 mt-1">{clause.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Contract preview renders with all details.

### Task 5: Create SignatureForm Component
**File**: `src/components/contract/SignatureForm.tsx`

Form with legal checkboxes and sign button:

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSignature, AlertCircle } from 'lucide-react';

interface SignatureFormProps {
  onSign: () => void;
  isLandlord: boolean;
  isLoading?: boolean;
  className?: string;
}

export function SignatureForm({ onSign, isLandlord, isLoading, className }: SignatureFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const canSign = acceptedTerms && acceptedLegal;

  return (
    <div className={cn('bg-white rounded-sm border border-slate-100 p-6', className)}>
      <h3 className="font-semibold text-slate-900 mb-4">
        Firmar como {isLandlord ? 'Arrendador' : 'Arrendatario'}
      </h3>

      {/* Legal notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Aviso legal</p>
            <p className="mt-1">
              Al firmar este contrato, usted acepta los términos y condiciones
              establecidos. Esta firma tiene validez legal según la Ley 527 de 1999.
            </p>
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
          />
          <span className="text-sm text-slate-600">
            He leído y acepto los términos y condiciones del contrato de arrendamiento.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={acceptedLegal}
            onCheckedChange={(checked) => setAcceptedLegal(!!checked)}
          />
          <span className="text-sm text-slate-600">
            Entiendo que esta firma electrónica tiene validez legal y es vinculante.
          </span>
        </label>
      </div>

      {/* Sign button */}
      <Button
        onClick={onSign}
        disabled={!canSign || isLoading}
        className="w-full"
        size="lg"
      >
        <FileSignature className="w-4 h-4 mr-2" />
        Firmar contrato
      </Button>
    </div>
  );
}
```

**Verification**: Signature form with legal compliance elements.

### Task 6: Create Contract Signing Page
**File**: `src/app/panel/[propertyId]/contract/[candidateId]/page.tsx`

Main contract signing page with split layout:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  ContractTimeline,
  ContractPreview,
  SignatureForm,
} from '@/components/contract';
import { getContractById, getContractSteps, getTemplateById } from '@/lib/data/mock-contracts';

interface ContractPageProps {
  params: {
    propertyId: string;
    candidateId: string;
  };
}

export default function ContractPage({ params }: ContractPageProps) {
  const { propertyId, candidateId } = params;

  // Get contract data (mock)
  const contract = getContractById(propertyId, candidateId);
  const template = getTemplateById(contract?.templateId || '');
  const steps = contract ? getContractSteps(contract) : [];

  const [isLoading, setIsLoading] = useState(false);

  const handleSign = async () => {
    setIsLoading(true);
    // Mock signing - would call API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    // Update contract status
  };

  if (!contract || !template) {
    return (
      <div className="min-h-screen bg-[#FBFBFB]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p>Contrato no encontrado</p>
        </div>
      </div>
    );
  }

  const isLandlordTurn = contract.status === 'pending_landlord';
  const isTenantTurn = contract.status === 'pending_tenant';
  const canSign = isLandlordTurn; // For landlord view

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href={`/panel/${propertyId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a candidatos
        </Link>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Timeline - left column */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-sm border border-slate-100 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">
                Estado del contrato
              </h3>
              <ContractTimeline steps={steps} />
            </div>
          </div>

          {/* Contract preview - center */}
          <div className="lg:col-span-6">
            <ContractPreview contract={contract} template={template} />
          </div>

          {/* Actions - right column */}
          <div className="lg:col-span-3">
            {canSign ? (
              <SignatureForm
                onSign={handleSign}
                isLandlord={true}
                isLoading={isLoading}
              />
            ) : (
              <div className="bg-white rounded-sm border border-slate-100 p-4">
                <p className="text-sm text-slate-500">
                  {isTenantTurn
                    ? 'Esperando la firma del arrendatario...'
                    : 'Contrato ya firmado por ambas partes.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Contract signing page with split layout and timeline.

### Task 7: Create Contract Components Index
**File**: `src/components/contract/index.ts`

```tsx
export { ContractTimeline } from './ContractTimeline';
export { ContractPreview } from './ContractPreview';
export { SignatureForm } from './SignatureForm';
```

**Verification**: Contract components exported.

### Task 8: Add "Generar contrato" Button to CandidateDetail
**File**: `src/components/landlord/CandidateDetail.tsx`

Add a button that appears when candidate status is 'approved':

```tsx
// After approval, show "Generar contrato" button
{candidate.status === 'approved' && (
  <Link href={`/panel/${propertyId}/contract/${candidate.id}`}>
    <Button className="w-full">
      <FileText className="w-4 h-4 mr-2" />
      Generar contrato
    </Button>
  </Link>
)}
```

**Verification**: Contract generation accessible from approved candidates.

## Verification Checklist

- [ ] Contract types with signatures and status defined
- [ ] Mock templates (3 types) and sample contracts
- [ ] ContractTimeline shows step progression
- [ ] ContractPreview displays contract details
- [ ] SignatureForm has legal checkboxes
- [ ] Contract signing page has split layout
- [ ] "Generar contrato" button in CandidateDetail
- [ ] Build passes without errors

## Output

After completion:
1. Types for contracts, signatures, templates
2. Mock data for contract templates
3. Deel-style signing UI components
4. Contract signing page at `/panel/[propertyId]/contract/[candidateId]`
5. Integration with existing candidate approval flow
