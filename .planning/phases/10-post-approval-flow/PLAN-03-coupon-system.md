---
phase: "10-post-approval-flow"
plan: "03"
title: "Coupon System"
wave: 2
autonomous: true
must_haves:
  truths:
    - "Coupon types defined (PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS)"
    - "Coupon validation with clear error messages"
    - "Coupon input UI integrated in checkout"
    - "Price display shows discount when coupon applied"
    - "Trial period support for full access coupons"
  artifacts:
    - path: "src/lib/types/coupon.ts"
      description: "Coupon types and validation interfaces"
      min_lines: 60
    - path: "src/lib/data/mock-coupons.ts"
      description: "Mock coupons for testing"
      min_lines: 80
    - path: "src/lib/utils/coupon-validation.ts"
      description: "Coupon validation logic"
      min_lines: 50
    - path: "src/components/pricing/CouponInput.tsx"
      description: "Coupon input with apply button"
      min_lines: 80
    - path: "src/components/pricing/PriceSummary.tsx"
      description: "Price summary with discount display"
      min_lines: 70
  key_links:
    - from: "CouponInput"
      to: "coupon-validation"
      via: "validateCoupon function"
---

# Plan 03: Coupon System

## Objective

Create a flexible coupon system that supports trials, discounts, and promotional offers with clear feedback.

## Context

The coupon system needs to support:
- **PERCENTAGE**: 10%, 20%, 50%, 100% off
- **FIXED_AMOUNT**: $10,000 off, $20,000 off
- **FREE_MONTHS**: 1 month free, 3 months free
- **FULL_ACCESS**: Complete access for a period (for partnerships)

Use cases:
- `LAUNCH100` - 100% discount for first month (trial)
- `PARTNER2026` - Full access for 6 months (partnership deals)
- `VERANO20` - 20% off for seasonal promotion

## Tasks

### Task 1: Create Coupon Types
**File**: `src/lib/types/coupon.ts`

```tsx
export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_MONTHS' | 'FULL_ACCESS';
export type CouponStatus = 'active' | 'expired' | 'used' | 'invalid';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;

  // Value depends on type
  value: number; // percentage (0-100), amount in COP, months, or days for FULL_ACCESS

  // Restrictions
  validFrom: string;
  validUntil: string;
  maxUses: number | null; // null = unlimited
  currentUses: number;
  applicablePlans: ('free' | 'pro' | 'business')[] | 'all';
  minimumPurchase?: number;

  // Metadata
  description: string;
  createdAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  discount?: {
    type: 'percentage' | 'fixed' | 'free_period';
    value: number;
    description: string;
  };
}

export interface AppliedCoupon {
  code: string;
  type: CouponType;
  discount: number; // calculated discount amount
  description: string;
}
```

**Verification**: Coupon types defined with validation result.

### Task 2: Create Mock Coupons
**File**: `src/lib/data/mock-coupons.ts`

```tsx
import type { Coupon } from '@/lib/types/coupon';

export const MOCK_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'LAUNCH100',
    type: 'PERCENTAGE',
    value: 100,
    validFrom: '2026-01-01',
    validUntil: '2026-03-31',
    maxUses: 1000,
    currentUses: 150,
    applicablePlans: ['pro'],
    description: 'Primer mes gratis - Lanzamiento',
    createdAt: '2026-01-01',
  },
  {
    id: 'coupon-2',
    code: 'VERANO20',
    type: 'PERCENTAGE',
    value: 20,
    validFrom: '2026-01-01',
    validUntil: '2026-02-28',
    maxUses: null, // unlimited
    currentUses: 0,
    applicablePlans: 'all',
    description: '20% de descuento - Temporada de verano',
    createdAt: '2026-01-01',
  },
  {
    id: 'coupon-3',
    code: 'PARTNER2026',
    type: 'FULL_ACCESS',
    value: 180, // 180 days = 6 months
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 50,
    currentUses: 5,
    applicablePlans: ['pro', 'business'],
    description: 'Acceso completo 6 meses - Partners',
    createdAt: '2026-01-01',
  },
  {
    id: 'coupon-4',
    code: 'PROMO10K',
    type: 'FIXED_AMOUNT',
    value: 10000, // $10,000 COP off
    validFrom: '2026-01-01',
    validUntil: '2026-06-30',
    maxUses: 500,
    currentUses: 100,
    applicablePlans: ['pro', 'business'],
    minimumPurchase: 49900,
    description: '$10,000 de descuento',
    createdAt: '2026-01-01',
  },
  {
    id: 'coupon-5',
    code: 'GRATIS3',
    type: 'FREE_MONTHS',
    value: 3, // 3 months free
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 100,
    currentUses: 10,
    applicablePlans: ['pro'],
    description: '3 meses gratis - Early adopters',
    createdAt: '2026-01-01',
  },
];

export function getCouponByCode(code: string): Coupon | undefined {
  return MOCK_COUPONS.find(
    (c) => c.code.toLowerCase() === code.toLowerCase()
  );
}
```

**Verification**: Various coupon types available for testing.

### Task 3: Create Coupon Validation Logic
**File**: `src/lib/utils/coupon-validation.ts`

```tsx
import type { Coupon, CouponValidationResult } from '@/lib/types/coupon';
import type { PlanId } from '@/lib/types/subscription';
import { getCouponByCode } from '@/lib/data/mock-coupons';

export function validateCoupon(
  code: string,
  planId: PlanId,
  price: number
): CouponValidationResult {
  // Check if coupon exists
  const coupon = getCouponByCode(code);

  if (!coupon) {
    return {
      valid: false,
      error: 'Cupón no válido',
    };
  }

  // Check if expired
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);

  if (now < validFrom || now > validUntil) {
    return {
      valid: false,
      error: 'Este cupón ha expirado',
    };
  }

  // Check max uses
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    return {
      valid: false,
      error: 'Este cupón ha alcanzado su límite de uso',
    };
  }

  // Check applicable plans
  if (coupon.applicablePlans !== 'all' && !coupon.applicablePlans.includes(planId)) {
    return {
      valid: false,
      error: `Este cupón no aplica para el plan seleccionado`,
    };
  }

  // Check minimum purchase
  if (coupon.minimumPurchase && price < coupon.minimumPurchase) {
    return {
      valid: false,
      error: `Compra mínima de $${coupon.minimumPurchase.toLocaleString()} requerida`,
    };
  }

  // Calculate discount
  let discount: CouponValidationResult['discount'];

  switch (coupon.type) {
    case 'PERCENTAGE':
      discount = {
        type: 'percentage',
        value: coupon.value,
        description: `${coupon.value}% de descuento`,
      };
      break;
    case 'FIXED_AMOUNT':
      discount = {
        type: 'fixed',
        value: coupon.value,
        description: `$${coupon.value.toLocaleString()} de descuento`,
      };
      break;
    case 'FREE_MONTHS':
      discount = {
        type: 'free_period',
        value: coupon.value,
        description: `${coupon.value} ${coupon.value === 1 ? 'mes' : 'meses'} gratis`,
      };
      break;
    case 'FULL_ACCESS':
      discount = {
        type: 'free_period',
        value: coupon.value,
        description: `Acceso completo por ${coupon.value} días`,
      };
      break;
  }

  return {
    valid: true,
    coupon,
    discount,
  };
}

export function calculateDiscountedPrice(
  originalPrice: number,
  coupon: Coupon
): number {
  switch (coupon.type) {
    case 'PERCENTAGE':
      return Math.max(0, originalPrice * (1 - coupon.value / 100));
    case 'FIXED_AMOUNT':
      return Math.max(0, originalPrice - coupon.value);
    case 'FREE_MONTHS':
    case 'FULL_ACCESS':
      return 0; // First period is free
    default:
      return originalPrice;
  }
}
```

**Verification**: Validation logic handles all coupon types.

### Task 4: Create CouponInput Component
**File**: `src/components/pricing/CouponInput.tsx`

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, Check, Loader2 } from 'lucide-react';
import { validateCoupon } from '@/lib/utils/coupon-validation';
import type { PlanId, AppliedCoupon } from '@/lib/types/subscription';
import type { CouponValidationResult } from '@/lib/types/coupon';

interface CouponInputProps {
  planId: PlanId;
  price: number;
  appliedCoupon: AppliedCoupon | null;
  onApplyCoupon: (coupon: AppliedCoupon | null) => void;
  className?: string;
}

export function CouponInput({
  planId,
  price,
  appliedCoupon,
  onApplyCoupon,
  className,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = validateCoupon(code.trim(), planId, price);

    if (result.valid && result.coupon && result.discount) {
      onApplyCoupon({
        code: result.coupon.code,
        type: result.coupon.type,
        discount: result.discount.value,
        description: result.discount.description,
      });
      setCode('');
    } else {
      setError(result.error || 'Cupón no válido');
    }

    setIsLoading(false);
  };

  const handleRemove = () => {
    onApplyCoupon(null);
    setError(null);
  };

  // If coupon is applied, show it
  if (appliedCoupon) {
    return (
      <div className={cn('', className)}>
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-sm p-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                {appliedCoupon.code}
              </p>
              <p className="text-xs text-emerald-600">
                {appliedCoupon.description}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <label className="text-sm font-medium text-slate-700 mb-2 block">
        ¿Tienes un cupón?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Ingresa tu código"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!code.trim() || isLoading}
          variant="outline"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
```

**Verification**: CouponInput with validation and feedback.

### Task 5: Create PriceSummary Component
**File**: `src/components/pricing/PriceSummary.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { Plan, BillingCycle, AppliedCoupon } from '@/lib/types/subscription';
import { calculateDiscountedPrice } from '@/lib/utils/coupon-validation';
import { getCouponByCode } from '@/lib/data/mock-coupons';

interface PriceSummaryProps {
  plan: Plan;
  billingCycle: BillingCycle;
  appliedCoupon: AppliedCoupon | null;
  className?: string;
}

export function PriceSummary({
  plan,
  billingCycle,
  appliedCoupon,
  className,
}: PriceSummaryProps) {
  const originalPrice = billingCycle === 'monthly'
    ? plan.price.monthly
    : plan.price.yearly;

  let finalPrice = originalPrice;
  let savings = 0;

  if (appliedCoupon) {
    const coupon = getCouponByCode(appliedCoupon.code);
    if (coupon) {
      finalPrice = calculateDiscountedPrice(originalPrice, coupon);
      savings = originalPrice - finalPrice;
    }
  }

  const isFree = finalPrice === 0;

  return (
    <div className={cn('bg-slate-50 rounded-sm p-4', className)}>
      <h4 className="font-medium text-slate-900 mb-4">Resumen</h4>

      <div className="space-y-2 text-sm">
        {/* Plan */}
        <div className="flex justify-between">
          <span className="text-slate-600">Plan {plan.name}</span>
          <span className={cn(
            appliedCoupon && 'line-through text-slate-400'
          )}>
            {formatCurrency(originalPrice)}
          </span>
        </div>

        {/* Discount */}
        {appliedCoupon && savings > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>{appliedCoupon.description}</span>
            <span>-{formatCurrency(savings)}</span>
          </div>
        )}

        {/* Free period notice */}
        {appliedCoupon && (appliedCoupon.type === 'FREE_MONTHS' || appliedCoupon.type === 'FULL_ACCESS') && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-2 mt-2">
            <p className="text-xs text-emerald-700">
              {appliedCoupon.description}. Después se cobrará el precio normal.
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-200 my-3" />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="font-medium text-slate-900">
            {isFree ? 'A pagar hoy' : 'Total'}
          </span>
          <div className="text-right">
            <span className="text-lg font-bold text-slate-900">
              {isFree ? 'Gratis' : formatCurrency(finalPrice)}
            </span>
            {!isFree && (
              <span className="text-slate-500 text-sm">
                /{billingCycle === 'monthly' ? 'mes' : 'año'}
              </span>
            )}
          </div>
        </div>

        {/* Billing cycle note */}
        {billingCycle === 'yearly' && !isFree && (
          <p className="text-xs text-slate-500 text-right">
            Facturado anualmente
          </p>
        )}
      </div>
    </div>
  );
}
```

**Verification**: PriceSummary shows discounts clearly.

### Task 6: Update Pricing Components Index
**File**: `src/components/pricing/index.ts`

```tsx
export { PricingCard } from './PricingCard';
export { PricingTable } from './PricingTable';
export { CouponInput } from './CouponInput';
export { PriceSummary } from './PriceSummary';
```

**Verification**: All pricing components exported.

### Task 7: Create Checkout Page with Coupon
**File**: `src/app/panel/checkout/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CouponInput, PriceSummary } from '@/components/pricing';
import { getPlanById } from '@/lib/data/mock-subscriptions';
import type { PlanId, BillingCycle, AppliedCoupon } from '@/lib/types/subscription';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const planId = (searchParams.get('plan') || 'pro') as PlanId;
  const plan = getPlanById(planId);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/panel/upgrade"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a planes
        </Link>

        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Checkout
        </h1>
        <p className="text-slate-600 mb-8">
          Estás por suscribirte al plan {plan.name}
        </p>

        {/* Main content */}
        <div className="bg-white rounded-sm border border-slate-100 p-6">
          {/* Billing cycle selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Ciclo de facturación
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'flex-1 p-3 rounded-sm border text-sm font-medium transition-colors',
                  billingCycle === 'monthly'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'flex-1 p-3 rounded-sm border text-sm font-medium transition-colors',
                  billingCycle === 'yearly'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                Anual (-20%)
              </button>
            </div>
          </div>

          {/* Coupon input */}
          <CouponInput
            planId={planId}
            price={price}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={setAppliedCoupon}
            className="mb-6"
          />

          {/* Price summary */}
          <PriceSummary
            plan={plan}
            billingCycle={billingCycle}
            appliedCoupon={appliedCoupon}
            className="mb-6"
          />

          {/* Payment button */}
          <Button className="w-full" size="lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Pagar ahora
          </Button>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
            <Lock className="w-3 h-3" />
            <span>Pago seguro procesado por Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Checkout page with coupon integration.

## Verification Checklist

- [ ] Coupon types defined (4 types)
- [ ] Mock coupons for testing
- [ ] Validation handles all error cases
- [ ] CouponInput shows feedback (success/error)
- [ ] PriceSummary shows discount clearly
- [ ] Checkout page integrates coupon system
- [ ] Build passes without errors

## Output

After completion:
1. Complete coupon type system
2. Validation logic for all coupon types
3. Reusable CouponInput component
4. PriceSummary with discount display
5. Checkout page with full coupon flow
