'use client';

import Link from 'next/link';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import {
  Buildings,
  Users,
  CurrencyDollar,
  TrendUp,
  TrendDown,
  ArrowRight,
  ChartLine,
  Kanban,
  UserCircle,
  Clock,
  Warning,
  CheckCircle,
  CaretRight,
  House,
  Wallet,
  FileText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { EmptyState, Spinner } from '@/components/ui';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { MonoLabel, BrandDot, BrandContour } from '@/components/brand';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  useInmobiliariaDashboard,
  useAgentes,
  usePipelineItems,
  useCobros,
  useMantenimientos,
} from '@/lib/hooks/useInmobiliaria';
import { formatCurrency, getPipelineStageInfo } from '@/lib/types/inmobiliaria';
import type { PipelineItem, Agente } from '@/lib/types/inmobiliaria';

/**
 * KPI Card Component
 */
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ElementType;
  href?: string;
  /** Ink hero variant — the single visual anchor of the grid. */
  brandHero?: boolean;
}

function KPICard({ title, value, subtitle, trend, icon: Icon, href, brandHero }: KPICardProps) {
  const { t } = useI18n();

  if (brandHero) {
    return (
      <Link
        href={href ?? '#'}
        className="group relative h-full rounded-lg p-5 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #14130f 58%, #2a2824 135%)', boxShadow: '0 10px 30px -6px rgba(26,64,255,0.30)' }}
      >
        {/* Brand contour — single hairline tracing the roof profile (badge grammar) */}
        <div className="absolute -inset-x-1 top-[34%] h-[44%] text-white/[0.14] pointer-events-none">
          <BrandContour />
        </div>
        <div className="flex items-start justify-between">
          <MonoLabel className="text-[11px] font-medium text-white/55">{title}</MonoLabel>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
            <Icon weight="duotone" className="h-4 w-4 text-white/90" />
          </div>
        </div>
        <p className="font-heading text-[28px] font-semibold text-white tracking-tight tabular-nums leading-none mt-3">
          {value}
        </p>
        {subtitle && <p className="font-sans text-[12px] text-white/70 mt-1">{subtitle}</p>}
        <div className="flex-1 min-h-[8px]" />
        {trend && (
          <div className="mt-2.5 flex items-center gap-1">
            {trend.isPositive ? (
              <TrendUp weight="bold" className="h-3 w-3 text-white/80" />
            ) : (
              <TrendDown weight="bold" className="h-3 w-3 text-white/80" />
            )}
            <span className="font-sans text-[11.5px] font-medium tabular-nums text-white/90">
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="font-sans text-[11.5px] text-white/60">{t('inmobiliaria.common.vsLastMonth')}</span>
          </div>
        )}
      </Link>
    );
  }

  const content = (
    <div
      className={cn(
        'group relative h-full rounded-lg border border-border bg-card p-5 flex flex-col transition-colors',
        href && 'hover:bg-surface-hover'
      )}
    >
      <div className="flex items-start justify-between">
        <MonoLabel>{title}</MonoLabel>
        <div className="rounded-lg p-2.5 bg-surface-muted text-fg-muted">
          <Icon weight="duotone" className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold text-fg tracking-tight tabular-nums leading-none">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>
      )}
      <div className="flex-1 min-h-[8px]" />
      {trend ? (
        <div className="mt-2.5 flex items-center gap-1">
          {trend.isPositive ? (
            <TrendUp weight="bold" className="h-3 w-3 text-fg-muted" />
          ) : (
            <TrendDown weight="bold" className="h-3 w-3 text-danger" />
          )}
          <span className={cn('text-xs font-medium tabular-nums', trend.isPositive ? 'text-fg-muted' : 'text-danger')}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-fg-muted">{t('inmobiliaria.common.vsLastMonth')}</span>
        </div>
      ) : (
        <div className="h-5" />
      )}
      {href && (
        <CaretRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-fg-subtle group-hover:text-primary transition-colors" weight="bold" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

/**
 * Secondary stat — neutral tile, Satoshi number, mono label (no rainbow).
 */
function SecondaryStat({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md p-2 bg-surface-muted text-fg-muted">
          <Icon weight="duotone" className="h-4 w-4" />
        </div>
        <div>
          <p className="font-heading text-lg font-semibold text-fg tabular-nums leading-none">{value}</p>
          <MonoLabel className="mt-1 block">{label}</MonoLabel>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Action Card
 */
interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-surface-hover transition-colors"
    >
      <div className="rounded-md p-2.5 bg-surface-muted text-fg-muted">
        <Icon weight="duotone" className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-xs text-fg-muted">{description}</p>
      </div>
      <CaretRight className="h-3.5 w-3.5 text-fg-subtle group-hover:text-primary transition-colors" weight="bold" />
    </Link>
  );
}

/**
 * Pipeline Mini Card
 */
function PipelineMiniCard({ item }: { item: PipelineItem }) {
  const stageInfo = getPipelineStageInfo(item.stage);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3">
      <div className="h-10 w-10 rounded-md bg-surface-muted overflow-hidden">
        {item.propertyThumbnail && (
          <img
            src={item.propertyThumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          {item.candidateName}
        </p>
        <p className="text-xs text-fg-muted truncate">
          {item.propertyTitle}
        </p>
      </div>
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', stageInfo?.color)}>
        {stageInfo?.labelEs}
      </span>
    </div>
  );
}

/**
 * Agent Mini Card
 */
function AgentMiniCard({ agent, t }: { agent: Agente; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-surface-muted text-fg-muted flex items-center justify-center font-mono text-xs font-semibold">
        {agent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          {agent.name}
        </p>
        <p className="text-xs text-fg-muted">
          {t('inmobiliaria.dashboard.team.closedThisMonth', { count: agent.metrics.closedThisMonth })}
        </p>
      </div>
      <span className="font-heading text-sm font-semibold text-fg tabular-nums">
        {formatCurrency(agent.metrics.commissionsThisMonth)}
      </span>
    </div>
  );
}

/**
 * Inmobiliaria Dashboard Page
 * Main overview for real estate agency operations
 */
export default function InmobiliariaDashboardPage() {
  const { t } = useI18n();
  const { canAccess, isLoading: permLoading } = usePermissions();

  const {
    kpis: kpisData,
    isLoading: kpisLoading,
    errorCrudo: kpisError,
    refetch: refetchKpis,
  } = useInmobiliariaDashboard({
    skip: permLoading || !canAccess('analytics', 'view'),
    pollMs: 30000, // refresco en vivo cada 30s
  });
  const kpis = kpisData ?? {
    totalProperties: 0, propertiesAvailable: 0, propertiesRented: 0, propertiesInProcess: 0,
    occupancyRate: 0, expectedRevenue: 0, collectedRevenue: 0, pendingCollections: 0,
    lateCollections: 0, collectionRate: 0, totalCommissions: 0,
    collectionTrend: 0, commissionsTrend: 0, activeLeads: 0,
    scheduledVisits: 0, pendingApplications: 0, contractsInProgress: 0,
    totalAgents: 0, closedThisMonth: 0, avgDaysToClose: 0, totalPropietarios: 0, pendingDispersions: 0,
  };

  // Etiqueta del mes en curso (es-CO) para el resumen financiero.
  // Sólo la inicial en mayúscula: con `capitalize` de CSS salía «Septiembre De 2026».
  const mesCrudo = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const currentMonthLabel = mesCrudo.charAt(0).toUpperCase() + mesCrudo.slice(1);
  const { agentes } = useAgentes({ skip: permLoading || !canAccess('agentes', 'view') });
  const { pipelineItems } = usePipelineItems({ skip: permLoading || !canAccess('pipeline', 'view') });
  const { cobros } = useCobros(undefined, { skip: permLoading || !canAccess('cobros', 'view') });
  const { mantenimientos } = useMantenimientos(undefined, { skip: permLoading || !canAccess('operaciones', 'view') });

  const activeAgents = agentes.filter((a) => a.status === 'active');

  // Get pipeline items that need attention (not completed/lost)
  const activePipeline = pipelineItems.filter(
    (p) => p.stage !== 'completed' && p.stage !== 'lost'
  ).slice(0, 5);

  // Get pending cobros
  const pendingCobros = cobros.filter(
    (c) => c.status === 'pending' || c.status === 'late'
  );

  // Get pending maintenance
  const pendingMaintenance = mantenimientos.filter(
    (m) => m.status !== 'completed' && m.status !== 'cancelled'
  );
  const cobrosEnMora = pendingCobros.filter((c) => c.status === 'late');

  // First load: distinguish "loading" from "empty agency" so the panel never
  // renders silent zeros while the KPIs are still in flight.
  if ((permLoading || kpisLoading) && !kpisData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  // Real failure (backend unreachable / server error) with no data to show.
  if (kpisError && !kpisData) {
    return (
      <div className="p-6 lg:p-8">
        {/* `ErrorState` no distingue un 404 de un corte de red: ofrecía
            reintentar siempre y describía todo igual. `FalloDeCarga` lo decide
            por el status. */}
        <FalloDeCarga
          error={kpisError}
          queEs="los indicadores de la agencia"
          onReintentar={refetchKpis}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-2 mb-1">
          <BrandDot />
          <MonoLabel className="text-[11px] font-medium text-primary">
            {t('inmobiliaria.dashboard.title')}
          </MonoLabel>
        </span>
        <h1 className="font-heading text-2xl font-semibold text-fg tracking-tight">
          {t('inmobiliaria.dashboard.subtitle')}
        </h1>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.monthlyCollection')}
          value={formatCurrency(kpis.collectedRevenue)}
          subtitle={t('inmobiliaria.dashboard.kpi.collectionRateLabel', { rate: kpis.collectionRate.toFixed(1) })}
          trend={{ value: Math.abs(kpis.collectionTrend), isPositive: kpis.collectionTrend >= 0 }}
          icon={CurrencyDollar}
          href="/panel/inmobiliaria/cobros"
          brandHero
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.totalProperties')}
          value={kpis.totalProperties}
          subtitle={t('inmobiliaria.dashboard.kpi.rentedAndAvailable', { rented: kpis.propertiesRented, available: kpis.propertiesAvailable })}
          icon={Buildings}
          href="/panel/inmobiliaria/inmuebles"
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.commissions')}
          value={formatCurrency(kpis.totalCommissions)}
          subtitle={t('inmobiliaria.dashboard.kpi.commissionsGenerated')}
          trend={{ value: Math.abs(kpis.commissionsTrend), isPositive: kpis.commissionsTrend >= 0 }}
          icon={Wallet}
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.occupancy')}
          value={`${kpis.occupancyRate}%`}
          subtitle={t('inmobiliaria.dashboard.kpi.occupancyOf', { rented: kpis.propertiesRented, total: kpis.totalProperties })}
          icon={House}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SecondaryStat icon={Kanban} value={kpis.activeLeads} label={t('inmobiliaria.dashboard.kpi.activeLeads')} />
        <SecondaryStat icon={Clock} value={kpis.scheduledVisits} label={t('inmobiliaria.dashboard.kpi.scheduledVisits')} />
        <SecondaryStat icon={FileText} value={kpis.contractsInProgress} label={t('inmobiliaria.dashboard.kpi.contractsInProgress')} />
        <SecondaryStat icon={Warning} value={pendingCobros.length} label={t('inmobiliaria.dashboard.kpi.pendingCollections')} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Activity */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.pipeline.title')}</h2>
              <p className="text-sm text-fg-muted mt-0.5">{t('inmobiliaria.dashboard.pipeline.subtitle')}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.common.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {activePipeline.length > 0 ? (
            <div className="space-y-3">
              {activePipeline.map((item) => (
                <PipelineMiniCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Kanban}
              title={t('inmobiliaria.dashboard.pipeline.empty')}
              description="Los candidatos en proceso aparecerán aquí a medida que avancen en el pipeline."
            />
          )}
        </div>

        {/* Team Performance */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.team.title')}</h2>
              <p className="text-sm text-fg-muted mt-0.5">{t('inmobiliaria.dashboard.team.activeAgents', { count: activeAgents.length })}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/agentes"
              className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.common.viewAllM')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {activeAgents.slice(0, 4).map((agent) => (
              <AgentMiniCard key={agent.id} agent={agent} t={t} />
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{t('inmobiliaria.dashboard.team.closedThisMonthLabel')}</span>
              <span className="font-semibold text-fg">{kpis.closedThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-fg-muted">{t('inmobiliaria.dashboard.team.avgDaysToClose')}</span>
              <span className="font-semibold text-fg">{t('inmobiliaria.dashboard.team.days', { count: kpis.avgDaysToClose })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-fg tracking-tight mb-4"><BrandDot />{t('inmobiliaria.dashboard.quickActions.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title={t('inmobiliaria.dashboard.quickActions.newOwner')}
            description={t('inmobiliaria.dashboard.quickActions.newOwnerDesc')}
            href="/panel/inmobiliaria/propietarios?nuevo=true"
            icon={UserCircle}
          />
          <QuickAction
            title={t('inmobiliaria.dashboard.quickActions.newConsignment')}
            description={t('inmobiliaria.dashboard.quickActions.newConsignmentDesc')}
            href="/panel/inmobiliaria/inmuebles/nuevo"
            icon={Buildings}
          />
          <QuickAction
            title={t('recibos.hacer')}
            description={t('recibos.queEs')}
            href="/panel/inmobiliaria/cobros?status=pending"
            icon={CurrencyDollar}
          />
          <QuickAction
            title={t('inmobiliaria.dashboard.quickActions.viewReports')}
            description={t('inmobiliaria.dashboard.quickActions.viewReportsDesc')}
            href="/panel/inmobiliaria/reportes"
            icon={ChartLine}
          />
        </div>
      </div>

      {/* Alertas: una por asunto, cada una con el número, qué hacer y el botón. */}
      {cobrosEnMora.length > 0 && (
        <AlertaAccionable
          severidad="warning"
          titulo={t('inmobiliaria.dashboard.alerts.latePayments', {
            count: cobrosEnMora.length,
            amount: formatCurrency(cobrosEnMora.reduce((sum, c) => sum + c.pendingAmount, 0)),
          })}
          accion={{ label: t('inmobiliaria.dashboard.alerts.viewPayments'), href: '/panel/inmobiliaria/cobros?status=late' }}
          data-testid="alerta-cobros-en-mora"
        >
          {t('inmobiliaria.dashboard.alerts.latePaymentsDetalle')}
        </AlertaAccionable>
      )}
      {pendingMaintenance.length > 0 && (
        <AlertaAccionable
          severidad="info"
          titulo={t('inmobiliaria.dashboard.alerts.pendingMaintenance', { count: pendingMaintenance.length })}
          accion={{ label: t('inmobiliaria.dashboard.alerts.viewRequests'), href: '/panel/inmobiliaria/operaciones' }}
          data-testid="alerta-mantenimientos"
        >
          {t('inmobiliaria.dashboard.alerts.pendingMaintenanceDetalle')}
        </AlertaAccionable>
      )}

      {/* Financial Summary */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.financial.title')}</h2>
            <p className="text-sm text-fg-muted mt-0.5">{currentMonthLabel}</p>
          </div>
          <Link
            href="/panel/inmobiliaria/reportes"
            className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('inmobiliaria.dashboard.financial.viewFullReports')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.expected')}</MonoLabel>
            <p className="font-heading text-lg font-semibold text-fg tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.expectedRevenue)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.collected')}</MonoLabel>
            <p className="font-heading text-lg font-semibold text-fg tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.collectedRevenue)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.pendingLabel')}</MonoLabel>
            <p className="font-heading text-lg font-semibold text-fg tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.pendingCollections)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.late')}</MonoLabel>
            <p className="font-heading text-lg font-semibold text-danger tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.lateCollections)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.pendingDispersions')}</MonoLabel>
            <p className="font-heading text-lg font-semibold text-fg tabular-nums tracking-tight leading-none">
              {kpis.pendingDispersions}
            </p>
          </div>
        </div>

        {/* Collection Rate Progress */}
        <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <MonoLabel>{t('inmobiliaria.dashboard.financial.collectionRate')}</MonoLabel>
            <span className="font-heading font-semibold text-neutral-900 dark:text-white tabular-nums">{kpis.collectionRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${kpis.collectionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
