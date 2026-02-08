'use client';

import {
  Buildings,
  Handshake,
  CheckCircle,
  Calendar,
  CurrencyDollar,
  Wallet,
  Clock,
  ChartLineUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { AgenteMetrics as AgenteMetricsType } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface AgenteMetricsProps {
  metrics: AgenteMetricsType;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  performance?: 'above' | 'average' | 'below';
}

function MetricCard({ label, value, icon, iconBg, performance }: MetricCardProps) {
  // Determine card background based on performance
  const cardBg = performance === 'above'
    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
    : performance === 'below'
    ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800'
    : 'bg-white dark:bg-[#1a1a1c] border-neutral-200 dark:border-neutral-700';

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-0.5',
        cardBg
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 truncate">
            {label}
          </p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white truncate">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            iconBg
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * AgenteMetrics - Detailed KPI cards for agente performance
 * Displays 8 metrics in a 2x4 grid with color-coded performance indicators
 */
export function AgenteMetrics({ metrics, className }: AgenteMetricsProps) {
  // Determine performance levels
  // Above average: conversionRate > 60%, avgDaysToClose < 25
  // Below average: conversionRate < 30%
  const conversionPerformance = metrics.conversionRate >= 0.6
    ? 'above'
    : metrics.conversionRate < 0.3
    ? 'below'
    : 'average';

  const daysToClosePerformance = metrics.avgDaysToClose > 0 && metrics.avgDaysToClose < 25
    ? 'above'
    : metrics.avgDaysToClose > 35
    ? 'below'
    : 'average';

  const closedThisMonthPerformance = metrics.closedThisMonth >= 2
    ? 'above'
    : 'average';

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <ChartLineUp className="w-5 h-5 text-neutral-500" />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Metricas de Desempeno
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Row 1: Property and Lease counts */}
        <MetricCard
          label="Propiedades Asignadas"
          value={metrics.assignedProperties}
          icon={<Buildings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <MetricCard
          label="Arriendos Activos"
          value={metrics.activeLeases}
          icon={<Handshake className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
        />
        <MetricCard
          label="Cierres Este Mes"
          value={metrics.closedThisMonth}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          performance={closedThisMonthPerformance}
        />
        <MetricCard
          label="Cierres Este Ano"
          value={metrics.closedThisYear}
          icon={<Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
        />

        {/* Row 2: Financial and Efficiency */}
        <MetricCard
          label="Comisiones Mes"
          value={formatCurrency(metrics.commissionsThisMonth)}
          icon={<CurrencyDollar className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
        />
        <MetricCard
          label="Comisiones Totales"
          value={formatCurrency(metrics.totalCommissions)}
          icon={<Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
        />
        <MetricCard
          label="Dias Promedio Cierre"
          value={metrics.avgDaysToClose > 0 ? `${metrics.avgDaysToClose} dias` : 'N/A'}
          icon={<Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          iconBg="bg-cyan-100 dark:bg-cyan-900/30"
          performance={daysToClosePerformance}
        />
        <MetricCard
          label="Tasa de Conversion"
          value={`${Math.round(metrics.conversionRate * 100)}%`}
          icon={<ChartLineUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          performance={conversionPerformance}
        />
      </div>

      {/* Performance Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Por encima del promedio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span>Promedio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Por debajo del promedio</span>
        </div>
      </div>
    </div>
  );
}

export default AgenteMetrics;
