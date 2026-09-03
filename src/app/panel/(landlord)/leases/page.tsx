'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { House, CurrencyDollar, Clock, WarningCircle, TrendUp } from '@phosphor-icons/react';
import { LeaseExpandableItem } from '@/components/lease/LeaseExpandableItem';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Button, Spinner } from '@/components/ui';
import { PageHeader, KpiCard } from '@leasefy/cadence';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLeases } from '@/lib/hooks/useLeases';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// TextTs
// ============================================================================

interface TabConfig {
  id: string;
  label: string;
  count: number;
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  value: number;
  variant: 'success' | 'warning' | 'danger';
}

function ProgressBar({ value, variant }: ProgressBarProps) {
  const barColorClass = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[variant];

  return (
    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function LandlordLeasesPage() {
  const { leases, stats, isLoading, error, errorCrudo, refetch } = useLeases();
  const { t, formatCurrency } = useI18n();

  const [activeTab, setTab] = useState('all');

  // Payment status counts are not available at list level (lazy-loaded per expand).
  // We use empty placeholders for tabs; payment-based tabs will show 0 until the
  // backend provides payment summary data at the lease list level.
  const leasePaymentStatus = useMemo(() => {
    const map: Record<string, { pending: number; late: number }> = {};
    for (const lease of leases) {
      map[lease.id] = { pending: 0, late: 0 };
    }
    return map;
  }, [leases]);

  // Funnel by tab
  const filteredLeases = useMemo(() => {
    if (activeTab === 'all') return leases;
    if (activeTab === 'active') return leases.filter(l => l.status === 'active');
    if (activeTab === 'ending_soon') return leases.filter(l => l.status === 'ending_soon');
    if (activeTab === 'late') return leases.filter(l => leasePaymentStatus[l.id]?.late > 0);
    if (activeTab === 'pending') return leases.filter(l => leasePaymentStatus[l.id]?.pending > 0);
    return leases;
  }, [activeTab, leases, leasePaymentStatus]);

  // Counts
  const counts = useMemo(() => ({
    all: leases.length,
    active: leases.filter(l => l.status === 'active').length,
    endingSoon: leases.filter(l => l.status === 'ending_soon').length,
    late: leases.filter(l => leasePaymentStatus[l.id]?.late > 0).length,
    pending: leases.filter(l => leasePaymentStatus[l.id]?.pending > 0).length,
  }), [leases, leasePaymentStatus]);

  const tabs: TabConfig[] = [
    { id: 'all', label: t('landlord.leases.tabAll'), count: counts.all },
    { id: 'active', label: t('landlord.leases.tabActive'), count: counts.active },
    { id: 'ending_soon', label: t('landlord.leases.tabEndingSoon'), count: counts.endingSoon },
    { id: 'pending', label: t('landlord.leases.tabPendingPayments'), count: counts.pending },
    { id: 'late', label: t('landlord.leases.tabLatePayments'), count: counts.late },
  ];

  // Calculate collection rate
  const collectionRate = stats.totalMonthlyIncome > 0
    ? Math.round(((stats.totalMonthlyIncome - (stats.latePayments * (stats.totalMonthlyIncome / stats.activeLeases))) / stats.totalMonthlyIncome) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Mostraba `description={error}`: el mensaje crudo del backend,
              en inglés, como único texto de la pantalla. */}
          <FalloDeCarga error={errorCrudo ?? error} queEs="tus arriendos" onReintentar={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <PageHeader title={t('landlord.leases.title')} subtitle={t('landlord.leases.subtitle')} />

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label={t('landlord.leases.activeLeases')}
            value={String(stats.activeLeases)}
            sublabel={t('landlord.leases.activeLeasesSubLabel')}
            icon={<House />}
          />
          <KpiCard
            label={t('landlord.leases.monthlyIncome')}
            value={String(formatCurrency(stats.totalMonthlyIncome))}
            sublabel={t('landlord.leases.monthlyIncomeSubLabel')}
            icon={<CurrencyDollar />}
          />
          <KpiCard
            label={t('landlord.leases.pendingPayments')}
            value={String(stats.pendingPayments)}
            sublabel={t('landlord.leases.pendingPaymentsSubLabel')}
            icon={<Clock />}
          />
          <KpiCard
            label={t('landlord.leases.latePayments')}
            value={String(stats.latePayments)}
            sublabel={stats.latePayments > 0 ? t('landlord.leases.latePaymentsSubLabel') : t('landlord.leases.latePaymentsAllGood')}
            icon={<WarningCircle />}
          />
        </div>

        {/* Financial Summary Card */}
        <div className="bg-primary-soft border border-primary/30 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                  <TrendUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-primary text-sm font-medium">{t('landlord.leases.financialSummary')}</span>
              </div>
              <p className="text-3xl font-bold text-fg tracking-tight">
                {formatCurrency(stats.totalMonthlyIncome)}
              </p>
              <p className="text-fg-muted text-sm mt-1">
                {t('landlord.leases.expectedMonthlyIncome')}
              </p>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fg-muted text-sm">{t('landlord.leases.collectionRate')}</span>
                <span className="text-fg font-semibold">{collectionRate}%</span>
              </div>
              <ProgressBar
                value={collectionRate}
                variant={collectionRate >= 90 ? 'success' : collectionRate >= 70 ? 'warning' : 'danger'}
              />
            </div>
          </div>
        </div>

        {/* Ending Soon Warning */}
        {stats.endingSoon > 0 && (
          <div className="mb-6 p-4 bg-warning-soft border border-warning/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center">
                <WarningCircle className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">
                  {stats.endingSoon > 1
                    ? t('landlord.leases.endingSoonWarningPlural', { count: stats.endingSoon })
                    : t('landlord.leases.endingSoonWarning', { count: stats.endingSoon })}
                </p>
                <p className="text-xs text-warning/70">
                  {t('landlord.leases.endingSoonDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs (segmented filter over the leases list) */}
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList variant="segmented" className="mb-6">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group inline-flex items-center gap-2"
              >
                {tab.label}
                <span className="px-1.5 py-0.5 rounded-sm text-xs font-medium tabular-nums bg-surface-muted text-fg-muted group-data-[state=active]:bg-primary-soft group-data-[state=active]:text-primary">
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Leases List */}
          <TabsContent value={activeTab} className="mt-0">
            {leases.length === 0 ? (
              <EmptyState
                icon={House}
                title={t('landlord.leases.emptyTitle')}
                description={t('landlord.leases.emptyDescription')}
                action={{ label: t('landlord.leases.emptyAction'), href: "/panel/contratos" }}
              />
            ) : (
              <section className="bg-surface rounded-lg border border-border overflow-hidden">
                {filteredLeases.length > 0 ? (
                  <div className="divide-y divide-border-faint">
                    {filteredLeases.map((lease) => (
                      <LeaseExpandableItem
                        key={lease.id}
                        lease={lease}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-surface-muted py-14 px-6 text-center">
                    <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center mx-auto mb-5">
                      <House className="w-6 h-6 text-fg-subtle" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">
                      {t('landlord.leases.noFilteredLeases', { filter: tabs.find(tItem => tItem.id === activeTab)?.label.toLowerCase() || '' })}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                      {t('landlord.leases.noFilteredDescription')}
                    </p>
                    <Button onClick={() => setTab('all')} hideArrow>
                      {t('landlord.leases.viewAllLeases')}
                    </Button>
                  </div>
                )}
              </section>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
