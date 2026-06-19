'use client';

import { FileText, Clock, CheckCircle, WarningCircle, Pen, SpinnerGap } from '@phosphor-icons/react';
import { ContractExpandableItem } from '@/components/contract/ContractExpandableItem';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useContracts } from '@/lib/hooks/useContracts';
import { useState, useMemo } from 'react';
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
  value: number;
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
// Main Component
// ============================================================================

export default function ContratosPage() {
  const { t } = useI18n();
  const { contracts: allContracts, isLoading, error, refetch } = useContracts();

  const pendingContracts = useMemo(() =>
    allContracts.filter(c => c.status === 'pending_landlord' || c.status === 'pending_tenant' || c.status === 'draft'),
    [allContracts]
  );
  const activeContracts = useMemo(() =>
    allContracts.filter(c => c.status === 'active'),
    [allContracts]
  );

  const needsAction = useMemo(() =>
    pendingContracts.filter((c) => c.status === 'pending_landlord'),
    [pendingContracts]
  );
  const awaitingTenant = useMemo(() =>
    pendingContracts.filter((c) => c.status === 'pending_tenant'),
    [pendingContracts]
  );

  const [activeTab, setActiveTab] = useState('all');

  // Funnel contracts by tab
  const filteredContracts = useMemo(() => {
    if (activeTab === 'all') return allContracts;
    if (activeTab === 'needs_action') return needsAction;
    if (activeTab === 'awaiting') return awaitingTenant;
    if (activeTab === 'active') return activeContracts;
    return allContracts;
  }, [activeTab, allContracts, needsAction, awaitingTenant, activeContracts]);

  // Tabs configuration
  const tabs: TabConfig[] = [
    { id: 'all', label: t('landlord.contracts.tabAll'), count: allContracts.length },
    { id: 'needs_action', label: t('landlord.contracts.tabNeedsAction'), count: needsAction.length },
    { id: 'awaiting', label: t('landlord.contracts.tabAwaiting'), count: awaitingTenant.length },
    { id: 'active', label: t('landlord.contracts.tabActive'), count: activeContracts.length },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#1a1a1c] flex items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#1a1a1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <ErrorState
            title="Error cargando contratos"
            description={error}
            onRetry={refetch}
          />
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
            {t('landlord.contracts.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('landlord.contracts.subtitle')}
          </p>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label={t('landlord.contracts.totalContracts')}
            value={allContracts.length}
            sublabel={t('landlord.contracts.inSystem')}
            icon={FileText}
            iconBgClass="bg-neutral-100 dark:bg-neutral-800"
            iconColorClass="text-neutral-600 dark:text-neutral-300"
          />
          <StatsCard
            label={t('landlord.contracts.toSign')}
            value={needsAction.length}
            sublabel={t('landlord.contracts.requireYourSignature')}
            icon={Pen}
            iconBgClass={needsAction.length > 0 ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15' : 'bg-neutral-100 dark:bg-neutral-800'}
            iconColorClass={needsAction.length > 0 ? 'text-[#1A40FF] dark:text-[#5570FF]' : 'text-neutral-600 dark:text-neutral-300'}
          />
          <StatsCard
            label={t('landlord.contracts.waiting')}
            value={awaitingTenant.length}
            sublabel={t('landlord.contracts.tenantSignature')}
            icon={Clock}
            iconBgClass="bg-[#F8F0E0] dark:bg-[#B7791F]/15"
            iconColorClass="text-[#B7791F] dark:text-[#D2992F]"
          />
          <StatsCard
            label={t('landlord.contracts.active')}
            value={activeContracts.length}
            sublabel={t('landlord.contracts.currentContracts')}
            icon={CheckCircle}
            iconBgClass="bg-[#E8F3EC] dark:bg-[#2C7A53]/15"
            iconColorClass="text-[#2C7A53] dark:text-[#3EAE70]"
          />
        </div>

        {/* Urgent Action Banner */}
        {needsAction.length > 0 && (
          <div className="mb-6 p-4 bg-[#F8F0E0] dark:bg-[#B7791F]/15 border border-[#B7791F]/30 dark:border-[#B7791F]/40 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center">
                <WarningCircle className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#B7791F] dark:text-[#D2992F]">
                  {needsAction.length > 1
                    ? t('landlord.contracts.urgentBannerPlural', { count: needsAction.length })
                    : t('landlord.contracts.urgentBannerSingular', { count: needsAction.length })}
                </p>
                <p className="text-xs text-[#B7791F]/70 dark:text-[#B7791F]/70">
                  {t('landlord.contracts.urgentBannerHint')}
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

        {/* Contracts List */}
        <section className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {filteredContracts.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {filteredContracts.map((contract) => (
                <ContractExpandableItem key={contract.id} contract={contract} />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title={t('landlord.contracts.emptyTitle')}
                description={t('landlord.contracts.emptyDescription')}
                action={{ label: t('landlord.contracts.emptyAction'), href: "/panel/candidatos" }}
              />
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
