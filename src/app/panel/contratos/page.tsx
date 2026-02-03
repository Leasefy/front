'use client';

import Link from 'next/link';
import { FileText, Building2, Clock, CheckCircle, AlertCircle, Pen } from 'lucide-react';
import { ContractExpandableItem } from '@/components/contract/ContractExpandableItem';
import {
  getContractsForLandlord,
  getPendingContracts,
  getActiveContracts,
} from '@/lib/data/mock-contracts';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { useState, useMemo } from 'react';

/**
 * Contracts Management Page - PLan CRM Style
 */
export default function ContratosPage() {
  const landlordId = 'landlord-001';
  const allContracts = getContractsForLandlord(landlordId);
  const pendingContracts = getPendingContracts(landlordId);
  const activeContracts = getActiveContracts(landlordId);

  const needsAction = pendingContracts.filter((c) => c.status === 'pending_landlord');
  const awaitingTenant = pendingContracts.filter((c) => c.status === 'pending_tenant');

  const [activeTab, setActiveTab] = useState('all');

  // Filter contracts by tab
  const filteredContracts = useMemo(() => {
    if (activeTab === 'all') return allContracts;
    if (activeTab === 'needs_action') return needsAction;
    if (activeTab === 'awaiting') return awaitingTenant;
    if (activeTab === 'active') return activeContracts;
    return allContracts;
  }, [activeTab, allContracts, needsAction, awaitingTenant, activeContracts]);

  // Tabs configuration
  const tabs: PlanTab[] = [
    { id: 'all', label: 'Todos', count: allContracts.length },
    { id: 'needs_action', label: 'Requieren firma', count: needsAction.length },
    { id: 'awaiting', label: 'Esperando inquilino', count: awaitingTenant.length },
    { id: 'active', label: 'Activos', count: activeContracts.length },
  ];

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            Contratos
          </h1>
          <p className="mt-1 text-plan-secondary">
            Gestiona los contratos de tus propiedades
          </p>
        </header>

        {/* Stats Row */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Total contratos"
            value={allContracts.length}
            sublabel="En el sistema"
            icon={FileText}
          />
          <PlanStatsCard
            label="Por firmar"
            value={needsAction.length}
            sublabel="Requieren tu firma"
            icon={Pen}
            variant={needsAction.length > 0 ? 'accent' : 'default'}
          />
          <PlanStatsCard
            label="Esperando"
            value={awaitingTenant.length}
            sublabel="Firma del inquilino"
            icon={Clock}
          />
          <PlanStatsCard
            label="Activos"
            value={activeContracts.length}
            sublabel="Contratos vigentes"
            icon={CheckCircle}
          />
        </PlanStatsGrid>

        {/* Urgent Action Banner */}
        {needsAction.length > 0 && (
          <div className="mb-6 p-4 bg-plan-status-yellow-bg border border-plan-status-yellow/30 ">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-plan-status-yellow/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-800" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {needsAction.length} contrato{needsAction.length > 1 ? 's' : ''} requiere{needsAction.length > 1 ? 'n' : ''} tu firma
                </p>
                <p className="text-xs text-yellow-800/70">
                  Haz clic en un contrato para revisar y firmar
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <PlanTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-6"
        />

        {/* Contracts List */}
        <section className="bg-card  border border-plan-border overflow-hidden">
          {filteredContracts.length > 0 ? (
            <div className="divide-y divide-plan-border">
              {filteredContracts.map((contract) => (
                <ContractExpandableItem key={contract.id} contract={contract} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-plan-muted" />
              </div>
              <h3 className="font-medium text-plan-primary mb-2">
                {activeTab === 'all'
                  ? 'No tienes contratos'
                  : `No hay contratos ${tabs.find(t => t.id === activeTab)?.label.toLowerCase() || ''}`
                }
              </h3>
              <p className="text-sm text-plan-secondary mb-4">
                Los contratos apareceran aqui cuando apruebes candidatos
              </p>
              <Link
                href="/panel"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Ver mis propiedades
              </Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
