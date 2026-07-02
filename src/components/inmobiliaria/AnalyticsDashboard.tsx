'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartLine,
  ChartBar,
  ChartPie,
  ChartDonut,
  TrendUp,
  TrendDown,
  Minus,
  CurrencyDollar,
  Buildings,
  ChartLineUp,
  Target,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import type {
  AnalyticsData,
  AnalyticsChart,
  AdvancedKPI,
  TrendDirection,
} from '@/lib/types/inmobiliaria';
import { getPeriodLabel } from '@/lib/types/inmobiliaria';

// TODO: Backend - Implementar metricas en tiempo real via WebSocket o SSE

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  isLoading?: boolean;
}

// ============================================================================
// Section Configuration
// ============================================================================

const SECTION_ICONS: Record<AdvancedKPI['category'], {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  financial: {
    icon: CurrencyDollar,
    color: 'text-success',
    bgColor: 'bg-success-soft',
  },
  operational: {
    icon: Buildings,
    color: 'text-primary',
    bgColor: 'bg-primary-soft',
  },
  performance: {
    icon: ChartLineUp,
    color: 'text-fg-muted dark:text-fg-subtle',
    bgColor: 'bg-surface-muted dark:bg-ink',
  },
};

// Trend icons
const TREND_ICONS: Record<TrendDirection, React.ElementType> = {
  up: TrendUp,
  down: TrendDown,
  stable: Minus,
};

// Chart type icons
const CHART_TYPE_ICONS: Record<AnalyticsChart['type'], React.ElementType> = {
  line: ChartLine,
  bar: ChartBar,
  area: ChartLine,
  pie: ChartPie,
  donut: ChartDonut,
};

// ============================================================================
// KPI Components
// ============================================================================

function CompactKPICard({ kpi }: { kpi: AdvancedKPI }) {
  const TrendIcon = TREND_ICONS[kpi.trend.direction];
  const isInverseMetric = kpi.id.includes('days') || kpi.id.includes('late');
  const isPositiveTrend = isInverseMetric
    ? kpi.trend.direction === 'down'
    : kpi.trend.direction === 'up';
  const isNegativeTrend = isInverseMetric
    ? kpi.trend.direction === 'up'
    : kpi.trend.direction === 'down';

  const progress = kpi.target
    ? isInverseMetric
      ? Math.min(100, (kpi.target / kpi.value) * 100)
      : Math.min(100, (kpi.value / kpi.target) * 100)
    : null;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-4 rounded-xl border border-border bg-card transition-all hover:border-foreground/15"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-fg-muted dark:text-fg-subtle">{kpi.label}</p>
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
            isPositiveTrend && 'bg-success-soft text-success',
            isNegativeTrend && 'bg-danger-soft text-danger',
            !isPositiveTrend && !isNegativeTrend && 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle'
          )}
        >
          <TrendIcon className="w-3 h-3" weight="bold" />
          <span>{kpi.trend.percentage > 0 ? '+' : ''}{kpi.trend.percentage.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-xl font-bold text-fg dark:text-white mb-2">
        {kpi.formattedValue}
      </p>
      {progress !== null && kpi.targetLabel && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-fg-subtle flex items-center gap-1">
              <Target className="w-3 h-3" />
              {kpi.targetLabel}
            </span>
            <span className={cn(
              'font-medium',
              progress >= 100 ? 'text-success' : 'text-fg-muted'
            )}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={Math.min(100, progress)}
            variant={progress >= 100 ? 'success' : 'default'}
            size="xs"
          />
        </div>
      )}
    </motion.div>
  );
}

function KPISection({
  category,
  kpis
}: {
  category: AdvancedKPI['category'];
  kpis: AdvancedKPI[];
}) {
  const { t } = useI18n();
  const config = SECTION_ICONS[category];
  const Icon = config.icon;

  if (kpis.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', config.bgColor)}>
          <Icon className={cn('w-5 h-5', config.color)} weight="duotone" />
        </div>
        <div>
          <h3 className="font-semibold text-fg dark:text-white">{t(`inmobiliaria.analytics.sections.${category}.title`)}</h3>
          <p className="text-xs text-fg-muted">{t(`inmobiliaria.analytics.sections.${category}.description`)}</p>
        </div>
      </div>
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <CompactKPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Chart Components
// ============================================================================

function BarChart({ chart }: { chart: AnalyticsChart }) {
  const maxValue = Math.max(...chart.datasets.flatMap((d) => d.data));

  return (
    <div className="space-y-3">
      {chart.labels.map((label, idx) => (
        <div key={label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted dark:text-fg-subtle">{label}</span>
            <span className="font-medium text-fg dark:text-white">
              {chart.datasets[0].data[idx]}
              {chart.id.includes('ocupacion') ? '%' : ''}
            </span>
          </div>
          <div className="flex gap-1">
            {chart.datasets.map((dataset, dIdx) => (
              <div
                key={dataset.label}
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(dataset.data[idx] / maxValue) * 100}%`,
                  backgroundColor: dataset.color,
                  opacity: dIdx === 0 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AreaLineChart({ chart }: { chart: AnalyticsChart }) {
  const width = 300;
  const height = 150;
  const padding = 20;

  const allValues = chart.datasets.flatMap((d) => d.data);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + (height - 2 * padding) * ratio}
            x2={width - padding}
            y2={padding + (height - 2 * padding) * ratio}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="4 4"
          />
        ))}
        {chart.datasets.map((dataset, dIdx) => {
          const points = dataset.data.map((value, idx) => {
            const x = padding + (idx / (dataset.data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
            return { x, y };
          });

          const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
          const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

          return (
            <g key={dataset.label}>
              {dIdx === 0 && chart.type === 'area' && (
                <path d={areaPath} fill={dataset.color} fillOpacity={0.1} />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={dataset.color}
                strokeWidth={dataset.type === 'line' || dIdx > 0 ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dIdx > 0 ? '6 4' : undefined}
              />
              {points.map((point, pIdx) => (
                <circle
                  key={pIdx}
                  cx={point.x}
                  cy={point.y}
                  r={dIdx === 0 ? 4 : 3}
                  fill="white"
                  stroke={dataset.color}
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-fg-muted px-5 -mt-2">
        {chart.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4">
        {chart.datasets.map((dataset) => (
          <div key={dataset.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dataset.color }} />
            <span className="text-xs text-fg-muted dark:text-fg-subtle">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChartViz({ chart }: { chart: AnalyticsChart }) {
  const { t } = useI18n();
  const data = chart.datasets[0].data;
  const total = data.reduce((sum, val) => sum + val, 0);
  const colors = ['#1A40FF', '#7B95FF', '#6B6B6B', '#9B9B9B', '#C9CDD3'];

  let currentAngle = -90;
  const segments = data.map((value, idx) => {
    const percentage = (value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const r = 70;
    const innerR = 45;
    const cx = 100;
    const cy = 100;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const x3 = cx + innerR * Math.cos(endRad);
    const y3 = cy + innerR * Math.sin(endRad);
    const x4 = cx + innerR * Math.cos(startRad);
    const y4 = cy + innerR * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return { path, color: colors[idx % colors.length], percentage, label: chart.labels[idx] };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg viewBox="0 0 200 200" className="w-40 h-40">
          {segments.map((segment, idx) => (
            <path
              key={idx}
              d={segment.path}
              fill={segment.color}
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-fg dark:text-white">{data[0]}%</p>
            <p className="text-xs text-fg-muted">{t('inmobiliaria.analytics.dashboard.upToDate')}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="flex-1 text-sm text-fg-muted dark:text-fg-subtle">{segment.label}</span>
            <span className="text-sm font-medium text-fg dark:text-white">
              {segment.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ chart }: { chart: AnalyticsChart }) {
  const ChartIcon = CHART_TYPE_ICONS[chart.type];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-5 rounded-xl border border-border bg-card transition-all hover:border-foreground/15"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
            <ChartIcon className="w-4 h-4 text-fg-muted dark:text-fg-subtle" weight="duotone" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">{chart.title}</h3>
            {chart.description && (
              <p className="text-xs text-fg-muted dark:text-fg-subtle">{chart.description}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-medium text-fg-muted dark:text-fg-subtle bg-surface-muted dark:bg-ink px-2.5 py-1 rounded-full">
          {getPeriodLabel(chart.period)}
        </span>
      </div>
      <div className="min-h-[160px]">
        {chart.type === 'bar' && <BarChart chart={chart} />}
        {(chart.type === 'area' || chart.type === 'line') && <AreaLineChart chart={chart} />}
        {(chart.type === 'donut' || chart.type === 'pie') && <DonutChartViz chart={chart} />}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AnalyticsDashboard({
  data,
  isLoading = false,
}: AnalyticsDashboardProps) {
  const { t } = useI18n();
  // Group KPIs by category
  const groupedKPIs = useMemo(() => {
    const groups: Record<AdvancedKPI['category'], AdvancedKPI[]> = {
      financial: [],
      operational: [],
      performance: [],
    };
    data.kpis?.forEach((kpi) => groups[kpi.category].push(kpi));
    return groups;
  }, [data.kpis]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Financial KPIs */}
      <KPISection category="financial" kpis={groupedKPIs.financial} />

      {/* Section 2: Operational KPIs */}
      <KPISection category="operational" kpis={groupedKPIs.operational} />

      {/* Section 3: Performance KPIs */}
      <KPISection category="performance" kpis={groupedKPIs.performance} />

      {/* Section 4: Visualizations */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-warning-soft flex items-center justify-center">
            <ChartBar className="w-5 h-5 text-warning" weight="duotone" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">{t('inmobiliaria.analytics.dashboard.visualizations')}</h3>
            <p className="text-xs text-fg-muted">{t('inmobiliaria.analytics.dashboard.visualizationsDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.charts?.map((chart) => (
            <ChartCard key={chart.id} chart={chart} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
