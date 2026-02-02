'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Building2, Users, Clock, AlertCircle, DollarSign, Home, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

import { LANDLORD_PROPERTIES } from '@/lib/data/mock-landlord-data';
import { getRecentActivities } from '@/lib/data/mock-activity';
import { getDashboardData, formatCurrency } from '@/lib/data/mock-dashboard';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import { PlanActivityCard, TimelineItem } from '@/components/ui/plan/PlanActivityTimeline';
import type { LandlordProperty } from '@/lib/types/landlord';

/**
 * Landlord Dashboard Page - PLan CRM Style
 */
export default function PanelPage() {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || 'Propietario';

  const properties = LANDLORD_PROPERTIES;
  const recentActivities = getRecentActivities(5);
  const dashboardData = getDashboardData();

  // Transform activities to timeline format
  const timelineItems: TimelineItem[] = recentActivities.map(activity => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    timestamp: activity.timestamp,
    user: { name: activity.title.split(' ')[0] || 'Usuario' },
  }));

  // Calculate risk distribution for properties
  const calculateRiskDistribution = (property: LandlordProperty) => {
    const candidates = property.candidates || [];
    return {
      levelA: candidates.filter(c => c.riskLevel === 'A').length,
      levelB: candidates.filter(c => c.riskLevel === 'B').length,
      levelC: candidates.filter(c => c.riskLevel === 'C').length,
      levelD: candidates.filter(c => c.riskLevel === 'D').length,
    };
  };

  const totalCandidates = properties.reduce((sum, p) => sum + (p.candidateCount || 0), 0);
  const pendingReviews = properties.reduce((sum, p) => sum + (p.pendingCount || 0), 0);

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-plan-secondary">
            Resumen de tu portafolio de propiedades
          </p>
        </header>

        {/* Stats Row */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Ingresos mensuales"
            value={formatCurrency(dashboardData.financial.monthlyIncome)}
            icon={DollarSign}
            variant="accent"
          />
          <PlanStatsCard
            label="Arriendos activos"
            value={dashboardData.financial.activeLeases}
            sublabel={`${properties.length} propiedades`}
            icon={Home}
          />
          <PlanStatsCard
            label="Total candidatos"
            value={totalCandidates}
            sublabel={`${pendingReviews} pendientes`}
            icon={Users}
          />
          <PlanStatsCard
            label="Tasa de cobranza"
            value={`${dashboardData.financial.collectionRate}%`}
            sublabel="Este mes"
            icon={TrendingUp}
          />
        </PlanStatsGrid>

        {/* Urgent Actions Banner */}
        {dashboardData.urgentActions.length > 0 && (
          <div className="mb-6 p-4 bg-plan-status-yellow-bg border border-plan-status-yellow/30 ">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-plan-status-yellow/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-800" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {dashboardData.urgentActions.length} accion{dashboardData.urgentActions.length > 1 ? 'es' : ''} pendiente{dashboardData.urgentActions.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-yellow-800/70">
                  {dashboardData.urgentActions[0]?.description}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Properties */}
          <div className="lg:col-span-2 space-y-6">

            {/* Properties Section */}
            <section className="bg-white  border border-plan-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Mis Propiedades</h2>
                <Link
                  href="/panel/propiedades"
                  className="text-sm text-plan-secondary hover:text-plan-primary transition-colors"
                >
                  {properties.length} propiedad{properties.length !== 1 ? 'es' : ''}
                </Link>
              </div>

              {properties.length > 0 ? (
                <div className="divide-y divide-plan-border">
                  {properties.slice(0, 5).map((property) => {
                    const riskDist = calculateRiskDistribution(property);
                    const totalRisk = riskDist.levelA + riskDist.levelB + riskDist.levelC + riskDist.levelD;
                    const goodCandidatePercent = totalRisk > 0
                      ? Math.round(((riskDist.levelA + riskDist.levelB) / totalRisk) * 100)
                      : 0;

                    return (
                      <Link key={property.id} href={`/panel/${property.id}`}>
                        <div className="group flex gap-4 p-5 hover:bg-gray-50 transition-colors">
                          {/* Image */}
                          <div className="relative w-24 h-24 rounded-sm overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image
                              src={property.thumbnailUrl}
                              alt={property.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-medium text-plan-primary group-hover:text-plan-secondary transition-colors">
                                  {property.title}
                                </h3>
                                <p className="text-sm text-plan-secondary mt-0.5">
                                  {property.neighborhood}, {property.city}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-plan-primary">
                                  {formatCurrency(property.monthlyRent)}
                                </p>
                                <p className="text-xs text-plan-muted">/mes</p>
                              </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-plan-secondary" />
                                <span className="text-sm text-plan-secondary">
                                  {property.candidateCount} candidato{property.candidateCount !== 1 ? 's' : ''}
                                </span>
                              </div>

                              {property.candidateCount > 0 && (
                                <>
                                  <div className="w-20">
                                    <PlanProgressBar
                                      value={goodCandidatePercent}
                                      size="sm"
                                      variant={goodCandidatePercent >= 50 ? 'success' : 'warning'}
                                    />
                                  </div>
                                  <span className="text-xs text-plan-muted">
                                    {goodCandidatePercent}% A-B
                                  </span>
                                </>
                              )}

                              {property.pendingCount > 0 && (
                                <PlanStatusBadge
                                  status="new"
                                  label={`${property.pendingCount} pendiente${property.pendingCount > 1 ? 's' : ''}`}
                                  size="sm"
                                />
                              )}

                              {property.pendingCount === 0 && property.candidateCount > 0 && (
                                <PlanStatusBadge
                                  status="completed"
                                  label="Revisado"
                                  size="sm"
                                />
                              )}
                            </div>
                          </div>

                          <ArrowUpRight className="w-5 h-5 text-plan-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {/* Show "Ver todas" when there are more than 5 properties */}
              {properties.length > 5 && (
                <Link
                  href="/panel/propiedades"
                  className="flex items-center justify-center gap-2 px-5 py-3 border-t border-plan-border text-sm font-medium text-plan-secondary hover:text-plan-primary hover:bg-gray-50 transition-colors"
                >
                  Ver todas las propiedades
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                    +{properties.length - 5} más
                  </span>
                </Link>
              )}

              {properties.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-plan-muted" />
                  </div>
                  <h3 className="font-medium text-plan-primary mb-2">
                    No tienes propiedades publicadas
                  </h3>
                  <p className="text-sm text-plan-secondary">
                    Publica tu primera propiedad para comenzar
                  </p>
                </div>
              )}
            </section>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Financial Summary */}
            <div className="bg-plan-primary  p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-plan-accent" />
                </div>
                <span className="text-sm text-white/60">Resumen financiero</span>
              </div>

              <p className="text-3xl font-bold tracking-tight mb-1">
                {formatCurrency(dashboardData.financial.monthlyIncome)}
              </p>
              <p className="text-white/60 text-sm mb-4">Ingresos mensuales</p>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Tasa cobranza</span>
                  <span className="text-white font-medium">{dashboardData.financial.collectionRate}%</span>
                </div>
                <PlanProgressBar
                  value={dashboardData.financial.collectionRate}
                  variant="success"
                  size="sm"
                />
                {dashboardData.financial.pendingPayments > 0 && (
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-white/60">Pagos pendientes</span>
                    <span className="text-yellow-100 font-medium">{dashboardData.financial.pendingPayments}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <PlanActivityCard
              title="Actividad Reciente"
              items={timelineItems}
              maxItems={5}
            />

            {/* Upcoming Events */}
            {dashboardData.upcomingEvents.length > 0 && (
              <div className="bg-white  border border-plan-border p-5">
                <h3 className="font-semibold text-plan-primary mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-plan-secondary" />
                  Proximos Eventos
                </h3>
                <div className="space-y-3">
                  {dashboardData.upcomingEvents.slice(0, 3).map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-sm hover:bg-gray-50 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-plan-accent" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-plan-primary truncate">{event.title}</p>
                        <p className="text-xs text-plan-muted">
                          {new Date(event.date).toLocaleDateString('es-CL', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
