'use client';

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

/**
 * Landlord Active Leases Page - PLan CRM Style
 */
export default function LandlordLeasesPage() {
  const landlordId = 'landlord-001';
  const leases = getLeasesForLandlord(landlordId);
  const stats = getLandlordStats(landlordId);

  // Calculate collection rate
  const collectionRate = stats.totalMonthlyIncome > 0
    ? Math.round(((stats.totalMonthlyIncome - (stats.latePayments * (stats.totalMonthlyIncome / stats.activeLeases))) / stats.totalMonthlyIncome) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[#111827]">
            Arriendos Activos
          </h1>
          <p className="mt-1 text-[#6B7280]">
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
        <div className="bg-[#111827]  p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#D4F934]" />
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
          <div className="mb-6 p-4 bg-[#FEF3C7] border border-[#EAB308]/30 ">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-[#EAB308]/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#92400E]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#92400E]">
                  {stats.endingSoon} contrato{stats.endingSoon > 1 ? 's' : ''} proximo{stats.endingSoon > 1 ? 's' : ''} a vencer
                </p>
                <p className="text-xs text-[#92400E]/70">
                  Revisa los contratos que terminan pronto para renovar o buscar nuevos inquilinos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leases List */}
        <section className="bg-white  border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="font-semibold text-[#111827]">Propiedades Arrendadas</h2>
            <span className="text-sm text-[#6B7280]">
              {leases.length} propiedad{leases.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {leases.length > 0 ? (
            <div className="divide-y divide-[#E5E7EB]">
              {leases.map((lease) => (
                <LeaseExpandableItem
                  key={lease.id}
                  lease={lease}
                  payments={getPaymentsForLease(lease.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-[#9CA3AF]" />
              </div>
              <h3 className="font-medium text-[#111827] mb-2">
                No tienes arriendos activos
              </h3>
              <p className="text-sm text-[#6B7280] mb-4">
                Cuando tengas contratos firmados apareceran aqui
              </p>
              <Link
                href="/panel"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-sm text-sm font-medium hover:bg-[#1F2937] transition-colors"
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
