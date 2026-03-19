---
phase: "10-post-approval-flow"
plan: "02"
title: "Pricing Page & Subscription Plans"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Subscription plans defined (Free, Pro, Business)"
    - "Pricing page with plan comparison"
    - "Plan selection and checkout flow UI"
    - "Current plan display in dashboard"
    - "Upgrade prompts in appropriate locations"
  artifacts:
    - path: "src/lib/types/subscription.ts"
      description: "Subscription and plan types"
      min_lines: 50
    - path: "src/lib/data/mock-subscriptions.ts"
      description: "Mock plans and features"
      min_lines: 80
    - path: "src/components/pricing/PricingCard.tsx"
      description: "Individual plan card component"
      min_lines: 80
    - path: "src/components/pricing/PricingTable.tsx"
      description: "Full pricing comparison table"
      min_lines: 100
    - path: "src/app/pricing/page.tsx"
      description: "Public pricing page"
      min_lines: 80
    - path: "src/app/panel/upgrade/page.tsx"
      description: "Plan upgrade page with checkout"
      min_lines: 100
  key_links:
    - from: "PricingCard"
      to: "Subscription types"
      via: "plan features"
---

# Plan 02: Pricing Page & Subscription Plans

## Objective

Create a compelling pricing page that clearly communicates the value of each plan and enables smooth subscription selection.

## Context

The pricing model is freemium + transactional:
- **Free**: Post properties, basic search - attracts users
- **Pro**: AI scoring, unlimited contracts - core value
- **Business**: Multi-property, API access - for property managers

Pricing reference (Colombian market):
- FincaRaiz Pro: ~$80,000 COP/mes
- Our Pro: $49,900 COP/mes (competitive positioning)
- Business: $149,900 COP/mes

## Tasks

### Task 1: Create Subscription Types
**File**: `src/lib/types/subscription.ts`

```tsx
export type PlanId = 'free' | 'pro' | 'business';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number | 'unlimited';
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
}

export interface SubscriptionContext {
  subscription: Subscription | null;
  plan: Plan;
  canAccessFeature: (featureId: string) => boolean;
  isTrialing: boolean;
  daysLeftInTrial: number | null;
}
```

**Verification**: Subscription types defined.

### Task 2: Create Mock Subscription Data
**File**: `src/lib/data/mock-subscriptions.ts`

```tsx
import type { Plan, PlanFeature, Subscription } from '@/lib/types/subscription';

export const PLAN_FEATURES: Record<string, PlanFeature> = {
  property_listing: {
    id: 'property_listing',
    name: 'Publicar propiedades',
    description: 'Publicar propiedades en el marketplace',
    included: true,
  },
  basic_search: {
    id: 'basic_search',
    name: 'Búsqueda básica',
    description: 'Filtros básicos de búsqueda',
    included: true,
  },
  ai_scoring: {
    id: 'ai_scoring',
    name: 'Análisis AI de candidatos',
    description: 'Puntuación inteligente con explicaciones',
    included: false,
  },
  unlimited_contracts: {
    id: 'unlimited_contracts',
    name: 'Contratos ilimitados',
    description: 'Genera contratos digitales sin límite',
    included: false,
  },
  priority_support: {
    id: 'priority_support',
    name: 'Soporte prioritario',
    description: 'Respuesta en menos de 24 horas',
    included: false,
  },
  api_access: {
    id: 'api_access',
    name: 'Acceso API',
    description: 'Integra con tus sistemas',
    included: false,
  },
  multi_property: {
    id: 'multi_property',
    name: 'Multi-propiedad',
    description: 'Gestiona múltiples propiedades',
    included: false,
    limit: 1,
  },
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratis',
    description: 'Perfecto para empezar',
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 1 },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.ai_scoring, included: false },
      { ...PLAN_FEATURES.unlimited_contracts, included: false, limit: 1 },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para propietarios serios',
    price: {
      monthly: 49900,
      yearly: 479000, // ~20% discount
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 5 },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.ai_scoring, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.priority_support, included: true },
    ],
    highlighted: true,
    badge: 'Más popular',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Para administradores de propiedades',
    price: {
      monthly: 149900,
      yearly: 1439000,
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.ai_scoring, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.priority_support, included: true },
      { ...PLAN_FEATURES.api_access, included: true },
      { ...PLAN_FEATURES.multi_property, included: true, limit: 'unlimited' },
    ],
  },
];

export function getPlanById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

// Mock user subscription
export const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub-1',
  userId: 'user-1',
  planId: 'free',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-02-01',
  cancelAtPeriodEnd: false,
};
```

**Verification**: Plans with features and pricing defined.

### Task 3: Create PricingCard Component
**File**: `src/components/pricing/PricingCard.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import type { Plan, BillingCycle } from '@/lib/types/subscription';

interface PricingCardProps {
  plan: Plan;
  billingCycle: BillingCycle;
  isCurrentPlan?: boolean;
  onSelect?: (planId: string) => void;
  className?: string;
}

export function PricingCard({
  plan,
  billingCycle,
  isCurrentPlan,
  onSelect,
  className,
}: PricingCardProps) {
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
  const monthlyEquivalent = billingCycle === 'yearly'
    ? Math.round(plan.price.yearly / 12)
    : plan.price.monthly;

  return (
    <div
      className={cn(
        'bg-white rounded-sm border p-6 flex flex-col',
        plan.highlighted
          ? 'border-primary shadow-md ring-1 ring-primary'
          : 'border-slate-100',
        className
      )}
    >
      {/* Header */}
      <div className="text-center mb-6">
        {plan.badge && (
          <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/10">
            {plan.badge}
          </Badge>
        )}
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-slate-900">
            {price === 0 ? 'Gratis' : formatCurrency(monthlyEquivalent)}
          </span>
          {price > 0 && (
            <span className="text-slate-500">/mes</span>
          )}
        </div>
        {billingCycle === 'yearly' && price > 0 && (
          <p className="text-sm text-slate-500 mt-1">
            Facturado anualmente ({formatCurrency(plan.price.yearly)})
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature.id} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-5 h-5 text-slate-300 shrink-0" />
            )}
            <span className={cn(
              'text-sm',
              feature.included ? 'text-slate-700' : 'text-slate-400'
            )}>
              {feature.name}
              {feature.limit && feature.limit !== 'unlimited' && (
                <span className="text-slate-400"> ({feature.limit})</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        variant={plan.highlighted ? 'default' : 'outline'}
        className="w-full"
        onClick={() => onSelect?.(plan.id)}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan ? 'Plan actual' : plan.id === 'free' ? 'Comenzar gratis' : 'Elegir plan'}
      </Button>
    </div>
  );
}
```

**Verification**: PricingCard renders with features and pricing.

### Task 4: Create PricingTable Component
**File**: `src/components/pricing/PricingTable.tsx`

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PricingCard } from './PricingCard';
import { PLANS } from '@/lib/data/mock-subscriptions';
import type { BillingCycle, PlanId } from '@/lib/types/subscription';

interface PricingTableProps {
  currentPlanId?: PlanId;
  onSelectPlan?: (planId: PlanId) => void;
  className?: string;
}

export function PricingTable({
  currentPlanId,
  onSelectPlan,
  className,
}: PricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  return (
    <div className={cn('', className)}>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-sm transition-colors',
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-sm transition-colors',
              billingCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Anual
            <span className="ml-1 text-xs text-emerald-600">-20%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrentPlan={plan.id === currentPlanId}
            onSelect={(id) => onSelectPlan?.(id as PlanId)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Verification**: PricingTable with billing toggle.

### Task 5: Create Public Pricing Page
**File**: `src/app/pricing/page.tsx`

```tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Precios | Arriendo Fácil',
  description: 'Planes y precios de Arriendo Fácil',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Planes simples, precios transparentes
          </h1>
          <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades.
            Sin sorpresas, sin comisiones ocultas.
          </p>
        </div>
      </section>

      {/* Pricing table */}
      <section className="pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <PricingTable />
        </div>
      </section>

      {/* FAQ or trust section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            ¿Tienes preguntas?
          </h2>
          <p className="text-slate-600 mt-2">
            Contáctanos y te ayudamos a elegir el mejor plan para ti.
          </p>
          <Link href="/contacto">
            <Button variant="outline" className="mt-4">
              Contactar
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
```

**Verification**: Public pricing page renders.

### Task 6: Create Upgrade Page (Panel)
**File**: `src/app/panel/upgrade/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { MOCK_SUBSCRIPTION, getPlanById } from '@/lib/data/mock-subscriptions';
import type { PlanId } from '@/lib/types/subscription';

export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const currentPlan = getPlanById(MOCK_SUBSCRIPTION.planId);

  const handleSelectPlan = (planId: PlanId) => {
    if (planId !== MOCK_SUBSCRIPTION.planId) {
      setSelectedPlan(planId);
    }
  };

  const handleCheckout = () => {
    // Mock checkout - would redirect to payment
    alert(`Redirigiendo al checkout para el plan ${selectedPlan}...`);
    // router.push(`/panel/checkout?plan=${selectedPlan}`);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Mejora tu plan
          </h1>
          <p className="text-slate-600 mt-2">
            Plan actual: <span className="font-medium">{currentPlan.name}</span>
          </p>
        </div>

        {/* Pricing table */}
        <PricingTable
          currentPlanId={MOCK_SUBSCRIPTION.planId}
          onSelectPlan={handleSelectPlan}
        />

        {/* Checkout button */}
        {selectedPlan && selectedPlan !== MOCK_SUBSCRIPTION.planId && (
          <div className="mt-8 text-center">
            <Button size="lg" onClick={handleCheckout}>
              <CreditCard className="w-4 h-4 mr-2" />
              Continuar con {getPlanById(selectedPlan).name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Verification**: Upgrade page with plan selection.

### Task 7: Create Pricing Components Index
**File**: `src/components/pricing/index.ts`

```tsx
export { PricingCard } from './PricingCard';
export { PricingTable } from './PricingTable';
```

**Verification**: Pricing components exported.

### Task 8: Add Upgrade Button to Dashboard Sidebar
**File**: Update `src/components/landlord/DashboardSidebar.tsx`

Add an upgrade CTA for free users in the sidebar:

```tsx
// At the bottom of sidebar, before user menu
{subscription.planId === 'free' && (
  <div className="p-4 border-t border-slate-100">
    <Link href="/panel/upgrade">
      <Button variant="outline" size="sm" className="w-full">
        <Sparkles className="w-4 h-4 mr-2" />
        Mejorar plan
      </Button>
    </Link>
  </div>
)}
```

**Verification**: Upgrade prompt visible for free users.

## Verification Checklist

- [ ] Subscription types defined (Plan, Subscription)
- [ ] Three plans: Free, Pro, Business with features
- [ ] PricingCard component with features list
- [ ] PricingTable with billing cycle toggle
- [ ] Public /pricing page
- [ ] /panel/upgrade page for existing users
- [ ] Upgrade CTA in dashboard for free users
- [ ] Build passes without errors

## Output

After completion:
1. Complete pricing system with types and mock data
2. Reusable pricing components
3. Public pricing page at /pricing
4. Upgrade flow in dashboard at /panel/upgrade
5. Upgrade prompts for free users
