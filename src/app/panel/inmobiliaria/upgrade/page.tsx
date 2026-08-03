'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, Shield, Sparkle, Lock, ArrowRight, Crown, Robot, ChartBar, Buildings, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { useAgencyPlans } from '@/lib/hooks/useSubscription';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { getAgencyPlanById } from '@/lib/constants/subscription-plans';
import type { AgencyPlanId } from '@/lib/types/subscription';

/**
 * Upgrade page for agency users.
 * Fetches agency plan data from backend (falls back to static AGENCY_PLANS).
 */
function AgencyUpgradeContent() {
  const router = useRouter();
  const { currentPlanId: agencyPlanId, error: subscriptionError, refetch: subscriptionRefetch } = useAgencySubscription();
  const { plans, isLoading } = useAgencyPlans();

  // Read the REAL agency subscription (not the legacy /subscriptions/me). On error,
  // leave currentPlanId undefined so PricingTable does not falsely highlight a plan.
  const currentPlanId = (subscriptionError
    ? undefined
    : agencyPlanId ?? 'starter') as AgencyPlanId | undefined;
  const [selectedPlan, setSelectedPlan] = useState<AgencyPlanId | null>(null);

  // currentPlan is null when subscription failed to load (currentPlanId is undefined).
  const currentPlan = currentPlanId ? getAgencyPlanById(currentPlanId) : null;
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
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="mb-6">
          <BackButton href="/panel/inmobiliaria" label="Volver al panel" />
        </div>

        {/* Header — brand hero surface (ink), the page's single brand anchor */}
        <div className="relative rounded-xl overflow-hidden mb-8 bg-ink">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative px-8 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Sparkle className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Planes para inmobiliarias</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white mb-3">
              Escala tu inmobiliaria con IA
            </h1>
            <p className="text-white/70 max-w-md mx-auto">
              Evaluaciones automáticas, matching inteligente y 19 agentes IA. Todo en un solo lugar.
            </p>

            {subscriptionError ? (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 backdrop-blur-sm border border-white/20">
                <WarningCircle className="w-4 h-4 text-white/70" />
                <span className="text-sm text-white/70">No pudimos cargar tu plan actual</span>
                <button
                  type="button"
                  onClick={subscriptionRefetch}
                  className="text-sm font-medium text-white underline underline-offset-2 flex items-center gap-1"
                >
                  <ArrowCounterClockwise className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 backdrop-blur-sm border border-white/20">
                <Crown className="w-4 h-4 text-white" />
                <span className="text-sm text-white/90">Plan actual</span>
                <span className="text-sm font-semibold text-white">{currentPlan?.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Benefits — neutral icon tiles (blue = actionable only, DS golden rule) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Robot, title: '19 agentes IA', desc: 'Scoring, matching, cobros y más' },
            { icon: Buildings, title: 'Propiedades ilimitadas', desc: 'Sin límites en tu portafolio' },
            { icon: ChartBar, title: 'Reportes avanzados', desc: 'Analytics en tiempo real' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-fg-muted" />
                </div>
                <div>
                  <p className="font-medium text-fg text-sm">{title}</p>
                  <p className="text-xs text-fg-muted">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plans table */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
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
          <div className="mt-8 bg-primary-soft border border-primary/30 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-fg">
                    Plan seleccionado: {newPlan.name}
                  </p>
                  <p className="text-sm text-fg-muted mt-0.5">
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

              <Button onClick={handleCheckout} hideArrow className="min-w-[200px] justify-center">
                <CreditCard className="w-4 h-4" />
                {newPlan.pricingModel === 'custom' ? 'Solicitar cotización' : 'Continuar al pago'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-4 bg-card rounded-xl border border-border">
            {[
              { icon: Lock, label: 'Pago seguro' },
              { icon: CheckCircle, label: 'Cancela cuando quieras' },
              { icon: Shield, label: 'Garantía de satisfacción' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className="w-px h-4 bg-border -ml-6 mr-0" />}
                <Icon className="w-4 h-4 text-success" />
                <span className="text-sm text-fg-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgencyUpgradePage() {
  return (
    <PageGuard adminOnly>
      <AgencyUpgradeContent />
    </PageGuard>
  );
}
