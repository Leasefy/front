'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Home, DollarSign, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { LeaseExpandableItem } from '@/components/lease/LeaseExpandableItem';
import {
  getLeasesForLandlord,
  getPaymentsForLease,
  getLandlordStats,
} from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';

/**
 * Landlord Active Leases Page - PLan CRM Style
 */
export default function LandlordLeasesPage() {
  const landlordId = 'landlord-001';
  const leases = getLeasesForLandlord(landlordId);
  const stats = getLandlordStats(landlordId);

  const [activeTab, setActiveTab] = useState('all');

  // Pre-compute per-lease payment status for filtering
  const leasePaymentStatus = useMemo(() => {
    const map: Record<string, { pending: number; late: number }> = {};
    for (const lease of leases) {
      const payments = getPaymentsForLease(lease.id);
      map[lease.id] = {
        pending: payments.filter(p => p.status === 'pending').length,
        late: payments.filter(p => p.status === 'late').length,
      };
    }
    return map;
  }, [leases]);

  // Filter by tab
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

  const tabs: PlanTab[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'active', label: 'Activos', count: counts.active },
    { id: 'ending_soon', label: 'Vencen pronto', count: counts.endingSoon },
    { id: 'pending', label: 'Pagos pendientes', count: counts.pending },
    { id: 'late', label: 'Pagos atrasados', count: counts.late },
  ];

  // Calculate collection rate
  const collectionRate = stats.totalMonthlyIncome > 0
    ? Math.round(((stats.totalMonthlyIncome - (stats.latePayments * (stats.totalMonthlyIncome / stats.activeLeases))) / stats.totalMonthlyIncome) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            Arriendos Activos
          </h1>
          <p className="mt-1 text-plan-secondary">
            Gestiona tus propiedades arrendadas y seguimiento de pagos
          </p>
        </header>

        {/* Stats Row */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Arriendos activos"
            value={stats.activeLeases}
            sublabel="Propiedades arrendadas"
            icon={Home}
          />
          <PlanStatsCard
            label="Ingresos mensuales"
            value={formatCurrency(stats.totalMonthlyIncome)}
            sublabel="Total esperado"
            icon={DollarSign}
            variant="accent"
          />
          <PlanStatsCard
            label="Pagos pendientes"
            value={stats.pendingPayments}
            sublabel="Por recibir"
            icon={Clock}
          />
          <PlanStatsCard
            label="Pagos atrasados"
            value={stats.latePayments}
            sublabel={stats.latePayments > 0 ? 'Requieren atencion' : 'Todo al dia'}
            icon={AlertCircle}
          />
        </PlanStatsGrid>

        {/* Financial Summary Card */}
        <div className="bg-indigo-950  p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-plan-accent" />
                </div>
                <span className="text-white/60 text-sm">Resumen financiero</span>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {formatCurrency(stats.totalMonthlyIncome)}
              </p>
              <p className="text-white/60 text-sm mt-1">
                Ingresos mensuales esperados
              </p>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Tasa de cobranza</span>
                <span className="text-white font-medium">{collectionRate}%</span>
              </div>
              <PlanProgressBar
                value={collectionRate}
                variant={collectionRate >= 90 ? 'success' : collectionRate >= 70 ? 'warning' : 'danger'}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Ending Soon Warning */}
        {stats.endingSoon > 0 && (
          <div className="mb-6 p-4 bg-plan-status-yellow-bg border border-plan-status-yellow/30 ">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-plan-status-yellow/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-800" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {stats.endingSoon} contrato{stats.endingSoon > 1 ? 's' : ''} proximo{stats.endingSoon > 1 ? 's' : ''} a vencer
                </p>
                <p className="text-xs text-yellow-800/70">
                  Revisa los contratos que terminan pronto para renovar o buscar nuevos inquilinos
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

        {/* Leases List */}
        <section className="bg-card  border border-plan-border overflow-hidden">
          {filteredLeases.length > 0 ? (
            <div className="divide-y divide-plan-border">
              {filteredLeases.map((lease) => (
                <LeaseExpandableItem
                  key={lease.id}
                  lease={lease}
                  payments={getPaymentsForLease(lease.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-plan-muted" />
              </div>
              <h3 className="font-medium text-plan-primary mb-2">
                {activeTab === 'all'
                  ? 'No tienes arriendos activos'
                  : `No hay arriendos ${tabs.find(t => t.id === activeTab)?.label.toLowerCase() || ''}`
                }
              </h3>
              <p className="text-sm text-plan-secondary mb-4">
                Cuando tengas contratos firmados apareceran aqui
              </p>
              <Link
                href="/panel"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Ir al panel
              </Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
