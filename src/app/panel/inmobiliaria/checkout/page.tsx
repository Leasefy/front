'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Lock, Check, Buildings, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { getAgencyPlanById } from '@/lib/constants/subscription-plans';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import { formatCurrency } from '@/lib/format';
import type { AgencyPlanId } from '@/lib/types/subscription';

function AgencyCheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planTier = (searchParams.get('plan') || 'starter') as AgencyPlanId;
  const plan = getAgencyPlanById(planTier);

  const [backendPlanId, setBackendPlanId] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isPercentage = plan.pricingModel === 'percentage';
  const isCustom = plan.pricingModel === 'custom' || plan.price.monthly === null;
  const isFree = plan.price.monthly === 0 && !isPercentage && !isCustom;

  const priceDisplay = isPercentage
    ? `${plan.canonPercentage ?? 1}% del canon`
    : isCustom
      ? 'A la medida'
      : formatCurrency(plan.price.monthly ?? 0);

  // Resolve backend UUID for this tier
  useEffect(() => {
    subscriptionsApi.getPlans('AGENCY')
      .then((plans) => {
        const match = plans.find(
          (p) => p.tier?.toLowerCase() === planTier.toLowerCase()
        );
        if (match) {
          setBackendPlanId(match.id);
        } else {
          setError('No se encontró el plan seleccionado. Volvé a la lista de planes.');
        }
      })
      .catch(() => setError('Error al cargar el plan. Intentá de nuevo.'))
      .finally(() => setLoadingPlan(false));
  }, [planTier]);

  const handleProceed = () => {
    if (!backendPlanId) return;

    if (isCustom) {
      router.push('/panel/inmobiliaria');
      return;
    }

    setIsRedirecting(true);

    const amount = plan.price.monthly ?? 0;
    const params = new URLSearchParams({
      planId: backendPlanId,
      planName: plan.name,
      amount: amount.toString(),
      cycle: 'MONTHLY',
      returnUrl: '/panel/inmobiliaria',
    });

    router.push(`/pse-mock?${params.toString()}`);
  };

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SpinnerGap className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="mb-6">
          <BackButton href="/panel/inmobiliaria/upgrade" label="Volver a los planes" />
        </div>

        {/* Header */}
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {isCustom ? 'Solicitar cotización' : 'Confirmar suscripción'}
          </h1>
          <p className="text-sm text-fg-muted">
            Suscribirse al plan{' '}
            <span className="font-medium text-fg">{plan.name}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left — plan summary */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                  <Buildings className="w-6 h-6 text-fg-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground">Plan {plan.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-success shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-foreground mb-3">Límites del plan</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {plan.limits.properties === null ? '∞' : plan.limits.properties}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Propiedades</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {plan.limits.users === null ? '∞' : plan.limits.users}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Usuarios</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — price + CTA */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 space-y-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-foreground mb-4">Resumen</p>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Plan {plan.name}</span>
                  <span className="font-semibold text-foreground">{priceDisplay}</span>
                </div>
                {!isCustom && !isPercentage && !isFree && (
                  <div className="flex items-baseline justify-between pt-3 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total / mes</span>
                    <span className="text-lg font-bold text-foreground">{priceDisplay}</span>
                  </div>
                )}
                {isPercentage && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Se calcula sobre el canon mensual total administrado.
                  </p>
                )}
                {isCustom && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Un asesor te contactará para definir el precio.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <WarningCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[13px] text-destructive">{error}</p>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                hideArrow
                onClick={handleProceed}
                disabled={!backendPlanId || isRedirecting}
              >
                {isRedirecting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin mr-2" />
                    Redirigiendo...
                  </>
                ) : isCustom ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Solicitar cotización
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar con PSE
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Pago seguro vía PSE</span>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Visa</span>
                <span className="text-xs text-muted-foreground">Mastercard</span>
                <span className="text-xs text-muted-foreground">PSE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Sin contratos. Cancela cuando quieras.</p>
        </div>
      </div>
    </div>
  );
}

function AgencyCheckoutContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SpinnerGap className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <AgencyCheckoutInner />
    </Suspense>
  );
}

export default function AgencyCheckoutPage() {
  return (
    <PageGuard adminOnly>
      <AgencyCheckoutContent />
    </PageGuard>
  );
}
