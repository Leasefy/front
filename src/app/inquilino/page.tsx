'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Calendar, MapPin, CreditCard, FileText, Home } from 'lucide-react';

import { getActiveLeasesForTenant, getNextPayment } from '@/lib/data/mock-leases';
import { getActiveApplications } from '@/lib/data/mock-tenant-applications';
import { mockProperties } from '@/lib/data/mock-properties';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatusBadge, getApplicationStatus } from '@/components/ui/plan/PlanStatusBadge';

/**
 * Tenant Dashboard - PLan CRM Style
 */
export default function InquilinoPage() {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || 'Usuario';

  const tenantId = 'user-tenant-1';
  const activeLeases = getActiveLeasesForTenant(tenantId);
  const activeApplications = getActiveApplications();
  const primaryLease = activeLeases[0];
  const nextPayment = primaryLease ? getNextPayment(primaryLease.id) : undefined;

  // Calculate days until next payment
  const getDaysUntilPayment = () => {
    if (!nextPayment) return null;
    const dueDate = new Date(nextPayment.dueDate);
    const today = new Date();
    return Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const daysUntil = getDaysUntilPayment();

  // Calculate payment progress (days passed in month)
  const getPaymentProgress = () => {
    if (!nextPayment) return 0;
    const dueDate = new Date(nextPayment.dueDate);
    const today = new Date();
    const startOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    const totalDays = dueDate.getDate() - startOfMonth.getDate();
    const daysElapsed = Math.min(today.getDate() - 1, totalDays);
    return Math.round((daysElapsed / totalDays) * 100);
  };

  const getPropertyForApplication = (propertyId: string) => {
    return mockProperties.find(p => p.id === propertyId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-plan-secondary">
            Resumen de tu arriendo y actividad reciente
          </p>
        </header>

        {/* Stats Row */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Proximo pago"
            value={formatCurrency(nextPayment?.amount || (primaryLease ? primaryLease.monthlyRent + primaryLease.adminFee : 0))}
            sublabel={daysUntil !== null ? `Vence en ${daysUntil} dias` : 'Sin pagos pendientes'}
            icon={CreditCard}
          />
          <PlanStatsCard
            label="Arriendos activos"
            value={activeLeases.length}
            sublabel={activeLeases.length > 0 ? 'Contratos vigentes' : 'Sin arriendos'}
            icon={Home}
          />
          <PlanStatsCard
            label="Aplicaciones"
            value={activeApplications.length}
            sublabel="En proceso"
            icon={FileText}
          />
          <PlanStatsCard
            label="Progreso del mes"
            value={`${getPaymentProgress()}%`}
            sublabel="Hacia proximo pago"
            variant="accent"
          />
        </PlanStatsGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Leases */}
            <section className="bg-white border border-plan-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-plan-primary">Mis arriendos</h2>
                {activeLeases.length > 0 && (
                  <Link
                    href="/inquilino/arriendo"
                    className="text-sm text-plan-secondary hover:text-plan-primary transition-colors flex items-center gap-1"
                  >
                    Ver todos
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {activeLeases.length > 0 ? (
                <div className="divide-y divide-plan-border">
                  {activeLeases.slice(0, 2).map((lease) => (
                    <Link key={lease.id} href={`/inquilino/arriendo/${lease.id}`}>
                      <div className="group flex gap-4 p-5 hover:bg-gray-50 transition-colors">
                        {/* Image */}
                        <div className="relative w-20 h-20 overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={lease.propertyThumbnail}
                            alt={lease.propertyTitle}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-medium text-plan-primary group-hover:text-plan-secondary transition-colors">
                                {lease.propertyTitle}
                              </h3>
                              <p className="text-sm text-plan-secondary mt-0.5 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {lease.propertyAddress}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-plan-primary">
                                {formatCurrency(lease.monthlyRent + lease.adminFee)}
                              </p>
                              <p className="text-xs text-plan-muted">/mes</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-plan-secondary flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Vence {formatDate(lease.endDate)}
                            </span>
                            <PlanStatusBadge
                              status={lease.status === 'ending_soon' ? 'important' : 'in_progress'}
                              label={lease.status === 'ending_soon' ? 'Termina pronto' : 'Activo'}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Home className="w-6 h-6 text-plan-muted" />
                  </div>
                  <p className="text-plan-secondary mb-2">No tienes arriendos activos</p>
                  <Link href="/propiedades" className="text-sm text-plan-primary font-medium hover:underline">
                    Explorar propiedades
                  </Link>
                </div>
              )}
            </section>

            {/* Applications */}
            <section className="bg-white border border-plan-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-plan-primary">Aplicaciones en proceso</h2>
                <Link
                  href="/inquilino/aplicaciones"
                  className="text-sm text-plan-secondary hover:text-plan-primary transition-colors flex items-center gap-1"
                >
                  Ver todas
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {activeApplications.length > 0 ? (
                <div className="divide-y divide-plan-border">
                  {activeApplications.slice(0, 4).map((application) => {
                    const property = getPropertyForApplication(application.propertyId);
                    const statusLabels: Record<string, string> = {
                      submitted: 'Enviada',
                      under_review: 'En revision',
                      pre_approved: 'Pre-aprobada',
                    };

                    // Calculate progress based on status
                    const progressMap: Record<string, number> = {
                      submitted: 25,
                      under_review: 50,
                      pre_approved: 75,
                    };

                    return (
                      <Link key={application.id} href={`/inquilino/aplicaciones/${application.id}`}>
                        <div className="group flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-plan-secondary" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium text-plan-primary truncate">
                                {property?.title || 'Propiedad'}
                              </h3>
                              <p className="text-xs text-plan-muted mt-0.5">
                                {application.trackingCode}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 hidden sm:block">
                              <PlanProgressBar
                                value={progressMap[application.status] || 25}
                                size="sm"
                              />
                            </div>
                            <PlanStatusBadge
                              status={getApplicationStatus(application.status)}
                              label={statusLabels[application.status]}
                              size="sm"
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-plan-secondary">Sin aplicaciones activas</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Next Payment Card */}
            {nextPayment && primaryLease && (
              <div className="bg-plan-primary p-5 text-white">
                <p className="text-white/60 text-sm mb-1">Proximo pago</p>
                <p className="text-3xl font-bold tracking-tight">
                  {formatCurrency(nextPayment.amount)}
                </p>
                <p className="text-white/60 text-sm mt-1 mb-4">
                  {primaryLease.propertyTitle}
                </p>
                <PlanProgressBar
                  value={getPaymentProgress()}
                  variant="default"
                  size="md"
                />
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-white/60">
                    {daysUntil === 0 ? 'Vence hoy' : `Vence en ${daysUntil} dias`}
                  </span>
                  <Link
                    href="/inquilino/pagos"
                    className="font-medium text-plan-accent hover:underline"
                  >
                    Pagar ahora
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white border border-plan-border overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-plan-primary">Acciones rapidas</h2>
              </div>
              <div className="p-3">
                {primaryLease && (
                  <Link href="/inquilino/pagos">
                    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 bg-plan-status-green-bg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-plan-status-green" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-plan-primary">Pagar arriendo</p>
                        <p className="text-[11px] text-plan-secondary">Realiza tu pago mensual</p>
                      </div>
                    </div>
                  </Link>
                )}
                <Link href="/inquilino/documentos">
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-plan-status-purple-bg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-plan-status-purple" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-plan-primary">Mis documentos</p>
                      <p className="text-[11px] text-plan-secondary">Contratos y recibos</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
