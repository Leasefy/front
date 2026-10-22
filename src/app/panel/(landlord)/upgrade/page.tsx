'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, WarningCircle, Shield, Lightning, Lock, ArrowRight, Crown, Buildings, ChartBar } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getYearlySavings } from '@/lib/constants/subscription-plans';
import { precioLegible } from '@/lib/planes/precio-del-plan-del-propietario';
import { usePlanesDelPropietario } from '@/lib/planes/use-planes-del-propietario';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import type { PlanId, BillingCycle } from '@/lib/types/subscription';
import { useI18n } from '@/lib/i18n';

/**
 * Upgrade page for existing users
 * Shows current plan, allows selection of new plan
 */
export default function UpgradePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { subscription, error: subscriptionError, refetch: subscriptionRefetch } = useMySubscription();
  // On error, leave currentPlanId undefined so PricingTable does not falsely
  // highlight 'starter' as the active plan — we genuinely don't know it.
  const currentPlanId = (subscriptionError
    ? undefined
    : subscription?.planId ?? 'starter') as PlanId | undefined;
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  // El precio de cada plan lo dice el back (QA 23-09), no `PLANS`.
  const { planDe } = usePlanesDelPropietario();
  // currentPlan is null when subscription failed to load (currentPlanId is undefined).
  const currentPlan = currentPlanId ? planDe(currentPlanId as PlanId) : null;
  const newPlan = selectedPlan ? planDe(selectedPlan) : null;

  const handleSelectPlan = (planId: string) => {
    if (planId !== currentPlanId) {
      setSelectedPlan(planId as PlanId);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);

    // GLOW UP (21-10-2026): sin la espera inventada de medio segundo «para dar
    // sensación de avance»: se va al pago de una.
    // Redirect to checkout with selected plan and billing cycle
    router.push(`/panel/checkout?plan=${selectedPlan}&billing=${billingCycle}`);
  };

  const canUpgrade =
    selectedPlan &&
    selectedPlan !== currentPlanId &&
    (selectedPlan !== 'starter' ||
      currentPlanId === 'flex' ||
      currentPlanId === 'pro');

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl p-6 lg:p-8">
        {/* Back link */}
        <div className="mb-6">
          <BackButton href="/panel" label={t('landlord.upgrade.backToPanel')} />
        </div>

        {/* GLOW UP (21-10-2026): el encabezado común del portal. Antes, una portada con
            degradado, manchas difusas, vidrio esmerilado y una chispita: todo fuera del
            sistema. El plan actual va al lado del título; si no se pudo leer, la tarjeta
            de abajo lo dice con «Reintentar» (antes salía dos veces). */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Tu plan' : 'Your plan'}
          titulo={t('landlord.upgrade.title')}
          descripcion={t('landlord.upgrade.subtitle')}
          junto={
            !subscriptionError && currentPlan ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-body-sm text-fg"
                data-testid="plan-actual"
              >
                <Crown className="h-4 w-4 text-warning" aria-hidden="true" />
                {t('landlord.upgrade.currentPlan')} <span className="font-semibold">{currentPlan.name}</span>
              </span>
            ) : undefined
          }
        />

        {/* Current plan summary card */}
        <Card className="p-6 mb-8">
          {subscriptionError ? (
            /* Error state — do not assert a plan name or billing details we could not load */
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-fg">
                  {t('landlord.upgrade.currentSubscription')}
                </h2>
                <p className="text-sm text-fg-muted mt-0.5">
                  {t('landlord.upgrade.subscriptionLoadError')}
                </p>
              </div>
              <button
                type="button"
                onClick={subscriptionRefetch}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                {t('landlord.upgrade.subscriptionRetry')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-fg">
                    {t('landlord.upgrade.currentSubscription')}
                  </h2>
                  <p className="text-sm text-fg-muted mt-0.5">
                    {(currentPlan?.price.monthly ?? 0) > 0 ? (
                      <>
                        {t('landlord.upgrade.nextPayment')} <span className="font-medium text-fg">{precioLegible(currentPlan!.price.monthly)}</span> {t('landlord.upgrade.nextPaymentDate')}{' '}
                        <span className="font-medium text-fg">
                          {new Date(subscription?.currentPeriodEnd ?? new Date().toISOString()).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
                            day: 'numeric',
                            month: 'long',
                          })}
                        </span>
                      </>
                    ) : (
                      t('landlord.upgrade.freePlanHint')
                    )}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-6 sm:gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-fg font-mono tabular-nums">
                    {currentPlan?.features.find(f => f.id === 'property_listing')?.limit === 'unlimited' ? '∞' : currentPlan?.features.find(f => f.id === 'property_listing')?.limit || 1}
                  </p>
                  <p className="text-xs text-fg-muted">{t('landlord.upgrade.propertiesLabel')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-fg font-mono tabular-nums">
                    {currentPlan?.features.find(f => f.id === 'unlimited_contracts')?.limit === 'unlimited' ? '∞' : currentPlan?.features.find(f => f.id === 'unlimited_contracts')?.limit || 1}
                  </p>
                  <p className="text-xs text-fg-muted">{t('landlord.upgrade.contractsLabel')}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Benefits highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center">
                <Lightning className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-fg text-sm">{t('landlord.upgrade.aiAnalysis')}</p>
                <p className="text-xs text-fg-muted">{t('landlord.upgrade.autoEvaluation')}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
                <Buildings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-fg text-sm">{t('landlord.upgrade.multiProperty')}</p>
                <p className="text-xs text-fg-muted">{t('landlord.upgrade.centralManagement')}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-surface-muted flex items-center justify-center">
                <ChartBar className="w-5 h-5 text-fg-muted" />
              </div>
              <div>
                <p className="font-medium text-fg text-sm">{t('landlord.upgrade.analytics')}</p>
                <p className="text-xs text-fg-muted">{t('landlord.upgrade.detailedReports')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pricing table */}
        <PricingTable
          currentPlanId={currentPlanId}
          onSelectPlan={handleSelectPlan}
        />

        {/* Selected plan confirmation */}
        {canUpgrade && newPlan && (
          <div className="mt-8 bg-primary-soft border border-primary/30 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-fg">
                    {t('landlord.upgrade.selectedPlan', { name: newPlan.name })}
                  </p>
                  <p className="text-sm text-fg-muted mt-0.5">
                    {billingCycle === 'yearly'
                      ? t('landlord.upgrade.perYearSaving', { price: precioLegible(newPlan.price.yearly), percent: getYearlySavings(newPlan) })
                      : t('landlord.upgrade.perMonthPrice', { price: precioLegible(newPlan.price.monthly) })}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="min-w-[200px]"
                hideArrow
              >
                {isProcessing ? (
                  <>
                    <CreditCard className="w-4 h-4 animate-pulse" />
                    {t('landlord.upgrade.processingPayment')}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    {t('landlord.upgrade.continueToPayment')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Downgrade warning — only shown when we know the current plan price */}
            {currentPlan &&
              newPlan.price.monthly !== null &&
              currentPlan.price.monthly !== null &&
              newPlan.price.monthly < currentPlan.price.monthly && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-warning-soft border border-warning/30 rounded-lg">
                <WarningCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-warning">
                  {t('landlord.upgrade.downgradeWarning')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-4 bg-surface rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-success" />
              <span className="text-sm text-fg-muted">{t('landlord.upgrade.securePayment')}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-fg-muted">{t('landlord.upgrade.cancelAnytime')}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm text-fg-muted">{t('landlord.upgrade.satisfactionGuarantee')}</span>
            </div>
          </div>

          <p className="text-xs text-fg-subtle mt-4">
            {t('landlord.upgrade.acceptedMethods')}
          </p>
        </div>
      </div>
    </div>
  );
}
