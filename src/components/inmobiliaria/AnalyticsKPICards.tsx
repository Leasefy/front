'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendUp,
  TrendDown,
  Minus,
  CurrencyDollar,
  Percent,
  Clock,
  ChartLine,
  Target,
  Users,
  Buildings,
  Info,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AdvancedKPI, TrendDirection } from '@/lib/types/inmobiliaria';
import {
  getTrendColor,
  getTrendBgColor,
  formatPercentageChange,
  getCategoryColor,
  getCategoryIconColor,
  getCategoryBgColor,
  getCategoryLabel,
} from '@/lib/types/inmobiliaria';

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

// SVG Sparkline component
function Sparkline({
  points,
  width = 100,
  height = 32,
  trend,
  className,
}: {
  points: { date: string; value: number }[];
  width?: number;
  height?: number;
  trend: TrendDirection;
  className?: string;
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 4;

  const pathPoints = points.map((point, index) => {
    const x = (index / (points.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${pathPoints.join(' L ')}`;

  // Area path
  const areaPath = `M ${pathPoints[0]} L ${pathPoints.join(' L ')} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const strokeColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#64748B';
  const fillColor = trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : trend === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      {/* Area fill */}
      <path d={areaPath} fill={fillColor} />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width - padding}
        cy={height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)}
        r="3"
        fill={strokeColor}
      />
    </svg>
  );
}

// Target progress component
function TargetProgress({
  current,
  target,
  targetLabel,
  isInverse = false,
}: {
  current: number;
  target: number;
  targetLabel?: string;
  isInverse?: boolean;
}) {
  // For inverse metrics (like "days to rent"), lower is better
  const progress = isInverse
    ? Math.min(100, (target / current) * 100)
    : Math.min(100, (current / target) * 100);

  const achievement = isInverse ? current <= target : current >= target;
  const nearTarget = progress >= 90;

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {targetLabel || `Meta: ${target}`}
          </span>
        </div>
        <span className={cn(
          'text-xs font-medium',
          achievement ? 'text-emerald-600 dark:text-emerald-400' : nearTarget ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'
        )}>
          {progress.toFixed(0)}%
        </span>
      </div>
      <Progress
        value={progress}
        size="xs"
        variant={achievement ? 'success' : nearTarget ? 'warning' : 'default'}
      />
    </div>
  );
}

// Individual KPI Card component
function KPICard({
  kpi,
  layout,
  showSparkline,
  showTarget,
  onClick,
}: {
  kpi: AdvancedKPI;
  layout: 'grid' | 'compact';
  showSparkline: boolean;
  showTarget: boolean;
  onClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const CategoryIcon = CATEGORY_ICONS[kpi.category];
  const TrendIcon = TREND_ICONS[kpi.trend.direction];

  // Determine if lower is better for this KPI
  const isInverseMetric = kpi.id.includes('days') || kpi.id.includes('late');
  const trendColor = getTrendColor(kpi.trend.direction, !isInverseMetric);
  const trendBgColor = getTrendBgColor(kpi.trend.direction, !isInverseMetric);

  if (layout === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        onClick={onClick}
        className={cn(
          'flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]',
          'hover:shadow-md transition-all cursor-pointer'
        )}
      >
        {/* Icon */}
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getCategoryBgColor(kpi.category))}>
          <CategoryIcon className={cn('w-5 h-5', getCategoryIconColor(kpi.category))} weight="duotone" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{kpi.label}</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{kpi.formattedValue}</p>
        </div>

        {/* Trend */}
        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', trendBgColor, trendColor)}>
          <TrendIcon className="w-3.5 h-3.5" weight="bold" />
          <span>{formatPercentageChange(kpi.trend.percentage)}</span>
        </div>
      </motion.div>
    );
  }

  // Grid layout - full card
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-2xl border bg-white dark:bg-[#1a1a1c]',
        getCategoryColor(kpi.category),
        'hover:shadow-lg transition-all cursor-pointer'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', getCategoryBgColor(kpi.category))}>
            <CategoryIcon className={cn('w-6 h-6', getCategoryIconColor(kpi.category))} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-neutral-700 dark:text-neutral-300">{kpi.label}</h3>
              {kpi.description && (
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-neutral-900 text-white rounded-lg shadow-lg whitespace-nowrap"
                      >
                        {kpi.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full mt-1',
              getCategoryBgColor(kpi.category),
              getCategoryIconColor(kpi.category)
            )}>
              {getCategoryLabel(kpi.category)}
            </span>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{kpi.formattedValue}</p>
          {kpi.unit && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{kpi.unit}</p>
          )}
        </div>

        {/* Trend Badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
          trendBgColor,
          trendColor
        )}>
          <TrendIcon className="w-4 h-4" weight="bold" />
          <span>{formatPercentageChange(kpi.trend.percentage)}</span>
        </div>
      </div>

      {/* Sparkline */}
      {showSparkline && kpi.sparkline.length > 0 && (
        <div className="mt-4">
          <Sparkline
            points={kpi.sparkline}
            width={160}
            height={40}
            trend={kpi.trend.direction}
            className="w-full"
          />
        </div>
      )}

      {/* Target Progress */}
      {showTarget && kpi.target && (
        <TargetProgress
          current={kpi.value}
          target={kpi.target}
          targetLabel={kpi.targetLabel}
          isInverse={isInverseMetric}
        />
      )}
    </motion.div>
  );
}

/**
 * AnalyticsKPICards - Advanced KPI cards with sparklines and comparisons
 * Displays key performance indicators with trends, sparklines, and target progress
 */
export function AnalyticsKPICards({
  kpis,
  layout = 'grid',
  showSparklines = true,
  showTargets = true,
  onKPIClick,
}: AnalyticsKPICardsProps) {
  const [expandedCategory, setExpandedCategory] = useState<AdvancedKPI['category'] | null>(null);

  // Group KPIs by category
  const groupedKPIs = useMemo(() => {
    const groups: Record<AdvancedKPI['category'], AdvancedKPI[]> = {
      financial: [],
      operational: [],
      performance: [],
    };

    kpis.forEach((kpi) => {
      groups[kpi.category].push(kpi);
    });

    return groups;
  }, [kpis]);

  const categories: AdvancedKPI['category'][] = ['financial', 'operational', 'performance'];

  return (
    <div className="space-y-6">
      {/* Category tabs for filtering (optional) */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setExpandedCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            expandedCategory === null
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          )}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              expandedCategory === category
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            {getCategoryLabel(category)} ({groupedKPIs[category].length})
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <motion.div
        layout
        className={cn(
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
        )}
      >
        <AnimatePresence mode="popLayout">
          {kpis
            .filter((kpi) => expandedCategory === null || kpi.category === expandedCategory)
            .map((kpi) => (
              <motion.div
                key={kpi.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <KPICard
                  kpi={kpi}
                  layout={layout}
                  showSparkline={showSparklines}
                  showTarget={showTargets}
                  onClick={() => onKPIClick?.(kpi)}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.div>

      {/* Summary stats */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-6">
          {categories.map((category) => {
            const categoryKpis = groupedKPIs[category];
            const upTrends = categoryKpis.filter((k) => k.trend.direction === 'up').length;
            const CategoryIcon = CATEGORY_ICONS[category];

            return (
              <div key={category} className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', getCategoryBgColor(category))}>
                  <CategoryIcon className={cn('w-4 h-4', getCategoryIconColor(category))} weight="duotone" />
                </div>
                <div className="text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {getCategoryLabel(category)}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                    {upTrends}/{categoryKpis.length}
                  </span>
                  <span className="text-neutral-400 ml-1">subiendo</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Ultima actualizacion: {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default AnalyticsKPICards;
