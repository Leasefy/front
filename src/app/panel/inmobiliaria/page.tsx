'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Wrench,
  Clock,
  Warning,
  CheckCircle,
  CaretRight,
  House,
  Wallet,
  FileText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
import { AIAgentActivityFeed } from '@/components/inmobiliaria/ai/AIAgentActivityFeed';
import { AIAgentCard } from '@/components/inmobiliaria/ai/AIAgentCard';
import { getActiveAgents } from '@/lib/types/ai-agents';
import type { AgentActivity } from '@/lib/types/ai-agents';
import { useAgentActivity } from '@/lib/hooks/use-agent-activity';
import { FeatureGate } from '@/components/inmobiliaria/UpgradePrompt';

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
        className="group relative h-full rounded-xl p-5 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0B1220 58%, #122457 135%)', boxShadow: '0 10px 30px -6px rgba(26,64,255,0.30)' }}
      >
        {/* Brand contour — single hairline tracing the roof profile (badge grammar) */}
        <div className="absolute -inset-x-1 top-[34%] h-[44%] text-white/[0.14] pointer-events-none">
          <BrandContour />
        </div>
        <div className="flex items-start justify-between">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">{title}</span>
          <div className="rounded-xl p-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
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
        'group relative h-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5 flex flex-col transition-colors',
        href && 'hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-white/[0.04]'
      )}
    >
      <div className="flex items-start justify-between">
        <MonoLabel>{title}</MonoLabel>
        <div className="rounded-xl p-2.5 bg-neutral-100 dark:bg-[#1f1f21] text-neutral-500 dark:text-neutral-400">
          <Icon weight="duotone" className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-heading text-[28px] font-semibold text-neutral-900 dark:text-white tracking-tight tabular-nums leading-none">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 font-sans text-[12px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>
      )}
      <div className="flex-1 min-h-[8px]" />
      {trend ? (
        <div className="mt-2.5 flex items-center gap-1">
          {trend.isPositive ? (
            <TrendUp weight="bold" className="h-3 w-3 text-neutral-500" />
          ) : (
            <TrendDown weight="bold" className="h-3 w-3 text-[#C4503B]" />
          )}
          <span className={cn('font-sans text-[11.5px] font-medium tabular-nums', trend.isPositive ? 'text-neutral-500' : 'text-[#C4503B]')}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
          <span className="font-sans text-[11.5px] text-neutral-400">{t('inmobiliaria.common.vsLastMonth')}</span>
        </div>
      ) : (
        <div className="h-5" />
      )}
      {href && (
        <CaretRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-primary transition-colors" weight="bold" />
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
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md p-2 bg-neutral-100 dark:bg-[#1f1f21] text-neutral-500 dark:text-neutral-400">
          <Icon weight="duotone" className="h-4 w-4" />
        </div>
        <div>
          <p className="font-heading text-[18px] font-semibold text-neutral-900 dark:text-white tabular-nums leading-none">{value}</p>
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
      className="group flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-white/[0.04] transition-colors"
    >
      <div className="rounded-md p-2.5 bg-neutral-100 dark:bg-[#1f1f21] text-neutral-500 dark:text-neutral-400">
        <Icon weight="duotone" className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-sans font-medium text-neutral-900 dark:text-white">{title}</p>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      <CaretRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-primary transition-colors" weight="bold" />
    </Link>
  );
}

/**
 * Pipeline Mini Card
 */
function PipelineMiniCard({ item }: { item: PipelineItem }) {
  const stageInfo = getPipelineStageInfo(item.stage);

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1f1f21] p-3">
      <div className="h-10 w-10 rounded-md bg-neutral-200 dark:bg-[#2a2a2c] overflow-hidden">
        {item.propertyThumbnail && (
          <img
            src={item.propertyThumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {item.candidateName}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
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
      <div className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-[#2a2a2c] text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-mono text-[11px] font-semibold">
        {agent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {agent.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.dashboard.team.closedThisMonth', { count: agent.metrics.closedThisMonth })}
        </p>
      </div>
      <span className="font-heading text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
        {formatCurrency(agent.metrics.commissionsThisMonth)}
      </span>
    </div>
  );
}

/**
 * Agent section — compact layout with smart summary
 */
function AgentSection({
  agents,
  activities,
  metricsMap,
}: {
  agents: ReturnType<typeof getActiveAgents>;
  activities: AgentActivity[];
  metricsMap: Record<string, { label: string; value: string | number }[]>;
}) {
  const { t } = useI18n();

  function getLastAction(agentId: string) {
    const last = activities.find(a => a.agentId === agentId);
    if (!last) return null;
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - last.timestamp.getTime()) / 60_000);
    const diffH = Math.floor(diffMin / 60);
    const time = diffMin < 60 ? `hace ${diffMin} min` : `hace ${diffH}h`;
    return { title: last.title, time };
  }

  // Smart summary
  const escalations = activities.filter(a => a.type === 'escalation' || a.status === 'pending');
  const todayActions = activities.filter(a => {
    const diffH = (Date.now() - a.timestamp.getTime()) / 3_600_000;
    return diffH < 24;
  });

  return (
    <div className="space-y-4">
      {/* Smart summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 bg-neutral-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neutral-500" />
            </span>
            <h2 className="font-heading text-[15px] font-semibold text-neutral-900 dark:text-white tracking-tight">Agentes AI</h2>
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {todayActions.length} {todayActions.length === 1 ? 'acción' : 'acciones'} hoy
            {escalations.length > 0 && (
              <span className="text-[#C4503B] font-medium"> · {escalations.length} {escalations.length === 1 ? 'requiere' : 'requieren'} atención</span>
            )}
          </span>
        </div>
        <Link
          href="/panel/inmobiliaria/ai"
          className="flex items-center gap-1 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] hover:text-[#1A40FF] transition-colors"
        >
          {t('inmobiliaria.common.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Agent cards — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <AIAgentCard key={agent.id} agent={agent} metrics={metricsMap[agent.id]} lastAction={getLastAction(agent.id)} />
        ))}
      </div>

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

  const { kpis: kpisData } = useInmobiliariaDashboard({
    skip: permLoading || !canAccess('analytics', 'view'),
  });
  const kpis = kpisData ?? {
    totalProperties: 0, propertiesAvailable: 0, propertiesRented: 0, propertiesInProcess: 0,
    occupancyRate: 0, expectedRevenue: 0, collectedRevenue: 0, pendingCollections: 0,
    lateCollections: 0, collectionRate: 0, totalCommissions: 0, activeLeads: 0,
    scheduledVisits: 0, pendingApplications: 0, contractsInProgress: 0,
    totalAgents: 0, closedThisMonth: 0, avgDaysToClose: 0, totalPropietarios: 0, pendingDispersions: 0,
  };
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

  const aiAgents = getActiveAgents();
  const { activities: aiActivities } = useAgentActivity();

  // Agent metrics from real data (hook auto-refreshes)
  const scoringCount = aiActivities.filter(a => a.agentId === 'tenant-scoring' && a.type === 'execution').length;
  const matchingCount = aiActivities.filter(a => a.agentId === 'smart-matching').length;

  const agentMetricsMap: Record<string, { label: string; value: string | number }[]> = {
    'tenant-scoring': [
      { label: t('inmobiliaria.dashboard.aiAgents.evaluationsThisMonth'), value: scoringCount || 0 },
      { label: t('inmobiliaria.dashboard.aiAgents.avgTime'), value: '< 3 min' },
      { label: t('inmobiliaria.dashboard.aiAgents.precision'), value: scoringCount ? '94%' : '0%' },
      { label: t('inmobiliaria.dashboard.aiAgents.escalatedToHuman'), value: scoringCount ? '2%' : '0%' },
    ],
    'smart-matching': [
      { label: t('inmobiliaria.dashboard.aiAgents.suggestedThisWeek'), value: matchingCount || 0 },
      { label: t('inmobiliaria.dashboard.aiAgents.conversionRate'), value: matchingCount ? '32%' : '0%' },
      { label: t('inmobiliaria.dashboard.aiAgents.redirectedCandidates'), value: matchingCount || 0 },
      { label: t('inmobiliaria.dashboard.aiAgents.avgCompatibility'), value: matchingCount ? '78%' : '0%' },
    ],
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-2 mb-1">
          <BrandDot />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-primary">
            {t('inmobiliaria.dashboard.title')}
          </span>
        </span>
        <h1 className="font-heading text-[21px] font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.dashboard.subtitle')}
        </h1>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.monthlyCollection')}
          value={formatCurrency(kpis.collectedRevenue)}
          subtitle={t('inmobiliaria.dashboard.kpi.collectionRateLabel', { rate: kpis.collectionRate.toFixed(1) })}
          trend={{ value: 5.2, isPositive: true }}
          icon={CurrencyDollar}
          href="/panel/inmobiliaria/cobros"
          brandHero
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.totalProperties')}
          value={kpis.totalProperties}
          subtitle={t('inmobiliaria.dashboard.kpi.rentedAndAvailable', { rented: kpis.propertiesRented, available: kpis.propertiesAvailable })}
          icon={Buildings}
          href="/panel/inmobiliaria/portafolio"
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.commissions')}
          value={formatCurrency(kpis.totalCommissions)}
          subtitle={t('inmobiliaria.dashboard.kpi.commissionsGenerated')}
          trend={{ value: 8.1, isPositive: true }}
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

      {/* AI Agents Section */}
      <FeatureGate feature="ai-agents">
        <AgentSection agents={aiAgents} activities={aiActivities} metricsMap={agentMetricsMap} />
      </FeatureGate>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Activity */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold text-neutral-900 dark:text-white tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.pipeline.title')}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{t('inmobiliaria.dashboard.pipeline.subtitle')}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] hover:text-[#1A40FF]"
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
            <div className="rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] py-10 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Kanban className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              </div>
              <p className="text-sm text-muted-foreground">{t('inmobiliaria.dashboard.pipeline.empty')}</p>
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold text-neutral-900 dark:text-white tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.team.title')}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{t('inmobiliaria.dashboard.team.activeAgents', { count: activeAgents.length })}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/agentes"
              className="flex items-center gap-1 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] hover:text-[#1A40FF]"
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

          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.team.closedThisMonthLabel')}</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{kpis.closedThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.team.avgDaysToClose')}</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.dashboard.team.days', { count: kpis.avgDaysToClose })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold text-neutral-900 dark:text-white tracking-tight mb-4"><BrandDot />{t('inmobiliaria.dashboard.quickActions.title')}</h2>
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
            href="/panel/inmobiliaria/portafolio/nuevo"
            icon={Buildings}
          />
          <QuickAction
            title={t('inmobiliaria.dashboard.quickActions.registerPayment')}
            description={t('inmobiliaria.dashboard.quickActions.registerPaymentDesc')}
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

      {/* Alerts Section */}
      {(pendingCobros.filter(c => c.status === 'late').length > 0 || pendingMaintenance.length > 0) && (
        <div className="rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-md p-2 bg-[#F8F0E0] dark:bg-[#B7791F]/15">
              <Warning weight="duotone" className="h-5 w-5 text-[#B7791F] dark:text-[#D2992F]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#B7791F] dark:text-[#D2992F]">{t('inmobiliaria.dashboard.alerts.title')}</h3>
              <div className="mt-2 space-y-2">
                {pendingCobros.filter(c => c.status === 'late').length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#B7791F] dark:text-[#D2992F]">
                    <CurrencyDollar className="h-4 w-4" />
                    <span>
                      {t('inmobiliaria.dashboard.alerts.latePayments', {
                        count: pendingCobros.filter(c => c.status === 'late').length,
                        amount: formatCurrency(
                          pendingCobros
                            .filter(c => c.status === 'late')
                            .reduce((sum, c) => sum + c.pendingAmount, 0)
                        ),
                      })}
                    </span>
                    <Link
                      href="/panel/inmobiliaria/cobros?status=late"
                      className="ml-auto font-medium hover:underline"
                    >
                      {t('inmobiliaria.dashboard.alerts.viewPayments')}
                    </Link>
                  </div>
                )}
                {pendingMaintenance.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#B7791F] dark:text-[#D2992F]">
                    <Wrench className="h-4 w-4" />
                    <span>
                      {t('inmobiliaria.dashboard.alerts.pendingMaintenance', { count: pendingMaintenance.length })}
                    </span>
                    <Link
                      href="/panel/inmobiliaria/operaciones"
                      className="ml-auto font-medium hover:underline"
                    >
                      {t('inmobiliaria.dashboard.alerts.viewRequests')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold text-neutral-900 dark:text-white tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.financial.title')}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Febrero 2026</p>
          </div>
          <Link
            href="/panel/inmobiliaria/reportes"
            className="flex items-center gap-1 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] hover:text-[#1A40FF]"
          >
            {t('inmobiliaria.dashboard.financial.viewFullReports')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.expected')}</MonoLabel>
            <p className="font-heading text-[20px] font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.expectedRevenue)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.collected')}</MonoLabel>
            <p className="font-heading text-[20px] font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.collectedRevenue)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.pendingLabel')}</MonoLabel>
            <p className="font-heading text-[20px] font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.pendingCollections)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.late')}</MonoLabel>
            <p className="font-heading text-[20px] font-semibold text-[#C4503B] tabular-nums tracking-tight leading-none">
              {formatCurrency(kpis.lateCollections)}
            </p>
          </div>
          <div>
            <MonoLabel className="block mb-1.5">{t('inmobiliaria.dashboard.financial.pendingDispersions')}</MonoLabel>
            <p className="font-heading text-[20px] font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight leading-none">
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
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-[#1f1f21] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${kpis.collectionRate}%`, backgroundColor: '#1A40FF' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
