'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Building2, Users, Clock, AlertCircle, DollarSign, Home, TrendingUp, Calendar, ArrowUpRight, ChevronDown, FileSignature, CreditCard, UserCheck, CalendarClock, CalendarDays, MapPin, Phone, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { LANDLORD_PROPERTIES } from '@/lib/data/mock-landlord-data';
import { getRecentActivities } from '@/lib/data/mock-activity';
import { getDashboardData, formatCurrency } from '@/lib/data/mock-dashboard';
import { getUpcomingVisits } from '@/lib/data/mock-visits';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit } from '@/lib/types/visit';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import { PlanActivityCard, TimelineItem } from '@/components/ui/plan/PlanActivityTimeline';
import { PlanDetailSheet, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import type { LandlordProperty } from '@/lib/types/landlord';
import type { UrgentAction, UpcomingEvent } from '@/lib/data/mock-dashboard';

const ACTION_ICONS: Record<UrgentAction['type'], React.ElementType> = {
  signature: FileSignature,
  late_payment: CreditCard,
  pending_review: UserCheck,
  ending_lease: CalendarClock,
  pending_visit: CalendarDays,
};

const PRIORITY_STYLES: Record<UrgentAction['priority'], string> = {
  high: 'bg-plan-status-red-bg border-plan-status-red/20 text-plan-status-red',
  medium: 'bg-plan-status-yellow-bg border-plan-status-yellow/20 text-plan-status-yellow',
  low: 'bg-plan-status-blue-bg border-plan-status-blue/20 text-plan-status-blue',
};

function UrgentActionsBanner({ actions }: { actions: UrgentAction[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6 bg-plan-status-yellow-bg border border-plan-status-yellow/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-yellow-50/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-sm bg-plan-status-yellow/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-yellow-800" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-yellow-800">
            {actions.length} accion{actions.length > 1 ? 'es' : ''} pendiente{actions.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-yellow-800/70">
            {actions[0]?.description}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-yellow-800/60 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.type] || AlertCircle;
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-colors hover:opacity-80 ${PRIORITY_STYLES[action.priority]}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs opacity-70">{action.description}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5">
                  {action.count}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const upcomingVisits = getUpcomingVisits();

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
          <UrgentActionsBanner actions={dashboardData.urgentActions} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Properties */}
          <div className="lg:col-span-2 space-y-6">

            {/* Properties Section */}
            <section className="bg-card  border border-plan-border overflow-hidden">
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
                        <div className="group flex gap-4 p-5 hover:bg-muted transition-colors">
                          {/* Image */}
                          <div className="relative w-24 h-24 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
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
                  className="flex items-center justify-center gap-2 px-5 py-3 border-t border-plan-border text-sm font-medium text-plan-secondary hover:text-plan-primary hover:bg-muted transition-colors"
                >
                  Ver todas las propiedades
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    +{properties.length - 5} más
                  </span>
                </Link>
              )}

              {properties.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
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
            <div className="bg-indigo-950  p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-indigo-400" />
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

            {/* Upcoming Visits */}
            {upcomingVisits.length > 0 && (
              <UpcomingVisitsCard visits={upcomingVisits} />
            )}

            {/* Upcoming Events */}
            {dashboardData.upcomingEvents.length > 0 && (
              <UpcomingEventsCard events={dashboardData.upcomingEvents} />
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// Upcoming Visits Card — hover arrow, click opens sidebar
// ============================================================================

const VISIT_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-plan-status-green',
  requested: 'bg-plan-status-blue',
  completed: 'bg-plan-muted',
  cancelled: 'bg-plan-status-red',
  no_show: 'bg-plan-status-yellow',
};

function UpcomingVisitsCard({ visits }: { visits: Visit[] }) {
  const [selected, setSelected] = useState<Visit | null>(null);

  const sections: DetailSection[] = selected ? [
    {
      id: 'visit-property',
      title: 'Propiedad',
      content: (
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-plan-muted mt-0.5" />
          <p className="text-sm text-plan-primary">{selected.propertyTitle}</p>
        </div>
      ),
    },
    {
      id: 'visit-datetime',
      title: 'Fecha y hora',
      content: (
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-plan-muted mt-0.5" />
          <p className="text-sm text-plan-primary">
            {new Date(selected.requestedDate + 'T12:00:00').toLocaleDateString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })} a las {selected.requestedTime}
          </p>
        </div>
      ),
    },
    ...(selected.candidateMessage ? [{
      id: 'visit-message',
      title: 'Mensaje del candidato',
      content: (
        <div className="flex items-start gap-3">
          <MessageSquare className="w-4 h-4 text-plan-muted mt-0.5" />
          <p className="text-sm text-plan-primary">{selected.candidateMessage}</p>
        </div>
      ),
    }] : []),
    ...(selected.landlordNotes ? [{
      id: 'visit-notes',
      title: 'Tus notas',
      content: (
        <div className="flex items-start gap-3">
          <MessageSquare className="w-4 h-4 text-plan-muted mt-0.5" />
          <p className="text-sm text-plan-primary">{selected.landlordNotes}</p>
        </div>
      ),
    }] : []),
  ] : [];

  return (
    <>
      <div className="bg-card border border-plan-border p-5">
        <h3 className="font-semibold text-plan-primary mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-plan-secondary" />
          Próximas Visitas
        </h3>
        <div className="space-y-1">
          {visits.slice(0, 3).map((visit) => (
            <button
              key={visit.id}
              onClick={() => setSelected(visit)}
              className="group w-full flex items-center gap-3 p-2 rounded-sm text-left hover:bg-muted transition-colors"
            >
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', VISIT_STATUS_COLORS[visit.status] || 'bg-indigo-500')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-plan-primary truncate">{visit.candidateName}</p>
                <p className="text-xs text-plan-muted">
                  {new Date(visit.requestedDate + 'T12:00:00').toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                  })} · {visit.requestedTime} · {VISIT_STATUS_LABELS[visit.status]}
                </p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-plan-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))}
        </div>
        {visits.length > 3 && (
          <Link
            href="/panel/visitas"
            className="block mt-3 text-center text-xs text-plan-secondary hover:text-plan-primary transition-colors"
          >
            Ver todas las visitas →
          </Link>
        )}
      </div>

      <PlanDetailSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        profile={selected ? {
          name: selected.candidateName,
          subtitle: VISIT_STATUS_LABELS[selected.status],
          status: selected.status === 'confirmed' ? 'accepted' : selected.status === 'requested' ? 'new' : 'pending',
          statusLabel: VISIT_STATUS_LABELS[selected.status],
        } : undefined}
        sections={sections}
        footerActions={selected ? (
          <div className="flex gap-2">
            <Link
              href={`/panel/${selected.propertyId}`}
              className="flex-1 text-center text-sm font-medium px-4 py-2 bg-card border border-plan-border text-plan-primary rounded-sm hover:bg-plan-page transition-colors"
            >
              Ver propiedad
            </Link>
            <Link
              href="/panel/visitas"
              className="flex-1 text-center text-sm font-medium px-4 py-2 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors"
            >
              Gestionar visita
            </Link>
          </div>
        ) : undefined}
        width="sm"
      />
    </>
  );
}

// ============================================================================
// Upcoming Events Card — hover arrow, click opens sidebar
// ============================================================================

function UpcomingEventsCard({ events }: { events: UpcomingEvent[] }) {
  const [selected, setSelected] = useState<UpcomingEvent | null>(null);

  const EVENT_DOT_COLOR: Record<string, string> = {
    payment_due: 'bg-indigo-500',
    lease_ending: 'bg-amber-500',
    contract_renewal: 'bg-emerald-500',
    inspection: 'bg-purple-500',
  };

  const isOverdue = selected ? selected.daysUntil < 0 : false;

  const urgencyLabel = selected
    ? isOverdue
      ? `Vencido hace ${Math.abs(selected.daysUntil)} día${Math.abs(selected.daysUntil) !== 1 ? 's' : ''}`
      : selected.daysUntil === 0
        ? 'Hoy'
        : selected.daysUntil === 1
          ? 'Mañana'
          : `En ${selected.daysUntil} días`
    : '';

  const sections: DetailSection[] = selected ? [
    {
      id: 'event-urgency',
      title: 'Urgencia',
      content: (
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-sm',
          isOverdue
            ? 'bg-red-100 text-red-700'
            : selected.daysUntil <= 3
              ? 'bg-amber-100 text-amber-700'
              : 'bg-indigo-100 text-indigo-700'
        )}>
          {urgencyLabel}
        </span>
      ),
    },
    ...(selected.description ? [{
      id: 'event-property',
      title: 'Propiedad',
      content: (
        <div className="flex items-start gap-3">
          <Building2 className="w-4 h-4 text-plan-muted mt-0.5" />
          <p className="text-sm text-plan-primary">{selected.description}</p>
        </div>
      ),
    }] : []),
    {
      id: 'event-date',
      title: 'Fecha',
      content: (
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-plan-muted mt-0.5" />
          <p className="text-sm text-plan-primary">
            {new Date(selected.date + 'T12:00:00').toLocaleDateString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      ),
    },
  ] : [];

  const actionLabel = selected?.type === 'payment_due'
    ? 'Ver arriendos'
    : selected?.type === 'lease_ending'
      ? 'Ver contrato'
      : 'Ver detalle';

  return (
    <>
      <div className="bg-card border border-plan-border p-5">
        <h3 className="font-semibold text-plan-primary mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-plan-secondary" />
          Proximos Eventos
        </h3>
        <div className="space-y-1">
          {events.slice(0, 5).map((event) => {
            const dotColor = event.daysUntil < 0 ? 'bg-red-500' : (EVENT_DOT_COLOR[event.type] || 'bg-indigo-500');
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="group w-full flex items-center gap-3 p-2 rounded-sm text-left hover:bg-muted transition-colors"
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-plan-primary truncate">{event.title}</p>
                  <p className="text-xs text-plan-muted">
                    {new Date(event.date + 'T12:00:00').toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-plan-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <PlanDetailSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        profile={selected ? {
          name: selected.title,
          subtitle: selected.description || '',
          status: isOverdue ? 'important' : selected?.daysUntil <= 3 ? 'pending' : 'in_progress',
          statusLabel: urgencyLabel,
        } : undefined}
        sections={sections}
        footerActions={selected?.href ? (
          <Link
            href={selected.href}
            className="block w-full text-center text-sm font-medium px-4 py-2 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors"
          >
            {actionLabel}
          </Link>
        ) : undefined}
        width="sm"
      />
    </>
  );
}
