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
import {
  MOCK_DASHBOARD_KPIS,
  MOCK_PIPELINE_ITEMS,
  MOCK_COBROS,
  MOCK_MANTENIMIENTOS,
  MOCK_AGENTES,
  getActiveAgentes,
} from '@/lib/data/mock-inmobiliaria';
import { formatCurrency, getPipelineStageInfo } from '@/lib/types/inmobiliaria';

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
  const content = (
    <div className="group relative h-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all">
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
              <span className="text-sm text-neutral-400">vs mes anterior</span>
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
function PipelineMiniCard({ item }: { item: typeof MOCK_PIPELINE_ITEMS[0] }) {
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
function AgentMiniCard({ agent }: { agent: typeof MOCK_AGENTES[0] }) {
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
          {agent.metrics.closedThisMonth} cerrados este mes
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
  const kpis = MOCK_DASHBOARD_KPIS;
  const activeAgents = getActiveAgentes();

  // Get pipeline items that need attention (not completed/lost)
  const activePipeline = MOCK_PIPELINE_ITEMS.filter(
    (p) => p.stage !== 'completed' && p.stage !== 'lost'
  ).slice(0, 5);

  // Get pending cobros
  const pendingCobros = MOCK_COBROS.filter(
    (c) => c.status === 'pending' || c.status === 'late'
  );

  // Get pending maintenance
  const pendingMaintenance = MOCK_MANTENIMIENTOS.filter(
    (m) => m.status !== 'completed' && m.status !== 'cancelled'
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          Dashboard Inmobiliaria
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Resumen de operaciones y métricas clave
        </p>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Propiedades Totales"
          value={kpis.totalProperties}
          subtitle={`${kpis.propertiesRented} arrendadas · ${kpis.propertiesAvailable} disponibles`}
          icon={Buildings}
          iconColor="text-indigo-600"
          href="/panel/inmobiliaria/portafolio"
        />
        <KPICard
          title="Recaudo del Mes"
          value={formatCurrency(kpis.collectedRevenue)}
          subtitle={`${kpis.collectionRate.toFixed(1)}% tasa de cobro`}
          trend={{ value: 5.2, isPositive: true }}
          icon={CurrencyDollar}
          iconColor="text-emerald-600"
          href="/panel/inmobiliaria/cobros"
        />
        <KPICard
          title="Comisiones"
          value={formatCurrency(kpis.totalCommissions)}
          subtitle="Generadas este mes"
          trend={{ value: 8.1, isPositive: true }}
          icon={Wallet}
          iconColor="text-purple-600"
        />
        <KPICard
          title="Ocupación"
          value={`${kpis.occupancyRate}%`}
          subtitle={`${kpis.propertiesRented} de ${kpis.totalProperties} propiedades`}
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
              <p className="text-xs text-neutral-500">Leads activos</p>
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
              <p className="text-xs text-neutral-500">Visitas programadas</p>
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
              <p className="text-xs text-neutral-500">Contratos en firma</p>
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
              <p className="text-xs text-neutral-500">Cobros pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Activity */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Pipeline Activo</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Leads y negociaciones en curso</p>
            </div>
            <Link
              href="/panel/inmobiliaria/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              Ver todo
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
            <div className="text-center py-8">
              <Kanban className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay leads activos</p>
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Equipo</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{activeAgents.length} agentes activos</p>
            </div>
            <Link
              href="/panel/inmobiliaria/agentes"
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {activeAgents.slice(0, 4).map((agent) => (
              <AgentMiniCard key={agent.id} agent={agent} />
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Cerrados este mes</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{kpis.closedThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-neutral-500 dark:text-neutral-400">Promedio días cierre</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{kpis.avgDaysToClose} días</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="Nuevo Propietario"
            description="Registrar propietario"
            href="/panel/inmobiliaria/propietarios?nuevo=true"
            icon={UserCircle}
          />
          <QuickAction
            title="Nueva Consignación"
            description="Agregar propiedad"
            href="/panel/inmobiliaria/portafolio/nuevo"
            icon={Buildings}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <QuickAction
            title="Registrar Cobro"
            description="Recibir pago"
            href="/panel/inmobiliaria/cobros?status=pending"
            icon={CurrencyDollar}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
          />
          <QuickAction
            title="Ver Reportes"
            description="Extractos y cartera"
            href="/panel/inmobiliaria/reportes"
            icon={ChartLine}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
          />
        </div>
      </div>

      {/* Alerts Section */}
      {(pendingCobros.filter(c => c.status === 'late').length > 0 || pendingMaintenance.length > 0) && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg p-2 bg-amber-100 dark:bg-amber-900/50">
              <Warning weight="duotone" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">Requiere atención</h3>
              <div className="mt-2 space-y-2">
                {pendingCobros.filter(c => c.status === 'late').length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <CurrencyDollar className="h-4 w-4" />
                    <span>
                      {pendingCobros.filter(c => c.status === 'late').length} cobros en mora por{' '}
                      {formatCurrency(
                        pendingCobros
                          .filter(c => c.status === 'late')
                          .reduce((sum, c) => sum + c.pendingAmount, 0)
                      )}
                    </span>
                    <Link
                      href="/panel/inmobiliaria/cobros?status=late"
                      className="ml-auto font-medium hover:underline"
                    >
                      Ver cobros
                    </Link>
                  </div>
                )}
                {pendingMaintenance.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <Wrench className="h-4 w-4" />
                    <span>
                      {pendingMaintenance.length} solicitudes de mantenimiento pendientes
                    </span>
                    <Link
                      href="/panel/inmobiliaria/mantenimiento"
                      className="ml-auto font-medium hover:underline"
                    >
                      Ver solicitudes
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Resumen Financiero</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Febrero 2026</p>
          </div>
          <Link
            href="/panel/inmobiliaria/reportes"
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
          >
            Ver reportes completos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Esperado</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">
              {formatCurrency(kpis.expectedRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Recaudado</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(kpis.collectedRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Pendiente</p>
            <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(kpis.pendingCollections)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">En mora</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400 mt-1">
              {formatCurrency(kpis.lateCollections)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Dispersiones pendientes</p>
            <p className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {kpis.pendingDispersions}
            </p>
          </div>
        </div>

        {/* Collection Rate Progress */}
        <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-500 dark:text-neutral-400">Tasa de recaudo</span>
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
