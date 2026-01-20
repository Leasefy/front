'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LeaseCard } from '@/components/lease/LeaseCard';
import { PaymentHistory } from '@/components/lease/PaymentHistory';
import { Button } from '@/components/ui/button';
import {
  getLeasesForLandlord,
  getPaymentsForLease,
  getLandlordStats,
} from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/format';
import {
  Home,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';

/**
 * Landlord Active Leases Page
 * Shows all active leases with payment tracking
 */
export default function LandlordLeasesPage() {
  // Mock landlord ID - in real app would come from auth
  const landlordId = 'user-landlord-1';
  const leases = getLeasesForLandlord(landlordId);
  const stats = getLandlordStats(landlordId);

  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(
    leases[0]?.id || null
  );

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);
  const payments = selectedLeaseId ? getPaymentsForLease(selectedLeaseId) : [];

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Mis Arriendos Activos
            </h1>
            <p className="text-slate-500 mt-1">
              Gestiona tus propiedades arrendadas y pagos
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">
                  {stats.activeLeases}
                </p>
                <p className="text-sm text-slate-500 truncate">
                  Arriendos activos
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-emerald-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 truncate">
                  {formatCurrency(stats.totalMonthlyIncome)}
                </p>
                <p className="text-sm text-slate-500 truncate">
                  Ingresos/mes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">
                  {stats.pendingPayments}
                </p>
                <p className="text-sm text-slate-500 truncate">
                  Pagos pendientes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-sm flex items-center justify-center shrink-0',
                  stats.latePayments > 0 ? 'bg-red-50' : 'bg-slate-50'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-5 h-5',
                    stats.latePayments > 0 ? 'text-red-600' : 'text-slate-400'
                  )}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-2xl font-bold',
                    stats.latePayments > 0 ? 'text-red-600' : 'text-slate-900'
                  )}
                >
                  {stats.latePayments}
                </p>
                <p className="text-sm text-slate-500 truncate">
                  Pagos atrasados
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ending soon alert */}
        {stats.endingSoon > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                {stats.endingSoon} contrato{stats.endingSoon > 1 ? 's' : ''}{' '}
                proximo{stats.endingSoon > 1 ? 's' : ''} a vencer
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Considera renovar o buscar nuevos arrendatarios
              </p>
            </div>
          </div>
        )}

        {/* Two-column layout on desktop */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Leases list */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Propiedades ({leases.length})
            </h2>

            {leases.length === 0 ? (
              <div className="bg-white rounded-sm border border-slate-100 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Home className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium mb-1">
                  No tienes arriendos activos
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  Cuando tengas contratos firmados apareceran aqui
                </p>
                <Link href="/panel">
                  <Button variant="outline">Ir al panel</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {leases.map((lease) => (
                  <LeaseCard
                    key={lease.id}
                    lease={lease}
                    view="landlord"
                    onSelect={() => setSelectedLeaseId(lease.id)}
                    isSelected={selectedLeaseId === lease.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Payment history for selected lease */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Historial de Pagos
            </h2>

            {selectedLease ? (
              <div className="bg-white rounded-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <p className="font-medium text-slate-900">
                    {selectedLease.propertyTitle}
                  </p>
                  <p className="text-sm text-slate-500">
                    Arrendatario: {selectedLease.tenantName}
                  </p>
                </div>
                <div className="p-4">
                  <PaymentHistory payments={payments} showConcept />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-sm border border-slate-100 p-8 text-center">
                <p className="text-slate-500">
                  Selecciona una propiedad para ver el historial de pagos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
