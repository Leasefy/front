'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendUp,
  TrendDown,
  Minus,
  Calendar,
  ChartLine,
  Warning,
  Lightbulb,
  Sun,
  Moon,
  CaretDown,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@leasefy/cadence';
import type {
  TrendAnalysis,
  ComparisonPeriod,
  TrendAnomaly,
  SeasonalPattern,
} from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getSeasonColor,
  getTrendDirectionColor,
} from '@/lib/types/inmobiliaria';

interface AnalyticsTrendsProps {
  data: TrendAnalysis[];
  selectedMetric?: string;
  onMetricChange?: (metricId: string) => void;
  onPeriodChange?: (period: ComparisonPeriod) => void;
  className?: string;
}

/**
 * Format value based on metric type
 */
function formatMetricValue(value: number, metricId: string): string {
  if (metricId === 'revenue' || metricId === 'commissions') {
    return formatCurrency(value);
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Period comparison card
 */
function PeriodComparisonCard({ analysis }: { analysis: TrendAnalysis }) {
  const { t } = useI18n();
  const { comparison } = analysis;
  const isPercentMetric = analysis.metricId !== 'revenue' && analysis.metricId !== 'commissions';

  return (
    <div className="p-6 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
      <h3 className="text-sm font-medium text-fg-muted dark:text-fg-subtle mb-4">
        {t('inmobiliaria.analytics.trendsComp.periodComparison')}
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Current Period */}
        <div>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">
            {comparison.current.label}
          </p>
          <p className="text-2xl font-bold text-fg dark:text-white">
            {isPercentMetric
              ? `${comparison.current.value.toFixed(1)}%`
              : formatCurrency(comparison.current.value)}
          </p>
          <p className="text-xs text-fg-subtle dark:text-fg-muted mt-1">
            {comparison.current.startDate} - {comparison.current.endDate}
          </p>
        </div>

        {/* Previous Period */}
        <div>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">
            {comparison.previous.label}
          </p>
          <p className="text-xl font-semibold text-fg-muted dark:text-fg-subtle">
            {isPercentMetric
              ? `${comparison.previous.value.toFixed(1)}%`
              : formatCurrency(comparison.previous.value)}
          </p>
          <p className="text-xs text-fg-subtle dark:text-fg-muted mt-1">
            {comparison.previous.startDate} - {comparison.previous.endDate}
          </p>
        </div>
      </div>

      {/* Change Indicator */}
      <div className="mt-4 pt-4 border-t border-border-faint dark:border-border-strong">
        <Badge
          variant={
            comparison.change.direction === 'up'
              ? 'success'
              : comparison.change.direction === 'down'
              ? 'destructive'
              : 'secondary'
          }
          className="gap-2 px-3 py-1.5 text-sm"
        >
          {comparison.change.direction === 'up' && <TrendUp className="w-4 h-4" weight="bold" />}
          {comparison.change.direction === 'down' && (
            <TrendDown className="w-4 h-4" weight="bold" />
          )}
          {comparison.change.direction === 'stable' && <Minus className="w-4 h-4" weight="bold" />}
          <span>
            {comparison.change.direction === 'up' && '+'}
            {comparison.change.percentage.toFixed(1)}%
          </span>
          {comparison.change.direction !== 'stable' && (
            <span className="text-xs opacity-75">
              ({isPercentMetric
                ? `${comparison.change.absolute > 0 ? '+' : ''}${comparison.change.absolute.toFixed(1)}pp`
                : formatCurrency(Math.abs(comparison.change.absolute))})
            </span>
          )}
        </Badge>
      </div>
    </div>
  );
}

/**
 * SVG Line chart with trend line
 */
function TrendChart({ analysis }: { analysis: TrendAnalysis }) {
  const { t } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const { minValue, maxValue, points, trendPoints, anomalyPoints } = useMemo(() => {
    const values = analysis.data.map((d) => d.value);
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;

    const pts = analysis.data.map((d, i) => ({
      x: padding.left + (i / (analysis.data.length - 1)) * innerWidth,
      y: padding.top + innerHeight - ((d.value - min) / (max - min)) * innerHeight,
      data: d,
      index: i,
    }));

    // Calculate trend line points
    const firstY =
      padding.top +
      innerHeight -
      ((analysis.data[0].value - min) / (max - min)) * innerHeight;
    const lastY =
      padding.top +
      innerHeight -
      ((analysis.data[analysis.data.length - 1].value * (1 + analysis.trendLine.slope * 12) - min) /
        (max - min)) *
        innerHeight;

    const trendPts = [
      { x: padding.left, y: firstY },
      { x: padding.left + innerWidth, y: Math.max(padding.top, Math.min(lastY, padding.top + innerHeight)) },
    ];

    // Map anomalies to chart points
    const anomalyPts = analysis.anomalies.map((a) => {
      const dataIndex = analysis.data.findIndex((d) => d.date === a.date);
      if (dataIndex === -1) return null;
      return {
        x: padding.left + (dataIndex / (analysis.data.length - 1)) * innerWidth,
        y: padding.top + innerHeight - ((a.value - min) / (max - min)) * innerHeight,
        anomaly: a,
      };
    }).filter(Boolean);

    return { minValue: min, maxValue: max, points: pts, trendPoints: trendPts, anomalyPoints: anomalyPts };
  }, [analysis, innerWidth, innerHeight]);

  // Create path for the line
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Create area path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  const isPercentMetric = analysis.metricId !== 'revenue' && analysis.metricId !== 'commissions';

  return (
    <div className="p-6 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.analytics.trendsComp.historicTrend')}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary rounded" />
            <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.analytics.trendsComp.historic')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-muted rounded border-dashed" style={{ borderTop: '2px dashed' }} />
            <span className="text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.analytics.trendsComp.trend')} ({(analysis.trendLine.confidence * 100).toFixed(0)}% {t('inmobiliaria.analytics.trendsComp.conf')})
            </span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padding.left}
              y1={padding.top + innerHeight * ratio}
              x2={padding.left + innerWidth}
              y2={padding.top + innerHeight * ratio}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            <text
              x={padding.left - 8}
              y={padding.top + innerHeight * ratio + 4}
              textAnchor="end"
              className="fill-[#B3AEA5] dark:fill-[#726E68]"
              fontSize={10}
            >
              {isPercentMetric
                ? `${(maxValue - (maxValue - minValue) * ratio).toFixed(0)}%`
                : `${((maxValue - (maxValue - minValue) * ratio) / 1000000).toFixed(0)}M`}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {points
          .filter((_, i) => i % 2 === 0 || points.length < 8)
          .map((point) => (
            <text
              key={point.index}
              x={point.x}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-[#B3AEA5] dark:fill-[#726E68]"
              fontSize={10}
            >
              {point.data.label}
            </text>
          ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id={`trend-gradient-${analysis.metricId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1A40FF" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#1A40FF" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#trend-gradient-${analysis.metricId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Main line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#1A40FF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Trend line */}
        <line
          x1={trendPoints[0].x}
          y1={trendPoints[0].y}
          x2={trendPoints[1].x}
          y2={trendPoints[1].y}
          stroke="#9CA3AF"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeOpacity={0.7}
        />

        {/* Data points */}
        {points.map((point) => (
          <motion.circle
            key={point.index}
            cx={point.x}
            cy={point.y}
            r={hoveredIndex === point.index ? 6 : 4}
            fill="#1A40FF"
            stroke="white"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: point.index * 0.05 }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIndex(point.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {/* Anomaly markers */}
        {anomalyPoints.map((ap, idx) => ap && (
          <motion.g key={idx}>
            <circle
              cx={ap.x}
              cy={ap.y}
              r={8}
              fill={ap.anomaly.severity === 'high' ? '#C0392B' : '#9B9B9B'}
              fillOpacity={0.3}
            />
            <circle
              cx={ap.x}
              cy={ap.y}
              r={5}
              fill={ap.anomaly.severity === 'high' ? '#C0392B' : '#9B9B9B'}
              stroke="white"
              strokeWidth={2}
            />
          </motion.g>
        ))}

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <g>
            <rect
              x={points[hoveredIndex].x - 60}
              y={points[hoveredIndex].y - 45}
              width={120}
              height={35}
              rx={6}
              fill="white"
              stroke="#E5E7EB"
              strokeWidth={1}
              className="dark:fill-[#2A2824] dark:stroke-[#4D4A45]"
            />
            <text
              x={points[hoveredIndex].x}
              y={points[hoveredIndex].y - 30}
              textAnchor="middle"
              className="fill-[#14130F] dark:fill-white"
              fontSize={12}
              fontWeight={600}
            >
              {formatMetricValue(points[hoveredIndex].data.value, analysis.metricId)}
            </text>
            <text
              x={points[hoveredIndex].x}
              y={points[hoveredIndex].y - 16}
              textAnchor="middle"
              className="fill-[#726E68] dark:fill-[#B3AEA5]"
              fontSize={10}
            >
              {points[hoveredIndex].data.date}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Seasonal patterns visualization
 */
function SeasonalPatternsSection({ patterns }: { patterns: SeasonalPattern[] }) {
  const { t, locale } = useI18n();
  // Create full 12-month array
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const existing = patterns.find((p) => p.month === i + 1);
    return existing || {
      month: i + 1,
      monthName: new Date(2024, i).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { month: 'short' }),
      averageValue: 100,
      deviation: 0,
      isHighSeason: false,
    };
  });

  const maxDev = Math.max(...allMonths.map((m) => Math.abs(m.deviation)));

  return (
    <div className="p-6 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-md bg-warning-soft flex items-center justify-center">
          <Calendar className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-fg dark:text-white">
            {t('inmobiliaria.analytics.trendsComp.seasonalPatterns')}
          </h3>
          <p className="text-xs text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.analytics.trendsComp.seasonalDeviationDesc')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {allMonths.map((month, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3"
          >
            <span className="w-8 text-xs font-medium text-fg-muted dark:text-fg-subtle capitalize">
              {month.monthName.slice(0, 3)}
            </span>

            <div className="flex-1 h-6 flex items-center">
              {/* Zero line */}
              <div className="absolute w-px h-6 bg-muted dark:bg-ink" style={{ left: '50%' }} />

              {/* Bar */}
              <div className="w-full h-4 relative flex items-center justify-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.abs(month.deviation) / (maxDev || 1) * 40}%`,
                  }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                  className={cn(
                    'h-full rounded-sm absolute',
                    month.deviation >= 0 ? 'left-1/2 bg-success dark:bg-success' : 'right-1/2 bg-danger dark:bg-danger'
                  )}
                />
              </div>
            </div>

            <span
              className={cn(
                'w-12 text-xs font-medium text-right',
                month.deviation > 0 && 'text-success',
                month.deviation < 0 && 'text-danger',
                month.deviation === 0 && 'text-fg-muted dark:text-fg-subtle'
              )}
            >
              {month.deviation > 0 && '+'}
              {month.deviation}%
            </span>

            {month.isHighSeason && (
              <span className="shrink-0">
                <Sun className="w-4 h-4 text-warning" weight="fill" />
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border-faint dark:border-border-strong flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-warning" weight="fill" />
          <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.analytics.trendsComp.highSeason')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 bg-success rounded-sm" />
          <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.analytics.trendsComp.aboveAverage')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 bg-danger rounded-sm" />
          <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.analytics.trendsComp.belowAverage')}</span>
        </div>
      </div>

      {/* Notes */}
      {patterns.filter((p) => p.notes).length > 0 && (
        <div className="mt-4 space-y-2">
          {patterns
            .filter((p) => p.notes)
            .map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-fg-muted dark:text-fg-subtle p-2 rounded-md bg-surface-muted"
              >
                <Info className="w-3.5 h-3.5 text-fg-subtle shrink-0 mt-0.5" />
                <span>
                  <strong>{p.monthName}:</strong> {p.notes}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Anomalies table
 */
function AnomaliesTable({ anomalies, metricId }: { anomalies: TrendAnomaly[]; metricId: string }) {
  const { t, locale } = useI18n();
  const isPercentMetric = metricId !== 'revenue' && metricId !== 'commissions';

  if (anomalies.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center">
            <Warning className="w-4 h-4 text-success" />
          </div>
          <h3 className="text-sm font-medium text-fg dark:text-white">{t('inmobiliaria.analytics.trendsComp.anomalies')}</h3>
        </div>
        <p className="text-sm text-fg-muted dark:text-fg-subtle text-center py-6">
          {t('inmobiliaria.analytics.trendsComp.noAnomalies')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-md bg-warning-soft flex items-center justify-center">
          <Warning className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-fg dark:text-white">
            {t('inmobiliaria.analytics.trendsComp.anomaliesDetected')}
          </h3>
          <p className="text-xs text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.analytics.trendsComp.anomaliesCount', { count: anomalies.length })}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b border-border-faint dark:border-border-strong">
              <TableHead className="text-left p-2">
                {t('inmobiliaria.analytics.trendsComp.date')}
              </TableHead>
              <TableHead className="text-right p-2">
                {t('inmobiliaria.analytics.trendsComp.value')}
              </TableHead>
              <TableHead className="text-right p-2">
                {t('inmobiliaria.analytics.trendsComp.expected')}
              </TableHead>
              <TableHead className="text-right p-2">
                {t('inmobiliaria.analytics.trendsComp.deviation')}
              </TableHead>
              <TableHead className="text-center p-2">
                {t('inmobiliaria.analytics.trendsComp.severity')}
              </TableHead>
              <TableHead className="text-left p-2">
                {t('inmobiliaria.analytics.trendsComp.description')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((anomaly, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-b border-border-faint dark:border-border-strong/50"
              >
                <TableCell className="p-2 text-sm font-medium text-fg dark:text-white">
                  {new Date(anomaly.date).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="p-2 text-sm text-right font-medium text-fg dark:text-white">
                  {isPercentMetric ? `${anomaly.value}%` : formatCurrency(anomaly.value)}
                </TableCell>
                <TableCell className="p-2 text-sm text-right text-fg-muted dark:text-fg-subtle">
                  {isPercentMetric ? `${anomaly.expectedValue}%` : formatCurrency(anomaly.expectedValue)}
                </TableCell>
                <TableCell
                  className={cn(
                    'p-2 text-sm text-right font-medium',
                    anomaly.deviationPercent > 0
                      ? 'text-success'
                      : 'text-danger'
                  )}
                >
                  {anomaly.deviationPercent > 0 && '+'}
                  {anomaly.deviationPercent}%
                </TableCell>
                <TableCell className="p-2 text-center">
                  <Badge
                    variant={
                      anomaly.severity === 'high'
                        ? 'destructive'
                        : anomaly.severity === 'medium'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="capitalize"
                  >
                    {anomaly.severity === 'high' && t('inmobiliaria.analytics.trendsComp.severityHigh')}
                    {anomaly.severity === 'medium' && t('inmobiliaria.analytics.trendsComp.severityMedium')}
                    {anomaly.severity === 'low' && t('inmobiliaria.analytics.trendsComp.severityLow')}
                  </Badge>
                </TableCell>
                <TableCell className="p-2 text-sm text-fg-muted dark:text-fg-subtle max-w-[200px] truncate">
                  {anomaly.description}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Insights panel
 */
function InsightsPanel({ insights }: { insights: string[] }) {
  const { t } = useI18n();
  return (
    <div className="p-6 rounded-lg border border-primary/30 bg-primary-soft">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary" weight="fill" />
        </div>
        <h3 className="text-sm font-medium text-primary">
          {t('inmobiliaria.analytics.trendsComp.autoInsights')}
        </h3>
      </div>

      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 text-sm text-primary"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
            {insight}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/**
 * AnalyticsTrends - Trend analysis component with comparison and pattern detection
 */
export function AnalyticsTrends({
  data,
  selectedMetric,
  onMetricChange,
  onPeriodChange,
  className,
}: AnalyticsTrendsProps) {
  const { t, locale } = useI18n();
  const [activeMetric, setActiveMetric] = useState(selectedMetric || data[0]?.metricId || 'revenue');
  const [activePeriod, setActivePeriod] = useState<ComparisonPeriod>('previous_period');
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);

  const currentAnalysis = useMemo(() => {
    return data.find((d) => d.metricId === activeMetric) || data[0];
  }, [data, activeMetric]);

  const handleMetricChange = (metricId: string) => {
    setActiveMetric(metricId);
    onMetricChange?.(metricId);
    setIsMetricDropdownOpen(false);
  };

  const handlePeriodChange = (period: ComparisonPeriod) => {
    setActivePeriod(period);
    onPeriodChange?.(period);
  };

  if (!currentAnalysis) {
    return (
      <div className={cn('p-6 text-center text-fg-muted', className)}>
        {t('inmobiliaria.analytics.trendsComp.noData')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
            <ChartLine className="w-5 h-5 text-primary" weight="bold" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.analytics.trendsComp.title')}
            </h2>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.analytics.trendsComp.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Selector */}
          <DropdownList open={isMetricDropdownOpen} onOpenChange={setIsMetricDropdownOpen}>
            <DropdownListTrigger asChild>
              <Button variant="secondary" size="sm" hideArrow className="gap-2">
                {currentAnalysis.metricLabel}
                <CaretDown className={cn('w-4 h-4 transition-transform', isMetricDropdownOpen && 'rotate-180')} />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-48">
              {data.map((item) => (
                <DropdownListItem
                  key={item.metricId}
                  onClick={() => handleMetricChange(item.metricId)}
                  className={cn(activeMetric === item.metricId && 'bg-primary-soft text-primary font-medium')}
                >
                  {item.metricLabel}
                </DropdownListItem>
              ))}
            </DropdownListContent>
          </DropdownList>

          {/* Period Selector */}
          <SegmentedControl<ComparisonPeriod>
            value={activePeriod}
            onChange={(v) => handlePeriodChange(v)}
            options={[
              { value: 'previous_period', label: t('inmobiliaria.analytics.trendsComp.previousPeriod') },
              { value: 'previous_year', label: t('inmobiliaria.analytics.trendsComp.previousYear') },
            ]}
          />
        </div>
      </div>

      {/* Period Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PeriodComparisonCard analysis={currentAnalysis} />

        {/* Trend Summary Card */}
        <div className="p-6 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
          <h3 className="text-sm font-medium text-fg-muted dark:text-fg-subtle mb-4">
            {t('inmobiliaria.analytics.trendsComp.trendLine')}
          </h3>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                currentAnalysis.trendLine.direction === 'up' && 'bg-success-soft',
                currentAnalysis.trendLine.direction === 'down' && 'bg-danger-soft',
                currentAnalysis.trendLine.direction === 'stable' && 'bg-surface-muted dark:bg-ink'
              )}
            >
              {currentAnalysis.trendLine.direction === 'up' && (
                <TrendUp className="w-7 h-7 text-success" weight="bold" />
              )}
              {currentAnalysis.trendLine.direction === 'down' && (
                <TrendDown className="w-7 h-7 text-danger" weight="bold" />
              )}
              {currentAnalysis.trendLine.direction === 'stable' && (
                <Minus className="w-7 h-7 text-fg-muted dark:text-fg-subtle" weight="bold" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-fg dark:text-white capitalize">
                {currentAnalysis.trendLine.direction === 'up' && t('inmobiliaria.analytics.trendsComp.trendUp')}
                {currentAnalysis.trendLine.direction === 'down' && t('inmobiliaria.analytics.trendsComp.trendDown')}
                {currentAnalysis.trendLine.direction === 'stable' && t('inmobiliaria.analytics.trendsComp.trendStable')}
              </p>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {(currentAnalysis.trendLine.confidence * 100).toFixed(0)}% {t('inmobiliaria.analytics.trendsComp.confidence')}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-faint dark:border-border-strong">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.analytics.trendsComp.monthlySlope')}</span>
              <span
                className={cn(
                  'font-medium',
                  currentAnalysis.trendLine.slope > 0
                    ? 'text-success'
                    : currentAnalysis.trendLine.slope < 0
                    ? 'text-danger'
                    : 'text-fg-muted dark:text-fg-subtle'
                )}
              >
                {currentAnalysis.trendLine.slope > 0 && '+'}
                {(currentAnalysis.trendLine.slope * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        <InsightsPanel insights={currentAnalysis.insights} />
      </div>

      {/* Trend Chart */}
      <TrendChart analysis={currentAnalysis} />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Patterns */}
        <SeasonalPatternsSection patterns={currentAnalysis.seasonalPatterns} />

        {/* Anomalies Table */}
        <AnomaliesTable anomalies={currentAnalysis.anomalies} metricId={currentAnalysis.metricId} />
      </div>
    </div>
  );
}

export default AnalyticsTrends;