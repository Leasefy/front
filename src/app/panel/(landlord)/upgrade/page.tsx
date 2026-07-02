'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, WarningCircle, Shield, Sparkle, Lightning, Lock, ArrowRight, Crown, Buildings, ChartBarHorizontal, ChartBar } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPlanById, getYearlySavings } from '@/lib/constants/subscription-plans';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { formatCurrency } from '@/lib/format';
import type { PlanId, BillingCycle } from '@/lib/types/subscription';
import { useI18n } from '@/lib/i18n';

/**
 * Upgrade page for existing users
 * Shows current plan, allows selection of new plan
 */
export default function UpgradePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { subscription } = useMySubscription();
  const currentPlanId = subscription?.planId ?? 'starter';
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = getPlanById(currentPlanId);
  const newPlan = selectedPlan ? getPlanById(selectedPlan) : null;

  const handleSelectPlan = (planId: string) => {
    if (planId !== currentPlanId) {
      setSelectedPlan(planId as PlanId);
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
    selectedPlan !== currentPlanId &&
    (selectedPlan !== 'starter' ||
      currentPlanId === 'flex' ||
      currentPlanId === 'pro');

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <BackButton href="/panel" label={t('landlord.upgrade.backToPanel')} />
        </div>

        {/* Premium Header */}
        <div className="relative rounded-xl overflow-hidden mb-8">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A40FF] via-[#1A40FF] to-[#6B6B6B]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neutral-100 dark:bg-neutral-800/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          {/* Content */}
          <div className="relative px-8 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Sparkle className="w-4 h-4 text-[#B7791F]" />
              <span className="text-sm font-medium text-white">
                {t('landlord.upgrade.unlockPotential')}
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              {t('landlord.upgrade.title')}
            </h1>
            <p className="text-white/70 max-w-md mx-auto">
              {t('landlord.upgrade.subtitle')}
            </p>

            {/* Current Plan Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Crown className="w-4 h-4 text-[#B7791F]" />
              <span className="text-sm text-white/90">{t('landlord.upgrade.currentPlan')}</span>
              <span className="text-sm font-semibold text-white">{currentPlan.name}</span>
            </div>
          </div>
        </div>

        {/* Current plan summary card */}
        <Card className="p-6 mb-8">
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
                  {currentPlan.price.monthly > 0 ? (
                    <>
                      {t('landlord.upgrade.nextPayment')} <span className="font-medium text-fg">{formatCurrency(currentPlan.price.monthly)}</span> {t('landlord.upgrade.nextPaymentDate')}{' '}
                      <span className="font-medium text-fg">
                        {new Date(subscription?.currentPeriodEnd ?? new Date().toISOString()).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
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
                  {currentPlan.features.find(f => f.id === 'property_listing')?.limit === 'unlimited' ? '∞' : currentPlan.features.find(f => f.id === 'property_listing')?.limit || 1}
                </p>
                <p className="text-xs text-fg-muted">{t('landlord.upgrade.propertiesLabel')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-fg font-mono tabular-nums">
                  {currentPlan.features.find(f => f.id === 'unlimited_contracts')?.limit === 'unlimited' ? '∞' : currentPlan.features.find(f => f.id === 'unlimited_contracts')?.limit || 1}
                </p>
                <p className="text-xs text-fg-muted">{t('landlord.upgrade.contractsLabel')}</p>
              </div>
            </div>
          </div>
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
          <div className="mt-8 bg-primary-soft border border-primary/30 rounded-xl p-6">
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
                      ? t('landlord.upgrade.perYearSaving', { price: formatCurrency(newPlan.price.yearly), percent: getYearlySavings(newPlan) })
                      : t('landlord.upgrade.perMonthPrice', { price: formatCurrency(newPlan.price.monthly) })}
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

            {/* Downgrade warning */}
            {newPlan.price.monthly < currentPlan.price.monthly && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-warning-soft border border-warning/30 rounded-xl">
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
          <div className="inline-flex items-center gap-6 px-6 py-4 bg-surface rounded-xl border border-border">
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
