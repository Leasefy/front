'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, Shield, Sparkle, Lock, ArrowRight, Crown, Robot, ChartBar, Buildings } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { useAgencyPlans } from '@/lib/hooks/useSubscription';
import { getAgencyPlanById } from '@/lib/constants/subscription-plans';
import type { AgencyPlanId } from '@/lib/types/subscription';
import { cn } from '@/lib/utils';

/**
 * Upgrade page for agency users.
 * Fetches agency plan data from backend (falls back to static AGENCY_PLANS).
 */
export default function AgencyUpgradePage() {
  const router = useRouter();
  const { subscription } = useMySubscription();
  const { plans, isLoading } = useAgencyPlans();

  const currentPlanId = (subscription?.planId ?? 'starter') as AgencyPlanId;
  const [selectedPlan, setSelectedPlan] = useState<AgencyPlanId | null>(null);

  const currentPlan = getAgencyPlanById(currentPlanId);
  const newPlan = selectedPlan ? getAgencyPlanById(selectedPlan) : null;

  const handleSelectPlan = (planId: string) => {
    if (planId !== currentPlanId) {
      setSelectedPlan(planId as AgencyPlanId);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    router.push(`/panel/inmobiliaria/checkout?plan=${selectedPlan}`);
  };

  const canUpgrade = selectedPlan && selectedPlan !== currentPlanId;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="mb-6">
          <BackButton href="/panel/inmobiliaria" label="Volver al panel" />
        </div>

        {/* Header gradient */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative px-8 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Sparkle className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-medium text-white">Planes para inmobiliarias</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              Escala tu inmobiliaria con IA
            </h1>
            <p className="text-white/70 max-w-md mx-auto">
              Evaluaciones automáticas, matching inteligente y 19 agentes IA. Todo en un solo lugar.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-sm text-white/90">Plan actual</span>
              <span className="text-sm font-semibold text-white">{currentPlan.name}</span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Robot, color: 'emerald', title: '19 agentes IA', desc: 'Scoring, matching, cobros y más' },
            { icon: Buildings, color: 'indigo', title: 'Propiedades ilimitadas', desc: 'Sin límites en tu portafolio' },
            { icon: ChartBar, color: 'purple', title: 'Reportes avanzados', desc: 'Analytics en tiempo real' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">{title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plans table */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 rounded-2xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <PricingTable
            currentPlanId={currentPlanId}
            agencyPlans={plans}
            onSelectPlan={handleSelectPlan}
          />
        )}

        {/* Selected plan CTA */}
        {canUpgrade && newPlan && (
          <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-6">
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
                    {newPlan.pricingModel === 'percentage'
                      ? `${newPlan.canonPercentage}% del canon administrado`
                      : newPlan.pricingModel === 'custom'
                        ? 'Precio a la medida — te contactaremos'
                        : newPlan.price.monthly != null
                          ? `$${newPlan.price.monthly.toLocaleString('es-CO')} COP / mes`
                          : ''}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm uppercase tracking-wide font-mono',
                  'bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px] justify-center'
                )}
              >
                <CreditCard className="w-4 h-4" />
                {newPlan.pricingModel === 'custom' ? 'Solicitar cotización' : 'Continuar al pago'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-4 bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700">
            {[
              { icon: Lock, label: 'Pago seguro' },
              { icon: CheckCircle, label: 'Cancela cuando quieras' },
              { icon: Shield, label: 'Garantía de satisfacción' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 -ml-6 mr-0" />}
                <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
