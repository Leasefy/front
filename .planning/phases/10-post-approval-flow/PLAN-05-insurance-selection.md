---
phase: "10-post-approval-flow"
plan: "05"
title: "Insurance Selection During Signing (Gap Closure)"
wave: 3
autonomous: true
gap_closure: true
closes_gap: "Insurance policy options presented during signing"
must_haves:
  truths:
    - "Insurance types defined with policy options"
    - "InsuranceSelector component shows policy cards"
    - "Contract signing flow includes insurance step"
    - "Selected insurance reflected in contract summary"
  artifacts:
    - path: "src/lib/types/insurance.ts"
      description: "Insurance policy types"
      min_lines: 40
    - path: "src/lib/data/mock-insurance.ts"
      description: "Mock insurance policies"
      min_lines: 50
    - path: "src/components/contract/InsuranceSelector.tsx"
      description: "Insurance selection cards"
      min_lines: 80
  key_links:
    - from: "Contract signing page"
      to: "InsuranceSelector"
      via: "signing flow step"
---

# Plan 05: Insurance Selection During Signing (Gap Closure)

## Objective

Add insurance policy selection as an upsell step during the contract signing flow, closing the gap identified in verification.

## Context

**Gap from VERIFICATION.md:**
> The ROADMAP success criteria #3 states "Insurance policy options presented during signing" but the contract signing flow does not include any insurance selection UI.

**What exists:**
- Contract signing flow at `/panel/[propertyId]/contract/[candidateId]`
- Lease model has `insuranceUrl` field
- Tenant dashboard shows "Ver póliza" button if insurance exists

**What's missing:**
- Insurance policy types
- Mock insurance data
- InsuranceSelector component
- Integration in signing flow

## Tasks

### Task 1: Create Insurance Types
**File**: `src/lib/types/insurance.ts`

```tsx
export type InsuranceTier = 'none' | 'basic' | 'premium';

export interface InsurancePolicy {
  id: string;
  tier: InsuranceTier;
  name: string;
  description: string;
  monthlyPremium: number;
  coverage: InsuranceCoverage;
  features: string[];
  recommended?: boolean;
}

export interface InsuranceCoverage {
  propertyDamage: number;      // COP max coverage
  personalLiability: number;   // COP max coverage
  legalAssistance: boolean;
  emergencyRepairs: boolean;
  rentDefault: number;         // months covered
}

export interface SelectedInsurance {
  policyId: string | null;
  tier: InsuranceTier;
  monthlyPremium: number;
}
```

**Verification**: Insurance types defined.

### Task 2: Create Mock Insurance Data
**File**: `src/lib/data/mock-insurance.ts`

```tsx
import type { InsurancePolicy } from '@/lib/types/insurance';

export const INSURANCE_POLICIES: InsurancePolicy[] = [
  {
    id: 'none',
    tier: 'none',
    name: 'Sin póliza',
    description: 'Continuar sin protección adicional',
    monthlyPremium: 0,
    coverage: {
      propertyDamage: 0,
      personalLiability: 0,
      legalAssistance: false,
      emergencyRepairs: false,
      rentDefault: 0,
    },
    features: [],
  },
  {
    id: 'basic',
    tier: 'basic',
    name: 'Protección Básica',
    description: 'Cobertura esencial para tu tranquilidad',
    monthlyPremium: 45000, // ~$45,000 COP/mes
    coverage: {
      propertyDamage: 10000000,    // $10M COP
      personalLiability: 5000000,  // $5M COP
      legalAssistance: false,
      emergencyRepairs: true,
      rentDefault: 2,
    },
    features: [
      'Daños a la propiedad hasta $10M',
      'Responsabilidad civil hasta $5M',
      'Reparaciones de emergencia 24/7',
      '2 meses de renta garantizada',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Protección Premium',
    description: 'Máxima cobertura y tranquilidad total',
    monthlyPremium: 89000, // ~$89,000 COP/mes
    coverage: {
      propertyDamage: 30000000,    // $30M COP
      personalLiability: 15000000, // $15M COP
      legalAssistance: true,
      emergencyRepairs: true,
      rentDefault: 4,
    },
    features: [
      'Daños a la propiedad hasta $30M',
      'Responsabilidad civil hasta $15M',
      'Asistencia legal incluida',
      'Reparaciones de emergencia 24/7',
      '4 meses de renta garantizada',
      'Gestor personal asignado',
    ],
  },
];

export function getInsuranceById(id: string): InsurancePolicy | undefined {
  return INSURANCE_POLICIES.find((p) => p.id === id);
}

export function getRecommendedInsurance(): InsurancePolicy {
  return INSURANCE_POLICIES.find((p) => p.recommended) || INSURANCE_POLICIES[1];
}
```

**Verification**: 3 insurance options with pricing.

### Task 3: Create InsuranceSelector Component
**File**: `src/components/contract/InsuranceSelector.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Check, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { INSURANCE_POLICIES } from '@/lib/data/mock-insurance';
import type { InsuranceTier, SelectedInsurance } from '@/lib/types/insurance';

interface InsuranceSelectorProps {
  selected: SelectedInsurance;
  onSelect: (insurance: SelectedInsurance) => void;
  className?: string;
}

const tierIcons = {
  none: ShieldOff,
  basic: Shield,
  premium: ShieldCheck,
};

export function InsuranceSelector({
  selected,
  onSelect,
  className,
}: InsuranceSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          Protección opcional
        </h3>
        <p className="text-sm text-slate-500">
          Recomendado para tu tranquilidad
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INSURANCE_POLICIES.map((policy) => {
          const Icon = tierIcons[policy.tier];
          const isSelected = selected.policyId === policy.id;

          return (
            <button
              key={policy.id}
              onClick={() => onSelect({
                policyId: policy.id,
                tier: policy.tier,
                monthlyPremium: policy.monthlyPremium,
              })}
              className={cn(
                'relative flex flex-col p-4 rounded-sm border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-slate-200 hover:border-slate-300',
                policy.tier === 'none' && 'opacity-75'
              )}
            >
              {/* Recommended badge */}
              {policy.recommended && (
                <Badge className="absolute -top-2 left-4 bg-emerald-500 hover:bg-emerald-500">
                  Recomendado
                </Badge>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'w-10 h-10 rounded-sm flex items-center justify-center',
                  policy.tier === 'none' && 'bg-slate-100',
                  policy.tier === 'basic' && 'bg-blue-100',
                  policy.tier === 'premium' && 'bg-emerald-100',
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    policy.tier === 'none' && 'text-slate-400',
                    policy.tier === 'basic' && 'text-blue-600',
                    policy.tier === 'premium' && 'text-emerald-600',
                  )} />
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name and price */}
              <h4 className="font-medium text-slate-900">{policy.name}</h4>
              <p className="text-sm text-slate-500 mb-3">{policy.description}</p>

              <div className="mt-auto">
                <p className="text-lg font-semibold text-slate-900">
                  {policy.monthlyPremium === 0
                    ? 'Gratis'
                    : formatCurrency(policy.monthlyPremium)}
                  {policy.monthlyPremium > 0 && (
                    <span className="text-sm text-slate-400 font-normal">/mes</span>
                  )}
                </p>
              </div>

              {/* Features */}
              {policy.features.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  {policy.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {policy.features.length > 3 && (
                    <li className="text-xs text-slate-400">
                      +{policy.features.length - 3} más
                    </li>
                  )}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Verification**: InsuranceSelector renders 3 options.

### Task 4: Update Contract Components Index
**File**: `src/components/contract/index.ts`

Add InsuranceSelector export:

```tsx
export { ContractTimeline } from './ContractTimeline';
export { ContractPreview } from './ContractPreview';
export { SignatureForm } from './SignatureForm';
export { InsuranceSelector } from './InsuranceSelector';
```

**Verification**: InsuranceSelector exported.

### Task 5: Integrate Insurance in Contract Signing Page
**File**: `src/app/panel/[propertyId]/contract/[candidateId]/page.tsx`

Add insurance selection step between contract preview and signature:

1. Add state for selected insurance:
```tsx
const [selectedInsurance, setSelectedInsurance] = useState<SelectedInsurance>({
  policyId: null,
  tier: 'none',
  monthlyPremium: 0,
});
```

2. Add InsuranceSelector component in the right column, above SignatureForm:
```tsx
{/* Insurance Selection */}
<InsuranceSelector
  selected={selectedInsurance}
  onSelect={setSelectedInsurance}
  className="mb-6"
/>
```

3. Pass insurance to SignatureForm for display in summary.

**Verification**: Contract signing page includes insurance step.

### Task 6: Add Insurance to Contract Summary
**File**: `src/components/contract/ContractPreview.tsx`

Add section showing selected insurance (if any) in the contract preview:

```tsx
{/* Insurance selection summary */}
{selectedInsurance && selectedInsurance.tier !== 'none' && (
  <div className="mt-4 pt-4 border-t border-slate-100">
    <h4 className="font-medium text-slate-900 mb-2">Póliza de seguro</h4>
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{insuranceName}</span>
      <span className="font-medium">{formatCurrency(selectedInsurance.monthlyPremium)}/mes</span>
    </div>
  </div>
)}
```

**Verification**: Selected insurance shown in contract preview.

## Verification Checklist

- [ ] Insurance types defined (InsurancePolicy, SelectedInsurance)
- [ ] 3 insurance options: none, basic ($45k), premium ($89k)
- [ ] InsuranceSelector component with cards
- [ ] Insurance integrated in contract signing flow
- [ ] Selected insurance shown in contract preview
- [ ] Build passes without errors

## Output

After completion:
1. Insurance policy types
2. Mock insurance data with 3 tiers
3. InsuranceSelector component
4. Contract signing flow includes insurance upsell
5. Phase 10 gap #3 closed
