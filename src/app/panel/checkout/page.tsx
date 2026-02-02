'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Lock, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CouponInput, PriceSummary } from '@/components/pricing';
import { getPlanById } from '@/lib/data/mock-subscriptions';
import { formatCurrency } from '@/lib/format';
import type { PlanId, BillingCycle } from '@/lib/types/subscription';
import type { AppliedCoupon } from '@/lib/types/coupon';
import { cn } from '@/lib/utils';

/**
 * Inner checkout component that uses search params
 */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get plan from URL or default to pro
  const planId = (searchParams.get('plan') || 'pro') as PlanId;
  const initialBilling = (searchParams.get('billing') || 'monthly') as BillingCycle;

  const plan = getPlanById(planId);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBilling);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get price based on billing cycle
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;

  const handleSubmit = async () => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In real app, would integrate with payment provider
    alert(`Pago exitoso! Plan ${plan.name} activado.`);

    setIsProcessing(false);
    router.push('/panel');
  };

  // Plan features to display
  const includedFeatures = plan.features
    .filter((f) => f.included)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Checkout
          </h1>
          <p className="text-slate-600">
            Estas por suscribirte al plan{' '}
            <span className="font-medium text-slate-900">{plan.name}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main form column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Plan summary card */}
            <div className="bg-white rounded-sm border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900">
                    Plan {plan.name}
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {plan.description}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {includedFeatures.map((feature) => (
                      <li
                        key={feature.id}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feature.name}</span>
                        {feature.limit && feature.limit !== 'unlimited' && (
                          <span className="text-slate-400">
                            (hasta {feature.limit})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Billing cycle selector */}
            <div className="bg-white rounded-sm border border-slate-200 p-5">
              <label className="text-sm font-medium text-slate-700 mb-3 block">
                Ciclo de facturacion
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'flex-1 p-4 rounded-sm border text-sm font-medium transition-colors text-left',
                    billingCycle === 'monthly'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span className="block">Mensual</span>
                  <span className={cn(
                    'block mt-1 text-lg font-bold',
                    billingCycle === 'monthly' ? 'text-primary' : 'text-slate-900'
                  )}>
                    {formatCurrency(plan.price.monthly)}
                    <span className="text-sm font-normal text-slate-500">/mes</span>
                  </span>
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    'flex-1 p-4 rounded-sm border text-sm font-medium transition-colors text-left relative',
                    billingCycle === 'yearly'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-xs font-medium bg-emerald-500 text-white rounded-sm">
                    -20%
                  </span>
                  <span className="block">Anual</span>
                  <span className={cn(
                    'block mt-1 text-lg font-bold',
                    billingCycle === 'yearly' ? 'text-primary' : 'text-slate-900'
                  )}>
                    {formatCurrency(plan.price.yearly)}
                    <span className="text-sm font-normal text-slate-500">/ano</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Coupon input */}
            <div className="bg-white rounded-sm border border-slate-200 p-5">
              <CouponInput
                planId={planId}
                price={price}
                appliedCoupon={appliedCoupon}
                onApplyCoupon={setAppliedCoupon}
              />
            </div>
          </div>

          {/* Summary column */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 space-y-4">
              {/* Price summary */}
              <PriceSummary
                plan={plan}
                billingCycle={billingCycle}
                appliedCoupon={appliedCoupon}
              />

              {/* Payment button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar ahora
                  </>
                )}
              </Button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Lock className="w-3 h-3" />
                <span>Pago seguro procesado por Stripe</span>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400">Visa</span>
                <span className="text-xs text-slate-400">Mastercard</span>
                <span className="text-xs text-slate-400">PSE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom trust message */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Puedes cancelar en cualquier momento. Sin compromisos.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Checkout page with coupon integration
 * Wrapped in Suspense for Next.js 14 useSearchParams requirement
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
