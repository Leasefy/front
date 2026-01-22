'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { LeaseExpandableItem } from '@/components/lease/LeaseExpandableItem';
import {
  getLeasesForLandlord,
  getPaymentsForLease,
  getLandlordStats,
} from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/format';
import { Home } from 'lucide-react';

/**
 * Landlord Active Leases Page
 * Luxterra style - clean, minimal, spacious
 * Expandable rows for clear UX - click to see payment history inline
 */
export default function LandlordLeasesPage() {
  const landlordId = 'landlord-001';
  const leases = getLeasesForLandlord(landlordId);
  const stats = getLandlordStats(landlordId);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-[2rem] md:text-[2.5rem] font-light text-slate-900 tracking-[-0.02em]">
            Arriendos
          </h1>
          <p className="text-slate-400 mt-2 text-sm tracking-[-0.01em]">
            Gestiona tus propiedades arrendadas y seguimiento de pagos
          </p>
        </header>

        {/* Stats - Dark hero section */}
        <div className="bg-[#0f0f0f] rounded-[2px] p-8 md:p-10 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-[2rem] md:text-[2.5rem] font-light text-white tracking-[-0.02em]">
                {stats.activeLeases}
              </p>
              <p className="text-gray-500 text-xs mt-1">Arriendos activos</p>
            </div>
            <div>
              <p className="text-[2rem] md:text-[2.5rem] font-light text-white tracking-[-0.02em]">
                {formatCurrency(stats.totalMonthlyIncome)}
              </p>
              <p className="text-gray-500 text-xs mt-1">Ingresos mensuales</p>
            </div>
            <div>
              <p className="text-[2rem] md:text-[2.5rem] font-light text-white tracking-[-0.02em]">
                {stats.pendingPayments}
              </p>
              <p className="text-gray-500 text-xs mt-1">Pagos pendientes</p>
            </div>
            <div>
              <p className={cn(
                'text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em]',
                stats.latePayments > 0 ? 'text-red-400' : 'text-white'
              )}>
                {stats.latePayments}
              </p>
              <p className="text-gray-500 text-xs mt-1">Pagos atrasados</p>
            </div>
          </div>
        </div>

        {/* Ending soon notice */}
        {stats.endingSoon > 0 && (
          <p className="text-sm text-slate-500 mb-8 -mt-8">
            <span className="text-slate-900">{stats.endingSoon}</span> contrato{stats.endingSoon > 1 ? 's' : ''} proximo{stats.endingSoon > 1 ? 's' : ''} a vencer
          </p>
        )}

        {/* Properties Section */}
        <section>
          <div className="mb-6">
            <SectionLabel className="text-slate-400 mb-2">
              Propiedades arrendadas
            </SectionLabel>
            <h2 className="text-xl font-light text-slate-900 tracking-[-0.02em]">
              Mis Arriendos
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Haz clic en una propiedad para ver el historial de pagos
            </p>
          </div>

          {leases.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-[2px]">
              <Home className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-light text-slate-900 mb-2">
                No tienes arriendos activos
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Cuando tengas contratos firmados apareceran aqui
              </p>
              <Link href="/panel">
                <Button variant="outline" className="rounded-[2px]">
                  Ir al panel
                </Button>
              </Link>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-[2px]">
              {leases.map((lease) => (
                <LeaseExpandableItem
                  key={lease.id}
                  lease={lease}
                  payments={getPaymentsForLease(lease.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
