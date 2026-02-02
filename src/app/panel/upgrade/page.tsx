'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MOCK_SUBSCRIPTION,
  getPlanById,
  getYearlySavings,
} from '@/lib/data/mock-subscriptions';
import { formatCurrency } from '@/lib/format';
import type { PlanId, BillingCycle } from '@/lib/types/subscription';
import { cn } from '@/lib/utils';

/**
 * Upgrade page for existing users
 * Shows current plan, allows selection of new plan
 */
export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = getPlanById(MOCK_SUBSCRIPTION.planId);
  const newPlan = selectedPlan ? getPlanById(selectedPlan) : null;

  const handleSelectPlan = (planId: PlanId) => {
    if (planId !== MOCK_SUBSCRIPTION.planId) {
      setSelectedPlan(planId);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);

    // Small delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Redirect to checkout with selected plan and billing cycle
    router.push(`/panel/checkout?plan=${selectedPlan}&billing=${billingCycle}`);
  };

  const canUpgrade =
    selectedPlan &&
    selectedPlan !== MOCK_SUBSCRIPTION.planId &&
    (selectedPlan !== 'free' ||
      MOCK_SUBSCRIPTION.planId === 'business' ||
      MOCK_SUBSCRIPTION.planId === 'pro');

  return (
    <div className="min-h-screen bg-background">
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
          <h1 className="text-2xl font-bold text-slate-900">Mejora tu plan</h1>
          <p className="text-slate-600 mt-2">
            Plan actual:{' '}
            <Badge variant="secondary" className="ml-1">
              {currentPlan.name}
            </Badge>
          </p>
        </div>

        {/* Current plan summary */}
        <div className="bg-white rounded-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">
                Tu suscripcion actual
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Estas en el plan{' '}
                <span className="font-medium">{currentPlan.name}</span>.
                {currentPlan.price.monthly > 0 && (
                  <>
                    {' '}
                    Tu proximo pago es de{' '}
                    <span className="font-medium">
                      {formatCurrency(currentPlan.price.monthly)}
                    </span>{' '}
                    el{' '}
                    <span className="font-medium">
                      {new Date(
                        MOCK_SUBSCRIPTION.currentPeriodEnd
                      ).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    .
                  </>
                )}
                {currentPlan.price.monthly === 0 && (
                  <> Actualiza para desbloquear todas las funcionalidades.</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing table */}
        <PricingTable
          currentPlanId={MOCK_SUBSCRIPTION.planId}
          onSelectPlan={handleSelectPlan}
        />

        {/* Selected plan confirmation */}
        {canUpgrade && newPlan && (
          <div className="mt-8 bg-primary/5 border border-primary/20 rounded-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">
                    Seleccionaste el plan {newPlan.name}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {billingCycle === 'yearly'
                      ? `${formatCurrency(newPlan.price.yearly)}/ano (ahorras ${getYearlySavings(newPlan)}%)`
                      : `${formatCurrency(newPlan.price.monthly)}/mes`}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
                className={cn(
                  'min-w-[200px]',
                  isProcessing && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin mr-2">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Continuar al pago
                  </>
                )}
              </Button>
            </div>

            {/* Downgrade warning */}
            {newPlan.price.monthly < currentPlan.price.monthly && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Al cambiar a un plan menor, perderas acceso a algunas
                  funcionalidades al final de tu periodo de facturacion actual.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Pago seguro. Puedes cancelar en cualquier momento.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img
              src="/images/payment/visa.svg"
              alt="Visa"
              className="h-6 opacity-60"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <img
              src="/images/payment/mastercard.svg"
              alt="Mastercard"
              className="h-6 opacity-60"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-xs text-slate-400">PSE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
