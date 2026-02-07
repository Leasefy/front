'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, CheckCircle, WarningCircle, Shield, Sparkle, Lightning, Lock, ArrowRight, Crown, Buildings, ChartBarHorizontal, ChartBar } from '@phosphor-icons/react';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        {/* Premium Header */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          {/* Content */}
          <div className="relative px-8 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Sparkle className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-medium text-white">
                Desbloquea todo el potencial
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              Mejora tu plan
            </h1>
            <p className="text-white/70 max-w-md mx-auto">
              Accede a herramientas avanzadas para gestionar tus propiedades de forma profesional
            </p>

            {/* Current Plan Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-sm text-white/90">Plan actual:</span>
              <span className="text-sm font-semibold text-white">{currentPlan.name}</span>
            </div>
          </div>
        </div>

        {/* Current plan summary card */}
        <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">
                  Tu suscripción actual
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {currentPlan.price.monthly > 0 ? (
                    <>
                      Próximo pago: <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(currentPlan.price.monthly)}</span> el{' '}
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {new Date(MOCK_SUBSCRIPTION.currentPeriodEnd).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </>
                  ) : (
                    'Plan gratuito · Actualiza para más funcionalidades'
                  )}
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-6 sm:gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {currentPlan.features.find(f => f.id === 'property_listing')?.limit === 'unlimited' ? '∞' : currentPlan.features.find(f => f.id === 'property_listing')?.limit || 1}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Propiedades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {currentPlan.features.find(f => f.id === 'unlimited_contracts')?.limit === 'unlimited' ? '∞' : currentPlan.features.find(f => f.id === 'unlimited_contracts')?.limit || 1}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Contratos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Lightning className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white text-sm">Análisis AI</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Evaluación automática</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Buildings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white text-sm">Multi-propiedad</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Gestión centralizada</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <ChartBar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white text-sm">Analíticas</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Reportes detallados</p>
              </div>
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
          <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    Plan seleccionado: {newPlan.name}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                    {billingCycle === 'yearly'
                      ? `${formatCurrency(newPlan.price.yearly)}/año (ahorras ${getYearlySavings(newPlan)}%)`
                      : `${formatCurrency(newPlan.price.monthly)}/mes`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className={cn(
                  'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all min-w-[200px]',
                  'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25',
                  isProcessing && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <>
                    <CreditCard className="w-4 h-4 animate-pulse" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Continuar al pago
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Downgrade warning */}
            {newPlan.price.monthly < currentPlan.price.monthly && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <WarningCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Al cambiar a un plan menor, perderás acceso a algunas
                  funcionalidades al final de tu período de facturación actual.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-4 bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Pago seguro</span>
            </div>
            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Cancela cuando quieras</span>
            </div>
            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Garantía de satisfacción</span>
            </div>
          </div>

          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
            Aceptamos Visa, Mastercard y PSE
          </p>
        </div>
      </div>
    </div>
  );
}
