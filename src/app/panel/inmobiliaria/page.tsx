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
import { useI18n } from '@/lib/i18n';
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
  iconColor?: string;
  href?: string;
}

function KPICard({ title, value, subtitle, trend, icon: Icon, iconColor = 'text-indigo-600', href }: KPICardProps) {
  const { t } = useI18n();
  const content = (
    <div className="group relative h-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 flex flex-col">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
          )}
          {/* Spacer to push trend to bottom or maintain consistent spacing */}
          <div className="flex-1 min-h-[8px]" />
          {trend ? (
            <div className="mt-2 flex items-center gap-1">
              {trend.isPositive ? (
                <TrendUp weight="bold" className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendDown weight="bold" className="h-4 w-4 text-red-500" />
              )}
              <span className={cn('text-sm font-medium', trend.isPositive ? 'text-emerald-600' : 'text-red-600')}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-neutral-400">{t('inmobiliaria.common.vsLastMonth')}</span>
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>
        <div className={cn('rounded-xl p-3 bg-neutral-100 dark:bg-[#1f1f21]', iconColor)}>
          <Icon weight="duotone" className="h-5 w-5" />
        </div>
      </div>
      {href && (
        <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400 dark:group-hover:text-neutral-500 transition-colors" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

/**
 * Quick Action Card
 */
interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconBg?: string;
}

function QuickAction({ title, description, href, icon: Icon, iconBg = 'bg-indigo-100 dark:bg-indigo-900/30' }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
    >
      <div className={cn('rounded-lg p-2.5', iconBg)}>
        <Icon weight="duotone" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-neutral-900 dark:text-white">{title}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-indigo-500 transition-colors" />
    </Link>
  );
}

/**
 * Pipeline Mini Card
 */
function PipelineMiniCard({ item }: { item: PipelineItem }) {
  const stageInfo = getPipelineStageInfo(item.stage);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1f1f21] p-3">
      <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-[#2a2a2c] overflow-hidden">
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
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
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
      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
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
  const { kpis: kpisData } = useInmobiliariaDashboard();
  const kpis = kpisData ?? {
    totalProperties: 0, propertiesAvailable: 0, propertiesRented: 0, propertiesInProcess: 0,
    occupancyRate: 0, expectedRevenue: 0, collectedRevenue: 0, pendingCollections: 0,
    lateCollections: 0, collectionRate: 0, totalCommissions: 0, activeLeads: 0,
    scheduledVisits: 0, pendingApplications: 0, contractsInProgress: 0,
    totalAgents: 0, closedThisMonth: 0, avgDaysToClose: 0, totalPropietarios: 0, pendingDispersions: 0,
  };
  const { agentes } = useAgentes();
  const { pipelineItems } = usePipelineItems();
  const { cobros } = useCobros();
  const { mantenimientos } = useMantenimientos();

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

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {t('inmobiliaria.dashboard.title')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.dashboard.subtitle')}
        </p>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.totalProperties')}
          value={kpis.totalProperties}
          subtitle={t('inmobiliaria.dashboard.kpi.rentedAndAvailable', { rented: kpis.propertiesRented, available: kpis.propertiesAvailable })}
          icon={Buildings}
          iconColor="text-indigo-600"
          href="/panel/inmobiliaria/portafolio"
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.monthlyCollection')}
          value={formatCurrency(kpis.collectedRevenue)}
          subtitle={t('inmobiliaria.dashboard.kpi.collectionRateLabel', { rate: kpis.collectionRate.toFixed(1) })}
          trend={{ value: 5.2, isPositive: true }}
          icon={CurrencyDollar}
          iconColor="text-emerald-600"
          href="/panel/inmobiliaria/cobros"
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.commissions')}
          value={formatCurrency(kpis.totalCommissions)}
          subtitle={t('inmobiliaria.dashboard.kpi.commissionsGenerated')}
          trend={{ value: 8.1, isPositive: true }}
          icon={Wallet}
          iconColor="text-purple-600"
        />
        <KPICard
          title={t('inmobiliaria.dashboard.kpi.occupancy')}
          value={`${kpis.occupancyRate}%`}
          subtitle={t('inmobiliaria.dashboard.kpi.occupancyOf', { rented: kpis.propertiesRented, total: kpis.totalProperties })}
          icon={House}
          iconColor="text-amber-600"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-blue-100 dark:bg-blue-900/30">
              <Kanban weight="duotone" className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">{kpis.activeLeads}</p>
              <p className="text-xs text-neutral-500">{t('inmobiliaria.dashboard.kpi.activeLeads')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-amber-100 dark:bg-amber-900/30">
              <Clock weight="duotone" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">{kpis.scheduledVisits}</p>
              <p className="text-xs text-neutral-500">{t('inmobiliaria.dashboard.kpi.scheduledVisits')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-purple-100 dark:bg-purple-900/30">
              <FileText weight="duotone" className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">{kpis.contractsInProgress}</p>
              <p className="text-xs text-neutral-500">{t('inmobiliaria.dashboard.kpi.contractsInProgress')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-red-100 dark:bg-red-900/30">
              <Warning weight="duotone" className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">{pendingCobros.length}</p>
              <p className="text-xs text-neutral-500">{t('inmobiliaria.dashboard.kpi.pendingCollections')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Activity */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.dashboard.pipeline.title')}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.pipeline.subtitle')}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
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
            <div className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] py-10 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4 shadow-sm dark:shadow-none">
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
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.dashboard.team.title')}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.team.activeAgents', { count: activeAgents.length })}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/agentes"
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
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
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">{t('inmobiliaria.dashboard.quickActions.title')}</h2>
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
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <QuickAction
            title={t('inmobiliaria.dashboard.quickActions.registerPayment')}
            description={t('inmobiliaria.dashboard.quickActions.registerPaymentDesc')}
            href="/panel/inmobiliaria/cobros?status=pending"
            icon={CurrencyDollar}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
          />
          <QuickAction
            title={t('inmobiliaria.dashboard.quickActions.viewReports')}
            description={t('inmobiliaria.dashboard.quickActions.viewReportsDesc')}
            href="/panel/inmobiliaria/reportes"
            icon={ChartLine}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
          />
        </div>
      </div>

      {/* Alerts Section */}
      {(pendingCobros.filter(c => c.status === 'late').length > 0 || pendingMaintenance.length > 0) && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg p-2 bg-amber-100 dark:bg-amber-900/50">
              <Warning weight="duotone" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">{t('inmobiliaria.dashboard.alerts.title')}</h3>
              <div className="mt-2 space-y-2">
                {pendingCobros.filter(c => c.status === 'late').length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
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
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
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
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.dashboard.financial.title')}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Febrero 2026</p>
          </div>
          <Link
            href="/panel/inmobiliaria/reportes"
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
          >
            {t('inmobiliaria.dashboard.financial.viewFullReports')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.financial.expected')}</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">
              {formatCurrency(kpis.expectedRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.financial.collected')}</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(kpis.collectedRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.financial.pendingLabel')}</p>
            <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(kpis.pendingCollections)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.financial.late')}</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400 mt-1">
              {formatCurrency(kpis.lateCollections)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.financial.pendingDispersions')}</p>
            <p className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {kpis.pendingDispersions}
            </p>
          </div>
        </div>

        {/* Collection Rate Progress */}
        <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.dashboard.financial.collectionRate')}</span>
            <span className="font-medium text-neutral-900 dark:text-white">{kpis.collectionRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-[#1f1f21] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${kpis.collectionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
