'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartLineUp,
  TrendUp,
  TrendDown,
  Minus,
  CaretDown,
  CheckCircle,
  Lightning,
  CloudArrowDown,
  ArrowsClockwise,
  MagicWand,
  Export,
  Funnel,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type {
  ForecastData,
  ForecastScenario,
  ForecastDataPoint,
  TrendDataPoint,
} from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getScenarioColor,
  getImpactColor,
  formatConfidence,
} from '@/lib/types/inmobiliaria';

interface AnalyticsForecastingProps {
  data: ForecastData[];
  selectedMetric?: string;
  horizon?: number;
  onMetricChange?: (metricId: string) => void;
  onHorizonChange?: (months: number) => void;
  onExport?: () => void;
  className?: string;
}

/**
 * Format value based on metric unit
 */
function formatValue(value: number, unit: string): string {
  if (unit === 'COP') {
    return formatCurrency(value);
  }
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString('es-CO');
}

/**
 * Format month label from date
 */
function formatMonthLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
}

/**
 * Main forecast chart with SVG
 */
function ForecastChart({
  forecast,
  activeScenarios,
  horizon,
}: {
  forecast: ForecastData;
  activeScenarios: string[];
  horizon: number;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ type: string; index: number } | null>(null);

  const chartWidth = 700;
  const chartHeight = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Combine and limit data
  const historicalData = forecast.historical.slice(-6); // Last 6 months
  const baselineData = forecast.baseline.slice(0, horizon);
  const allScenarioData = forecast.scenarios
    .filter((s) => activeScenarios.includes(s.id))
    .map((s) => ({ ...s, data: s.data.slice(0, horizon) }));

  // Calculate bounds
  const allValues = [
    ...historicalData.map((d) => d.value),
    ...baselineData.flatMap((d) => [d.lowerBound, d.upperBound]),
    ...allScenarioData.flatMap((s) => s.data.map((d) => d.predicted)),
  ];
  const minValue = Math.min(...allValues) * 0.95;
  const maxValue = Math.max(...allValues) * 1.05;

  const totalPoints = historicalData.length + baselineData.length;

  // Calculate points
  const historicalPoints = historicalData.map((d, i) => ({
    x: padding.left + (i / (totalPoints - 1)) * innerWidth,
    y: padding.top + innerHeight - ((d.value - minValue) / (maxValue - minValue)) * innerHeight,
    data: d,
  }));

  const baselinePoints = baselineData.map((d, i) => ({
    x: padding.left + ((historicalData.length + i) / (totalPoints - 1)) * innerWidth,
    y:
      padding.top +
      innerHeight -
      ((d.predicted - minValue) / (maxValue - minValue)) * innerHeight,
    lowerY:
      padding.top +
      innerHeight -
      ((d.lowerBound - minValue) / (maxValue - minValue)) * innerHeight,
    upperY:
      padding.top +
      innerHeight -
      ((d.upperBound - minValue) / (maxValue - minValue)) * innerHeight,
    data: d,
  }));

  const scenarioLines = allScenarioData.map((scenario) => ({
    ...scenario,
    points: scenario.data.map((d, i) => ({
      x: padding.left + ((historicalData.length + i) / (totalPoints - 1)) * innerWidth,
      y:
        padding.top +
        innerHeight -
        ((d.predicted - minValue) / (maxValue - minValue)) * innerHeight,
      data: d,
    })),
  }));

  // Create paths
  const historicalPath = historicalPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const baselinePath = baselinePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Confidence interval area
  const confidenceAreaPath = `
    M ${baselinePoints[0].x} ${baselinePoints[0].upperY}
    ${baselinePoints.map((p) => `L ${p.x} ${p.upperY}`).join(' ')}
    ${baselinePoints
      .slice()
      .reverse()
      .map((p) => `L ${p.x} ${p.lowerY}`)
      .join(' ')}
    Z
  `;

  const isPercentMetric = forecast.unit === '%';

  return (
    <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Proyeccion a {horizon} meses
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-500 rounded" />
            <span className="text-neutral-500 dark:text-neutral-400">Historico</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 bg-neutral-500 rounded"
              style={{ borderTop: '2px dashed' }}
            />
            <span className="text-neutral-500 dark:text-neutral-400">Base</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded-sm opacity-50" />
            <span className="text-neutral-500 dark:text-neutral-400">Intervalo</span>
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
              className="fill-neutral-400 dark:fill-neutral-500"
              fontSize={10}
            >
              {isPercentMetric
                ? `${(maxValue - (maxValue - minValue) * ratio).toFixed(0)}%`
                : `${((maxValue - (maxValue - minValue) * ratio) / 1000000).toFixed(0)}M`}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {[...historicalPoints, ...baselinePoints]
          .filter((_, i) => i % 2 === 0)
          .map((point, i) => (
            <text
              key={i}
              x={'data' in point && 'date' in point.data ? point.x : point.x}
              y={chartHeight - 12}
              textAnchor="middle"
              className="fill-neutral-400 dark:fill-neutral-500"
              fontSize={10}
            >
              {formatMonthLabel('date' in point.data ? point.data.date : '')}
            </text>
          ))}

        {/* Divider line between historical and forecast */}
        <line
          x1={historicalPoints[historicalPoints.length - 1]?.x || padding.left}
          y1={padding.top}
          x2={historicalPoints[historicalPoints.length - 1]?.x || padding.left}
          y2={padding.top + innerHeight}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeDasharray="4 4"
        />
        <text
          x={(historicalPoints[historicalPoints.length - 1]?.x || padding.left) - 5}
          y={padding.top + 15}
          textAnchor="end"
          className="fill-neutral-400 dark:fill-neutral-500"
          fontSize={9}
        >
          Historico
        </text>
        <text
          x={(historicalPoints[historicalPoints.length - 1]?.x || padding.left) + 5}
          y={padding.top + 15}
          textAnchor="start"
          className="fill-neutral-400 dark:fill-neutral-500"
          fontSize={9}
        >
          Proyeccion
        </text>

        {/* Gradients */}
        <defs>
          <linearGradient id="historical-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="confidence-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.2} />
            <stop offset="50%" stopColor="#9CA3AF" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Historical area */}
        <motion.path
          d={`${historicalPath} L ${historicalPoints[historicalPoints.length - 1]?.x} ${
            padding.top + innerHeight
          } L ${historicalPoints[0]?.x} ${padding.top + innerHeight} Z`}
          fill="url(#historical-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Confidence interval */}
        <motion.path
          d={confidenceAreaPath}
          fill="url(#confidence-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.5 }}
        />

        {/* Historical line */}
        <motion.path
          d={historicalPath}
          fill="none"
          stroke="#6366F1"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Baseline forecast line */}
        <motion.path
          d={baselinePath}
          fill="none"
          stroke="#6B7280"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        />

        {/* Scenario lines */}
        {scenarioLines.map((scenario) => {
          const path = scenario.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

          const color =
            scenario.id === 'optimistic'
              ? '#10B981'
              : scenario.id === 'pessimistic'
              ? '#EF4444'
              : '#3B82F6';

          return (
            <motion.path
              key={scenario.id}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            />
          );
        })}

        {/* Baseline data points */}
        {baselinePoints.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#6B7280"
            stroke="white"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.05 }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredPoint({ type: 'baseline', index: i })}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* Tooltip */}
        {hoveredPoint?.type === 'baseline' && (
          <g>
            <rect
              x={baselinePoints[hoveredPoint.index].x - 80}
              y={baselinePoints[hoveredPoint.index].y - 60}
              width={160}
              height={50}
              rx={8}
              fill="white"
              stroke="#E5E7EB"
              strokeWidth={1}
              className="dark:fill-neutral-800 dark:stroke-neutral-700"
            />
            <text
              x={baselinePoints[hoveredPoint.index].x}
              y={baselinePoints[hoveredPoint.index].y - 42}
              textAnchor="middle"
              className="fill-neutral-900 dark:fill-white"
              fontSize={12}
              fontWeight={600}
            >
              {formatValue(baselinePoints[hoveredPoint.index].data.predicted, forecast.unit)}
            </text>
            <text
              x={baselinePoints[hoveredPoint.index].x}
              y={baselinePoints[hoveredPoint.index].y - 26}
              textAnchor="middle"
              className="fill-neutral-500 dark:fill-neutral-400"
              fontSize={10}
            >
              {formatConfidence(baselinePoints[hoveredPoint.index].data.confidence)}
            </text>
            <text
              x={baselinePoints[hoveredPoint.index].x}
              y={baselinePoints[hoveredPoint.index].y - 14}
              textAnchor="middle"
              className="fill-neutral-400 dark:fill-neutral-500"
              fontSize={9}
            >
              {formatValue(baselinePoints[hoveredPoint.index].data.lowerBound, forecast.unit)} -{' '}
              {formatValue(baselinePoints[hoveredPoint.index].data.upperBound, forecast.unit)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Scenario card component
 */
function ScenarioCard({
  scenario,
  isActive,
  onToggle,
  unit,
}: {
  scenario: ForecastScenario;
  isActive: boolean;
  onToggle: () => void;
  unit: string;
}) {
  const endValue = scenario.data[scenario.data.length - 1]?.predicted || 0;
  const color =
    scenario.id === 'optimistic'
      ? 'emerald'
      : scenario.id === 'pessimistic'
      ? 'red'
      : 'blue';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'p-4 rounded-xl border-2 cursor-pointer transition-all',
        isActive
          ? `border-${color}-500 dark:border-${color}-400 bg-${color}-50 dark:bg-${color}-900/20`
          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] opacity-60 hover:opacity-100'
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              scenario.id === 'optimistic' && 'bg-emerald-500',
              scenario.id === 'conservative' && 'bg-blue-500',
              scenario.id === 'pessimistic' && 'bg-red-500'
            )}
          />
          <h4 className="font-medium text-neutral-900 dark:text-white text-sm">
            {scenario.name}
          </h4>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            scenario.id === 'optimistic' && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
            scenario.id === 'conservative' && 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
            scenario.id === 'pessimistic' && 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
          )}
        >
          {(scenario.probability * 100).toFixed(0)}%
        </span>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">
        {scenario.description}
      </p>

      <div className="mb-3">
        <p className="text-lg font-bold text-neutral-900 dark:text-white">
          {formatValue(endValue, unit)}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Valor proyectado final</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Supuestos:</p>
        <ul className="space-y-1">
          {scenario.assumptions.slice(0, 3).map((assumption, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <CheckCircle className="w-3 h-3 shrink-0 mt-0.5 text-neutral-400" weight="fill" />
              {assumption}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/**
 * Forecast details table
 */
function ForecastDetailsTable({ data, unit }: { data: ForecastDataPoint[]; unit: string }) {
  return (
    <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
        Detalles de Proyeccion
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <th className="text-left p-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Mes
              </th>
              <th className="text-right p-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Prediccion
              </th>
              <th className="text-right p-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Lim. Inferior
              </th>
              <th className="text-right p-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Lim. Superior
              </th>
              <th className="text-right p-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Confianza
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
              >
                <td className="p-2 text-sm font-medium text-neutral-900 dark:text-white">
                  {new Date(point.date).toLocaleDateString('es-CO', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </td>
                <td className="p-2 text-sm text-right font-semibold text-neutral-900 dark:text-white">
                  {formatValue(point.predicted, unit)}
                </td>
                <td className="p-2 text-sm text-right text-neutral-500 dark:text-neutral-400">
                  {formatValue(point.lowerBound, unit)}
                </td>
                <td className="p-2 text-sm text-right text-neutral-500 dark:text-neutral-400">
                  {formatValue(point.upperBound, unit)}
                </td>
                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${point.confidence * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className={cn(
                          'h-full rounded-full',
                          point.confidence >= 0.8
                            ? 'bg-emerald-500'
                            : point.confidence >= 0.6
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        )}
                      />
                    </div>
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 w-10">
                      {(point.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Factors panel
 */
function FactorsPanel({
  factors,
}: {
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }[];
}) {
  return (
    <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-center gap-2 mb-4">
        <Funnel className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
          Factores de Influencia
        </h3>
      </div>

      <div className="space-y-3">
        {factors.map((factor, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div
              className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                factor.impact === 'positive' && 'bg-emerald-100 dark:bg-emerald-900/30',
                factor.impact === 'negative' && 'bg-red-100 dark:bg-red-900/30',
                factor.impact === 'neutral' && 'bg-neutral-100 dark:bg-neutral-800'
              )}
            >
              {factor.impact === 'positive' && (
                <TrendUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" weight="bold" />
              )}
              {factor.impact === 'negative' && (
                <TrendDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" weight="bold" />
              )}
              {factor.impact === 'neutral' && (
                <Minus className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" weight="bold" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {factor.name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${factor.weight * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={cn(
                    'h-full rounded-full',
                    factor.impact === 'positive' && 'bg-emerald-500',
                    factor.impact === 'negative' && 'bg-red-500',
                    factor.impact === 'neutral' && 'bg-neutral-500'
                  )}
                />
              </div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 w-8">
                {(factor.weight * 100).toFixed(0)}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * AnalyticsForecasting - Forecasting component with scenarios and confidence intervals
 */
export function AnalyticsForecasting({
  data,
  selectedMetric,
  horizon = 6,
  onMetricChange,
  onHorizonChange,
  onExport,
  className,
}: AnalyticsForecastingProps) {
  const [activeMetric, setActiveMetric] = useState(selectedMetric || data[0]?.metricId || 'revenue');
  const [activeHorizon, setActiveHorizon] = useState(horizon);
  const [activeScenarios, setActiveScenarios] = useState<string[]>(['conservative']);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);

  const currentForecast = useMemo(() => {
    return data.find((d) => d.metricId === activeMetric) || data[0];
  }, [data, activeMetric]);

  const handleMetricChange = (metricId: string) => {
    setActiveMetric(metricId);
    onMetricChange?.(metricId);
    setIsMetricDropdownOpen(false);
  };

  const handleHorizonChange = (months: number) => {
    setActiveHorizon(months);
    onHorizonChange?.(months);
  };

  const toggleScenario = (scenarioId: string) => {
    setActiveScenarios((prev) =>
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  if (!currentForecast) {
    return (
      <div className={cn('p-6 text-center text-neutral-500', className)}>
        No hay datos de proyeccion disponibles
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <ChartLineUp className="w-5 h-5 text-purple-600 dark:text-purple-400" weight="bold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Proyecciones</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Prediccion con intervalos de confianza
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric Selector */}
          <div className="relative">
            <button
              onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {currentForecast.metricLabel}
              <CaretDown
                className={cn('w-4 h-4 transition-transform', isMetricDropdownOpen && 'rotate-180')}
              />
            </button>

            <AnimatePresence>
              {isMetricDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-lg z-10 overflow-hidden"
                >
                  {data.map((item) => (
                    <button
                      key={item.metricId}
                      onClick={() => handleMetricChange(item.metricId)}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-sm transition-colors',
                        activeMetric === item.metricId
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      )}
                    >
                      {item.metricLabel}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
            {[3, 6, 12].map((months) => (
              <button
                key={months}
                onClick={() => handleHorizonChange(months)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  activeHorizon === months
                    ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                {months}M
              </button>
            ))}
          </div>

          {/* Export Button */}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Export className="w-4 h-4" />
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Main Chart */}
      <ForecastChart
        forecast={currentForecast}
        activeScenarios={activeScenarios}
        horizon={activeHorizon}
      />

      {/* Scenario Cards */}
      {currentForecast.scenarios.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
            Escenarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentForecast.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={activeScenarios.includes(scenario.id)}
                onToggle={() => toggleScenario(scenario.id)}
                unit={currentForecast.unit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Table */}
        <div className="lg:col-span-2">
          <ForecastDetailsTable
            data={currentForecast.baseline.slice(0, activeHorizon)}
            unit={currentForecast.unit}
          />
        </div>

        {/* Factors Panel */}
        <div>
          <FactorsPanel factors={currentForecast.factors} />
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-end gap-2 text-xs text-neutral-400 dark:text-neutral-500">
        <ArrowsClockwise className="w-3.5 h-3.5" />
        Ultima actualizacion:{' '}
        {new Date(currentForecast.lastUpdated).toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

export default AnalyticsForecasting;