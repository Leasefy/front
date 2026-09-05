'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendUp,
  TrendDown,
  Minus,
  CurrencyDollar,
  ChartLine,
  Target,
  Buildings,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Chip } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AdvancedKPI, TrendDirection } from '@/lib/types/inmobiliaria';
import { getCategoryLabel } from '@/lib/types/inmobiliaria';

interface AnalyticsKPICardsProps {
  kpis: AdvancedKPI[];
  layout?: 'grid' | 'compact';
  showSparklines?: boolean;
  showTargets?: boolean;
  onKPIClick?: (kpi: AdvancedKPI) => void;
}

// Category icons mapping
const CATEGORY_ICONS: Record<AdvancedKPI['category'], React.ElementType> = {
  financial: CurrencyDollar,
  operational: Buildings,
  performance: ChartLine,
};

// Trend icons mapping
const TREND_ICONS: Record<TrendDirection, React.ElementType> = {
  up: TrendUp,
  down: TrendDown,
  stable: Minus,
};

// Simple mini sparkline
function MiniSparkline({
  points,
  trend,
}: {
  points: { date: string; value: number }[];
  trend: TrendDirection;
}) {
  if (points.length < 2) return <div className="h-8" />;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 80;
  const height = 28;
  const padding = 2;

  const pathPoints = points.map((point, index) => {
    const x = (index / (points.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${pathPoints.join(' L ')}`;
  const strokeColor = trend === 'up' ? '#3F8A53' : trend === 'down' ? '#C0392B' : '#1A40FF';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width - padding}
        cy={height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)}
        r="2.5"
        fill={strokeColor}
      />
    </svg>
  );
}

// Unified KPI Card
function KPICard({
  kpi,
  onClick,
}: {
  kpi: AdvancedKPI;
  onClick?: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[kpi.category];
  const tendencia = kpi.trend;
  const TrendIcon = tendencia ? TREND_ICONS[tendencia.direction] : null;

  // Determine if lower is better for this KPI
  const isInverseMetric = kpi.id.includes('days') || kpi.id.includes('late');

  // For inverse metrics, "down" is good, "up" is bad
  const isPositiveTrend = isInverseMetric
    ? tendencia?.direction === 'down'
    : tendencia?.direction === 'up';
  const isNegativeTrend = isInverseMetric
    ? tendencia?.direction === 'up'
    : tendencia?.direction === 'down';

  // Calculate progress
  const progress = kpi.target
    ? isInverseMetric
      ? Math.min(100, (kpi.target / kpi.value) * 100)
      : Math.min(100, (kpi.value / kpi.target) * 100)
    : null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="flex flex-col h-full p-5 rounded-lg border border-border bg-card transition-all cursor-pointer hover:border-primary/30"
    >
      {/* Header - Icon + Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
          <CategoryIcon className="w-5 h-5 text-primary" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-fg-muted truncate">
            {kpi.label}
          </h3>
        </div>
      </div>

      {/* Value + Trend Row */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold font-mono tabular-nums text-fg truncate">
            {kpi.formattedValue}
          </p>
        </div>
        {tendencia && TrendIcon && (
          <Badge
            variant={isPositiveTrend ? 'success' : isNegativeTrend ? 'destructive' : 'secondary'}
            className="gap-1 font-mono tabular-nums flex-shrink-0"
          >
            <TrendIcon className="w-3 h-3" weight="bold" />
            <span>{tendencia.percentage > 0 ? '+' : ''}{tendencia.percentage.toFixed(1)}%</span>
          </Badge>
        )}
      </div>

      {/* Sparkline */}
      <div className="flex-1 flex items-center justify-center min-h-[32px] mb-3">
        <MiniSparkline points={kpi.sparkline} trend={tendencia?.direction ?? 'stable'} />
      </div>

      {/* Progress Bar */}
      {progress !== null && kpi.targetLabel && (
        <div className="pt-3 border-t border-border-faint">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 text-fg-muted">
              <Target className="w-3 h-3" />
              <span>{kpi.targetLabel}</span>
            </div>
            <span className={cn(
              'font-semibold font-mono tabular-nums',
              progress >= 100 ? 'text-success' : 'text-primary'
            )}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={Math.min(100, progress)}
            variant={progress >= 100 ? 'success' : 'default'}
            size="sm"
          />
        </div>
      )}

      {/* Empty state for cards without target */}
      {progress === null && (
        <div className="pt-3 border-t border-border-faint">
          <div className="h-[26px]" />
        </div>
      )}
    </motion.div>
  );
}

// Compact KPI Card
function CompactKPICard({
  kpi,
  onClick,
}: {
  kpi: AdvancedKPI;
  onClick?: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[kpi.category];
  const tendencia = kpi.trend;
  const TrendIcon = tendencia ? TREND_ICONS[tendencia.direction] : null;

  const isInverseMetric = kpi.id.includes('days') || kpi.id.includes('late');
  const isPositiveTrend = isInverseMetric
    ? tendencia?.direction === 'down'
    : tendencia?.direction === 'up';
  const isNegativeTrend = isInverseMetric
    ? tendencia?.direction === 'up'
    : tendencia?.direction === 'down';

  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card transition-all cursor-pointer hover:border-primary/30"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
        <CategoryIcon className="w-5 h-5 text-primary" weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-fg-muted truncate">{kpi.label}</p>
        <p className="text-lg font-bold font-mono tabular-nums text-fg">{kpi.formattedValue}</p>
      </div>
      {tendencia && TrendIcon && (
        <Badge
          variant={isPositiveTrend ? 'success' : isNegativeTrend ? 'destructive' : 'secondary'}
          className="gap-1 font-mono tabular-nums flex-shrink-0"
        >
          <TrendIcon className="w-3.5 h-3.5" weight="bold" />
          <span>{tendencia.percentage > 0 ? '+' : ''}{tendencia.percentage.toFixed(1)}%</span>
        </Badge>
      )}
    </motion.div>
  );
}

/**
 * AnalyticsKPICards - Unified KPI cards with consistent heights and styling
 */
export function AnalyticsKPICards({
  kpis,
  layout = 'grid',
  onKPIClick,
}: AnalyticsKPICardsProps) {
  const { t, locale } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<AdvancedKPI['category'] | null>(null);

  // Group KPIs by category
  const groupedKPIs = useMemo(() => {
    const groups: Record<AdvancedKPI['category'], AdvancedKPI[]> = {
      financial: [],
      operational: [],
      performance: [],
    };
    kpis.forEach((kpi) => groups[kpi.category].push(kpi));
    return groups;
  }, [kpis]);

  const categories: AdvancedKPI['category'][] = ['financial', 'operational', 'performance'];
  const filteredKpis = selectedCategory
    ? kpis.filter((kpi) => kpi.category === selectedCategory)
    : kpis;

  return (
    <div className="space-y-5">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Chip
          selected={selectedCategory === null}
          onClick={() => setSelectedCategory(null)}
        >
          {t('inmobiliaria.analytics.kpiCards.all')} ({kpis.length})
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
          >
            {getCategoryLabel(category)} ({groupedKPIs[category].length})
          </Chip>
        ))}
      </div>

      {/* KPI Cards */}
      <AnimatePresence mode="popLayout">
        {layout === 'grid' ? (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {filteredKpis.map((kpi) => (
              <motion.div
                key={kpi.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <KPICard kpi={kpi} onClick={() => onKPIClick?.(kpi)} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredKpis.map((kpi) => (
              <motion.div
                key={kpi.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <CompactKPICard kpi={kpi} onClick={() => onKPIClick?.(kpi)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-6">
          {categories.map((category) => {
            const categoryKpis = groupedKPIs[category];
            const upTrends = categoryKpis.filter((k) => {
              const isInverse = k.id.includes('days') || k.id.includes('late');
              return isInverse ? k.trend?.direction === 'down' : k.trend?.direction === 'up';
            }).length;
            const CategoryIcon = CATEGORY_ICONS[category];

            return (
              <div key={category} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary-soft flex items-center justify-center">
                  <CategoryIcon className="w-3.5 h-3.5 text-primary" weight="duotone" />
                </div>
                <span className="text-sm text-fg-muted">
                  {getCategoryLabel(category)}:{' '}
                  <span className="font-semibold font-mono tabular-nums text-success">
                    {upTrends}/{categoryKpis.length}
                  </span>
                  <span className="text-fg-subtle ml-1">{t('inmobiliaria.analytics.kpiCards.positive')}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-fg-subtle">
          {t('inmobiliaria.analytics.kpiCards.updated')}: <span className="font-mono tabular-nums">{new Date().toLocaleTimeString(locale === 'es' ? 'es-CL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </p>
      </div>
    </div>
  );
}

export default AnalyticsKPICards;
