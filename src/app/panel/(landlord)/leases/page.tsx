'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { House, CurrencyDollar, Clock, WarningCircle, TrendUp, SpinnerGap } from '@phosphor-icons/react';
import { LeaseExpandableItem } from '@/components/lease/LeaseExpandableItem';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
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
// Stats Card Component
// ============================================================================

interface StatsCardProps {
  label: string;
  value: string | number;
  sublabel: string;
  icon: React.ElementType;
  iconBgClass: string;
  iconColorClass: string;
}

function StatsCard({ label, value, sublabel, icon: Icon, iconBgClass, iconColorClass }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
      <div className="flex items-start gap-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBgClass)}>
          <Icon className={cn('w-5 h-5', iconColorClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{value}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sublabel}</p>
        </div>
      </div>
    </div>
  );
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
    success: 'bg-[#2C7A53]',
    warning: 'bg-[#B7791F]',
    danger: 'bg-[#C4503B]',
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
  const { leases, stats, isLoading, error, refetch } = useLeases();
  const { t, formatCurrency } = useI18n();

  const [activeTab, setActiveTab] = useState('all');

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
      <div className="min-h-screen bg-neutral-50 dark:bg-[#1a1a1c] flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 text-[#1A40FF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#1a1a1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <ErrorState description={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {t('landlord.leases.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('landlord.leases.subtitle')}
          </p>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label={t('landlord.leases.activeLeases')}
            value={stats.activeLeases}
            sublabel={t('landlord.leases.activeLeasesSubLabel')}
            icon={House}
            iconBgClass="bg-neutral-100 dark:bg-neutral-800"
            iconColorClass="text-neutral-600 dark:text-neutral-300"
          />
          <StatsCard
            label={t('landlord.leases.monthlyIncome')}
            value={formatCurrency(stats.totalMonthlyIncome)}
            sublabel={t('landlord.leases.monthlyIncomeSubLabel')}
            icon={CurrencyDollar}
            iconBgClass="bg-[#E8F3EC] dark:bg-[#2C7A53]/15"
            iconColorClass="text-[#2C7A53] dark:text-[#3EAE70]"
          />
          <StatsCard
            label={t('landlord.leases.pendingPayments')}
            value={stats.pendingPayments}
            sublabel={t('landlord.leases.pendingPaymentsSubLabel')}
            icon={Clock}
            iconBgClass="bg-[#F8F0E0] dark:bg-[#B7791F]/15"
            iconColorClass="text-[#B7791F] dark:text-[#D2992F]"
          />
          <StatsCard
            label={t('landlord.leases.latePayments')}
            value={stats.latePayments}
            sublabel={stats.latePayments > 0 ? t('landlord.leases.latePaymentsSubLabel') : t('landlord.leases.latePaymentsAllGood')}
            icon={WarningCircle}
            iconBgClass={stats.latePayments > 0 ? 'bg-[#F8EAE7] dark:bg-[#C4503B]/15' : 'bg-neutral-100 dark:bg-neutral-800'}
            iconColorClass={stats.latePayments > 0 ? 'text-[#C4503B] dark:text-[#E0664D]' : 'text-neutral-600 dark:text-neutral-300'}
          />
        </div>

        {/* Financial Summary Card */}
        <div className="bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                  <TrendUp className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                </div>
                <span className="text-[#1A40FF] dark:text-[#5570FF] text-sm font-medium">{t('landlord.leases.financialSummary')}</span>
              </div>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {formatCurrency(stats.totalMonthlyIncome)}
              </p>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                {t('landlord.leases.expectedMonthlyIncome')}
              </p>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-600 dark:text-neutral-400 text-sm">{t('landlord.leases.collectionRate')}</span>
                <span className="text-neutral-900 dark:text-white font-semibold">{collectionRate}%</span>
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
          <div className="mb-6 p-4 bg-[#F8F0E0] dark:bg-[#B7791F]/15 border border-[#B7791F]/30 dark:border-[#B7791F]/40 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center">
                <WarningCircle className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#B7791F] dark:text-[#D2992F]">
                  {stats.endingSoon > 1
                    ? t('landlord.leases.endingSoonWarningPlural', { count: stats.endingSoon })
                    : t('landlord.leases.endingSoonWarning', { count: stats.endingSoon })}
                </p>
                <p className="text-xs text-[#B7791F]/70 dark:text-[#B7791F]/70">
                  {t('landlord.leases.endingSoonDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#222224] text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-sm text-xs font-medium tabular-nums',
                    activeTab === tab.id
                      ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Leases List */}
        {leases.length === 0 ? (
          <EmptyState
            icon={House}
            title={t('landlord.leases.emptyTitle')}
            description={t('landlord.leases.emptyDescription')}
            action={{ label: t('landlord.leases.emptyAction'), href: "/panel/contratos" }}
          />
        ) : (
          <section className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {filteredLeases.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {filteredLeases.map((lease) => (
                  <LeaseExpandableItem
                    key={lease.id}
                    lease={lease}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <House className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">
                  {t('landlord.leases.noFilteredLeases', { filter: tabs.find(tItem => tItem.id === activeTab)?.label.toLowerCase() || '' })}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                  {t('landlord.leases.noFilteredDescription')}
                </p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A40FF] hover:opacity-90 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {t('landlord.leases.viewAllLeases')}
                </button>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
