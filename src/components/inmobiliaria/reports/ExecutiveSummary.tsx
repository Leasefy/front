'use client';

import {
  TrendUp,
  TrendDown,
  ChartLineUp,
  Heartbeat,
  Buildings,
  CurrencyCircleDollar,
  Clock,
  Wrench,
  Percent,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ExecutiveData, ExecutiveMetric } from '@/lib/data/mock-reports';
import { BarChart, type BarChartDataPoint } from './TrendChart';

interface ExecutiveSummaryProps {
  data: ExecutiveData;
}

// ============================================================================
// Health Score Color Mapping
// ============================================================================

const HEALTH_COLORS = {
  excellent: {
    ring: 'text-success',
    bg: 'bg-success-soft',
    track: 'text-success',
    label: { es: 'Excelente', en: 'Excellent' },
  },
  good: {
    ring: 'text-primary',
    bg: 'bg-primary-soft',
    track: 'text-primary',
    label: { es: 'Bueno', en: 'Good' },
  },
  warning: {
    ring: 'text-warning',
    bg: 'bg-warning-soft',
    track: 'text-warning',
    label: { es: 'Atencion', en: 'Warning' },
  },
  critical: {
    ring: 'text-danger',
    bg: 'bg-danger-soft',
    track: 'text-danger',
    label: { es: 'Critico', en: 'Critical' },
  },
} as const;

// ============================================================================
// Metric Icon Mapping
// ============================================================================

const METRIC_ICONS: Record<string, React.ElementType> = {
  occupancy: Buildings,
  'monthly-collections': CurrencyCircleDollar,
  'mora-rate': Percent,
  'avg-vacancy-days': Clock,
  commissions: ArrowsClockwise,
  'maintenance-requests': Wrench,
};

// ============================================================================
// ExecutiveSummary Component
// ============================================================================

/**
 * ExecutiveSummary - C-level executive summary with portfolio health score,
 * month-over-month metric comparison, and revenue trend chart.
 * Designed for at-a-glance consumption with clean, high-level layout.
 */
export function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const { locale, formatCurrency } = useI18n();
  const isEs = locale === 'es';

  const healthConfig = HEALTH_COLORS[data.healthLevel];

  // Prepare bar chart data for revenue trend
  const revenueChartData: BarChartDataPoint[] = data.monthlySummary.map((m) => ({
    label: m.month,
    value: m.revenue,
    secondaryValue: m.expenses,
  }));

  return (
    <div className="space-y-6">
      {/* Row 1: Health Score Hero + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score Hero */}
        <div
          className={cn(
            'rounded-xl border border-border dark:border-strong p-6 flex flex-col items-center justify-center',
            'bg-surface dark:bg-[#14130F]'
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <Heartbeat className="w-4 h-4 text-fg-muted" />
            <h3 className="text-sm font-semibold text-foreground">
              {isEs ? 'Salud del Portafolio' : 'Portfolio Health'}
            </h3>
          </div>

          {/* Circular Score Indicator */}
          <div className="relative w-36 h-36 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Background track */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="10"
                className={cn('stroke-current', healthConfig.track)}
              />
              {/* Score arc */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(data.healthScore / 100) * 327} 327`}
                className={cn(
                  'stroke-current transition-all duration-1000',
                  healthConfig.ring
                )}
              />
            </svg>
            {/* Center number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground leading-none">
                {data.healthScore}
              </span>
              <span className="text-xs text-muted-foreground mt-1">/100</span>
            </div>
          </div>

          {/* Health level badge */}
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
              healthConfig.bg,
              healthConfig.ring
            )}
          >
            {isEs ? healthConfig.label.es : healthConfig.label.en}
          </span>
        </div>

        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ChartLineUp className="w-4 h-4 text-fg-muted" />
              {isEs ? 'Ingresos vs Gastos (6 meses)' : 'Revenue vs Expenses (6 months)'}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-ink dark:bg-muted" />
                {isEs ? 'Ingresos' : 'Revenue'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-muted dark:bg-ink" />
                {isEs ? 'Gastos' : 'Expenses'}
              </span>
            </div>
          </div>
          <BarChart
            data={revenueChartData}
            height={180}
          />
          {/* Net Income Row */}
          <div className="mt-3 pt-3 border-t border-faint dark:border-strong">
            <div className="flex items-center gap-4 overflow-x-auto">
              {data.monthlySummary.map((m) => (
                <div key={m.month} className="flex-1 min-w-0 text-center">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {isEs ? 'Neto' : 'Net'}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      m.netIncome >= 0
                        ? 'text-success'
                        : 'text-danger'
                    )}
                  >
                    {formatCurrency(m.netIncome)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            locale={locale}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MetricCard Sub-component
// ============================================================================

function MetricCard({
  metric,
  locale,
  formatCurrency,
}: {
  metric: ExecutiveMetric;
  locale: string;
  formatCurrency: (amount: number) => string;
}) {
  const isEs = locale === 'es';
  const label = isEs ? metric.labelEs : metric.labelEn;
  const Icon = METRIC_ICONS[metric.id] || Buildings;

  // Calculate delta
  const deltaRaw =
    metric.previousValue !== 0
      ? ((metric.currentValue - metric.previousValue) / metric.previousValue) * 100
      : 0;
  const delta = Math.abs(deltaRaw).toFixed(1);
  const isPositiveChange = deltaRaw > 0;

  // Determine if the change is "good" based on higherIsBetter
  const isGoodChange = metric.higherIsBetter ? isPositiveChange : !isPositiveChange;

  // Format value based on format type
  const formattedValue = formatMetricValue(metric.currentValue, metric.format, formatCurrency);

  return (
    <div className="rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F] p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-fg-muted" />
        </div>
        {/* Delta indicator */}
        {deltaRaw !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-sm',
              isGoodChange
                ? 'text-success bg-success-soft'
                : 'text-danger bg-danger-soft'
            )}
          >
            {isPositiveChange ? (
              <TrendUp className="w-3.5 h-3.5" weight="bold" />
            ) : (
              <TrendDown className="w-3.5 h-3.5" weight="bold" />
            )}
            {delta}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground leading-none mb-1">{formattedValue}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatMetricValue(
  value: number,
  format: ExecutiveMetric['format'],
  formatCurrency: (amount: number) => string
): string {
  switch (format) {
    case 'percent':
      return `${value}%`;
    case 'currency':
      return formatCurrency(value);
    case 'days':
      return `${value}d`;
    case 'number':
      return value.toLocaleString();
    default:
      return String(value);
  }
}
