'use client';

import { FileText, Clock, CheckCircle, WarningCircle, Pen } from '@phosphor-icons/react';
import { ContractExpandableItem } from '@/components/contract/ContractExpandableItem';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getContractsForLandlord,
  getPendingContracts,
  getActiveContracts,
} from '@/lib/data/mock-contracts';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

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
    <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
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
  const landlordId = 'landlord-001';
  const allContracts = getContractsForLandlord(landlordId);
  const pendingContracts = getPendingContracts(landlordId);
  const activeContracts = getActiveContracts(landlordId);

  const needsAction = pendingContracts.filter((c) => c.status === 'pending_landlord');
  const awaitingTenant = pendingContracts.filter((c) => c.status === 'pending_tenant');

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
    { id: 'all', label: 'Todos', count: allContracts.length },
    { id: 'needs_action', label: 'Requieren firma', count: needsAction.length },
    { id: 'awaiting', label: 'Esperando inquilino', count: awaitingTenant.length },
    { id: 'active', label: 'Activos', count: activeContracts.length },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Contratos
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            Gestiona los contratos de tus propiedades
          </p>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Total contratos"
            value={allContracts.length}
            sublabel="En el sistema"
            icon={FileText}
            iconBgClass="bg-neutral-100 dark:bg-neutral-800"
            iconColorClass="text-neutral-600 dark:text-neutral-300"
          />
          <StatsCard
            label="Por firmar"
            value={needsAction.length}
            sublabel="Requieren tu firma"
            icon={Pen}
            iconBgClass={needsAction.length > 0 ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-neutral-100 dark:bg-neutral-800'}
            iconColorClass={needsAction.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-300'}
          />
          <StatsCard
            label="Esperando"
            value={awaitingTenant.length}
            sublabel="Firma del inquilino"
            icon={Clock}
            iconBgClass="bg-amber-100 dark:bg-amber-900/30"
            iconColorClass="text-amber-600 dark:text-amber-400"
          />
          <StatsCard
            label="Activos"
            value={activeContracts.length}
            sublabel="Contratos vigentes"
            icon={CheckCircle}
            iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
            iconColorClass="text-emerald-600 dark:text-emerald-400"
          />
        </div>

        {/* Urgent Action Banner */}
        {needsAction.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <WarningCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {needsAction.length} contrato{needsAction.length > 1 ? 's' : ''} requiere{needsAction.length > 1 ? 'n' : ''} tu firma
                </p>
                <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
                  Haz clic en un contrato para revisar y firmar
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
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#222224] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-md text-xs font-medium tabular-nums',
                    activeTab === tab.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
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
        <section className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
                title="No hay contratos"
                description="Cuando apruebes candidatos y generes contratos, aparecerán aquí."
                action={{ label: "Ver candidatos", href: "/panel/candidatos" }}
              />
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
