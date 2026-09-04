'use client';

import { FileText, Clock, CheckCircle, WarningCircle, Pen } from '@phosphor-icons/react';
import { PageHeader, KpiCard } from '@leasefy/cadence';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ContractExpandableItem } from '@/components/contract/ContractExpandableItem';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Spinner } from '@/components/ui';
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
// Main Component
// ============================================================================

export default function ContratosPage() {
  const { t } = useI18n();
  const { contracts: allContracts, isLoading, error, errorCrudo, refetch } = useContracts();

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

  const [activeTab, setTab] = useState('all');

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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" variant="muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <FalloDeCarga
            error={errorCrudo ?? error}
            queEs="tus contratos"
            onReintentar={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <PageHeader
            title={t('landlord.contracts.title')}
            subtitle={t('landlord.contracts.subtitle')}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label={t('landlord.contracts.totalContracts')}
            value={String(allContracts.length)}
            sublabel={t('landlord.contracts.inSystem')}
            icon={<FileText />}
          />
          <KpiCard
            label={t('landlord.contracts.toSign')}
            value={String(needsAction.length)}
            sublabel={t('landlord.contracts.requireYourSignature')}
            icon={<Pen />}
          />
          <KpiCard
            label={t('landlord.contracts.waiting')}
            value={String(awaitingTenant.length)}
            sublabel={t('landlord.contracts.tenantSignature')}
            icon={<Clock />}
          />
          <KpiCard
            label={t('landlord.contracts.active')}
            value={String(activeContracts.length)}
            sublabel={t('landlord.contracts.currentContracts')}
            icon={<CheckCircle />}
          />
        </div>

        {/* Urgent Action Banner */}
        {needsAction.length > 0 && (
          <div className="mb-6 p-4 bg-warning-soft border border-warning/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center">
                <WarningCircle className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">
                  {needsAction.length > 1
                    ? t('landlord.contracts.urgentBannerPlural', { count: needsAction.length })
                    : t('landlord.contracts.urgentBannerSingular', { count: needsAction.length })}
                </p>
                <p className="text-xs text-warning/70">
                  {t('landlord.contracts.urgentBannerHint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs (segmented filter over the contract list) */}
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

          {/* Contracts List */}
          <TabsContent value={activeTab} className="mt-0">
            <section className="bg-surface rounded-lg border border-border overflow-hidden">
              {filteredContracts.length > 0 ? (
                <div className="divide-y divide-border-faint">
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
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
