'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Home, CreditCard, ArrowUpRight } from 'lucide-react';

import { getActiveLeasesForTenant, getNextPayment } from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';

/**
 * Tenant Leases Page - PLan CRM Style
 */
export default function ArriendoPage() {
  const tenantId = 'user-tenant-1';
  const activeLeases = getActiveLeasesForTenant(tenantId);

  // Calculate totals
  const totalMonthlyRent = activeLeases.reduce(
    (sum, lease) => sum + lease.monthlyRent + lease.adminFee,
    0
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get days remaining for a lease
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Calculate lease progress (time elapsed)
  const getLeaseProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  };

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/inquilino" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            Mis Arriendos
          </h1>
          <p className="mt-1 text-plan-secondary">
            Gestiona tus contratos de arriendo activos
          </p>
        </header>

        {/* Stats Row */}
        <PlanStatsGrid columns={3} className="mb-8">
          <PlanStatsCard
            label="Arriendos activos"
            value={activeLeases.length}
            sublabel="Contratos vigentes"
            icon={Home}
          />
          <PlanStatsCard
            label="Total mensual"
            value={formatCurrency(totalMonthlyRent)}
            sublabel="Arriendo + administracion"
            icon={CreditCard}
            variant="accent"
          />
          <PlanStatsCard
            label="Estado general"
            value="Al dia"
            sublabel="Todos los pagos al dia"
            icon={Calendar}
          />
        </PlanStatsGrid>

        {/* Leases List */}
        <section className="bg-card  border border-plan-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
            <h2 className="font-semibold text-plan-primary">Arriendos Activos</h2>
            <span className="text-sm text-plan-secondary">
              {activeLeases.length} contrato{activeLeases.length !== 1 ? 's' : ''}
            </span>
          </div>

          {activeLeases.length > 0 ? (
            <div className="divide-y divide-plan-border">
              {activeLeases.map((lease) => {
                const nextPayment = getNextPayment(lease.id);
                const daysRemaining = getDaysRemaining(lease.endDate);
                const leaseProgress = getLeaseProgress(lease.startDate, lease.endDate);

                return (
                  <Link
                    key={lease.id}
                    href={`/inquilino/arriendo/${lease.id}`}
                    className="block group p-5 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Image */}
                      <div className="relative w-full lg:w-40 h-32 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                        <Image
                          src={lease.propertyThumbnail}
                          alt={lease.propertyTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-plan-primary text-lg">
                              {lease.propertyTitle}
                            </h3>
                            <p className="text-sm text-plan-secondary mt-0.5 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {lease.propertyAddress}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-2xl font-semibold text-plan-primary">
                              {formatCurrency(lease.monthlyRent + lease.adminFee)}
                            </p>
                            <p className="text-xs text-plan-muted">/mes</p>
                          </div>
                        </div>

                        {/* Contract Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-plan-border">
                          <div>
                            <p className="text-xs text-plan-muted mb-1">Arriendo</p>
                            <p className="text-sm font-medium text-plan-primary">
                              {formatCurrency(lease.monthlyRent)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-plan-muted mb-1">Administracion</p>
                            <p className="text-sm font-medium text-plan-primary">
                              {formatCurrency(lease.adminFee)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-plan-muted mb-1">Dia de pago</p>
                            <p className="text-sm font-medium text-plan-primary">
                              Dia {lease.paymentDueDay}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-plan-muted mb-1">Estado</p>
                            <PlanStatusBadge
                              status={lease.status === 'ending_soon' ? 'important' : 'in_progress'}
                              label={lease.status === 'ending_soon' ? 'Termina pronto' : 'Activo'}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Contract Progress */}
                        <div className="mt-4 pt-4 border-t border-plan-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-plan-secondary flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Inicio: {formatDate(lease.startDate)}
                            </span>
                            <span className="text-xs text-plan-secondary flex items-center gap-1">
                              Fin: {formatDate(lease.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <PlanProgressBar
                                value={leaseProgress}
                                size="sm"
                                variant={daysRemaining < 30 ? 'warning' : 'default'}
                              />
                            </div>
                            <span className="text-xs text-plan-secondary whitespace-nowrap">
                              {daysRemaining} dias restantes
                            </span>
                          </div>
                        </div>

                        {/* Next Payment */}
                        {nextPayment && (
                          <div className="flex items-center justify-between mt-4 p-3 bg-muted rounded-sm">
                            <div>
                              <p className="text-xs text-plan-secondary">Proximo pago</p>
                              <p className="text-sm font-medium text-plan-primary">
                                {formatCurrency(nextPayment.amount)} - {formatDate(nextPayment.dueDate)}
                              </p>
                            </div>
                            <span className="flex items-center gap-1 text-sm font-medium text-plan-primary group-hover:text-plan-secondary transition-colors">
                              Ver detalle
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-plan-muted" />
              </div>
              <h3 className="font-medium text-plan-primary mb-2">
                No tienes arriendos activos
              </h3>
              <p className="text-sm text-plan-secondary mb-4">
                Explora propiedades disponibles y encuentra tu proximo hogar
              </p>
              <Link
                href="/propiedades"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Explorar propiedades
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
