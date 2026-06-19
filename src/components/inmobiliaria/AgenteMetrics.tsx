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
import { useI18n } from '@/lib/i18n';
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
    ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 border-[#2C7A53]/30 dark:border-[#2C7A53]/40'
    : performance === 'below'
    ? 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 border-[#C4503B]/30 dark:border-[#C4503B]/40'
    : 'bg-white dark:bg-[#1a1a1c] border-neutral-200 dark:border-neutral-700';

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all hover: hover:-translate-y-0.5',
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
  const { t } = useI18n();
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
          {t('inmobiliaria.agente.performanceMetrics')}
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Row 1: Property and Lease counts */}
        <MetricCard
          label={t('inmobiliaria.agente.assignedProperties')}
          value={metrics.assignedProperties}
          icon={<Buildings className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />}
          iconBg="bg-[#EEF1FF] dark:bg-[#1A40FF]/15"
        />
        <MetricCard
          label={t('inmobiliaria.agente.activeLeases')}
          value={metrics.activeLeases}
          icon={<Handshake className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />}
          iconBg="bg-neutral-100 dark:bg-neutral-800"
        />
        <MetricCard
          label={t('inmobiliaria.agente.closingsThisMonth')}
          value={metrics.closedThisMonth}
          icon={<CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />}
          iconBg="bg-[#E8F3EC] dark:bg-[#2C7A53]/15"
          performance={closedThisMonthPerformance}
        />
        <MetricCard
          label={t('inmobiliaria.agente.closingsThisYear')}
          value={metrics.closedThisYear}
          icon={<Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />}
          iconBg="bg-neutral-100 dark:bg-neutral-800"
        />

        {/* Row 2: Financial and Efficiency */}
        <MetricCard
          label={t('inmobiliaria.agente.commissionsMonth')}
          value={formatCurrency(metrics.commissionsThisMonth)}
          icon={<CurrencyDollar className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />}
          iconBg="bg-[#F8F0E0] dark:bg-[#B7791F]/15"
        />
        <MetricCard
          label={t('inmobiliaria.agente.totalCommissions')}
          value={formatCurrency(metrics.totalCommissions)}
          icon={<Wallet className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />}
          iconBg="bg-[#F8F0E0] dark:bg-[#B7791F]/15"
        />
        <MetricCard
          label={t('inmobiliaria.agente.avgDaysToClose')}
          value={metrics.avgDaysToClose > 0 ? `${metrics.avgDaysToClose} ${t('inmobiliaria.agente.daysUnit')}` : 'N/A'}
          icon={<Clock className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />}
          iconBg="bg-[#EEF1FF] dark:bg-[#1A40FF]/15"
          performance={daysToClosePerformance}
        />
        <MetricCard
          label={t('inmobiliaria.agente.conversionRate')}
          value={`${Math.round(metrics.conversionRate * 100)}%`}
          icon={<ChartLineUp className="w-5 h-5 text-[#C4503B] dark:text-[#E0664D]" />}
          iconBg="bg-[#F8EAE7] dark:bg-[#C4503B]/15"
          performance={conversionPerformance}
        />
      </div>

      {/* Performance Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2C7A53]" />
          <span>{t('inmobiliaria.agente.aboveAverage')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span>{t('inmobiliaria.agente.average')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C4503B]" />
          <span>{t('inmobiliaria.agente.belowAverage')}</span>
        </div>
      </div>
    </div>
  );
}

export default AgenteMetrics;
