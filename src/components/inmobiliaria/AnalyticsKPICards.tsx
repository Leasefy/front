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
  const strokeColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6366F1';

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
  const TrendIcon = TREND_ICONS[kpi.trend.direction];

  // Determine if lower is better for this KPI
  const isInverseMetric = kpi.id.includes('days') || kpi.id.includes('late');

  // For inverse metrics, "down" is good, "up" is bad
  const isPositiveTrend = isInverseMetric
    ? kpi.trend.direction === 'down'
    : kpi.trend.direction === 'up';
  const isNegativeTrend = isInverseMetric
    ? kpi.trend.direction === 'up'
    : kpi.trend.direction === 'down';

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
      className="flex flex-col h-full p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all cursor-pointer"
    >
      {/* Header - Icon + Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <CategoryIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 truncate">
            {kpi.label}
          </h3>
        </div>
      </div>

      {/* Value + Trend Row */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-neutral-900 dark:text-white truncate">
            {kpi.formattedValue}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0',
            isPositiveTrend && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
            isNegativeTrend && 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
            !isPositiveTrend && !isNegativeTrend && 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          )}
        >
          <TrendIcon className="w-3 h-3" weight="bold" />
          <span>{kpi.trend.percentage > 0 ? '+' : ''}{kpi.trend.percentage.toFixed(1)}%</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex-1 flex items-center justify-center min-h-[32px] mb-3">
        <MiniSparkline points={kpi.sparkline} trend={kpi.trend.direction} />
      </div>

      {/* Progress Bar */}
      {progress !== null && kpi.targetLabel && (
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <Target className="w-3 h-3" />
              <span>{kpi.targetLabel}</span>
            </div>
            <span className={cn(
              'font-semibold',
              progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
            )}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'
              )}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state for cards without target */}
      {progress === null && (
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
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
  const TrendIcon = TREND_ICONS[kpi.trend.direction];

  const isInverseMetric = kpi.id.includes('days') || kpi.id.includes('late');
  const isPositiveTrend = isInverseMetric
    ? kpi.trend.direction === 'down'
    : kpi.trend.direction === 'up';
  const isNegativeTrend = isInverseMetric
    ? kpi.trend.direction === 'up'
    : kpi.trend.direction === 'down';

  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all cursor-pointer"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
        <CategoryIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{kpi.label}</p>
        <p className="text-lg font-bold text-neutral-900 dark:text-white">{kpi.formattedValue}</p>
      </div>
      <div
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0',
          isPositiveTrend && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
          isNegativeTrend && 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
          !isPositiveTrend && !isNegativeTrend && 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        )}
      >
        <TrendIcon className="w-3.5 h-3.5" weight="bold" />
        <span>{kpi.trend.percentage > 0 ? '+' : ''}{kpi.trend.percentage.toFixed(1)}%</span>
      </div>
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
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
            selectedCategory === null
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          )}
        >
          {t('inmobiliaria.analytics.kpiCards.all')} ({kpis.length})
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              selectedCategory === category
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            )}
          >
            {getCategoryLabel(category)} ({groupedKPIs[category].length})
          </button>
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
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-6">
          {categories.map((category) => {
            const categoryKpis = groupedKPIs[category];
            const upTrends = categoryKpis.filter((k) => {
              const isInverse = k.id.includes('days') || k.id.includes('late');
              return isInverse ? k.trend.direction === 'down' : k.trend.direction === 'up';
            }).length;
            const CategoryIcon = CATEGORY_ICONS[category];

            return (
              <div key={category} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <CategoryIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" weight="duotone" />
                </div>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {getCategoryLabel(category)}:{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {upTrends}/{categoryKpis.length}
                  </span>
                  <span className="text-neutral-400 dark:text-neutral-500 ml-1">{t('inmobiliaria.analytics.kpiCards.positive')}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-neutral-400">
          {t('inmobiliaria.analytics.kpiCards.updated')}: {new Date().toLocaleTimeString(locale === 'es' ? 'es-CL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default AnalyticsKPICards;
