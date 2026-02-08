'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowClockwise,
  Download,
  Funnel,
  X,
  Calendar,
  Buildings,
  MapPin,
  Users,
  ChartLine,
  ChartBar,
  ChartPie,
  ChartDonut,
  TrendUp,
  TrendDown,
  Lightning,
  WarningCircle,
  CheckCircle,
  Clock,
  CaretDown,
  FilePdf,
  FileXls,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AnalyticsKPICards } from './AnalyticsKPICards';
import type {
  AnalyticsData,
  AnalyticsFilters,
  AnalyticsChart,
  AnalyticsPeriod,
  AdvancedKPI,
} from '@/lib/types/inmobiliaria';
import { getPeriodLabel } from '@/lib/types/inmobiliaria';

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  onFilterChange?: (filters: AnalyticsFilters) => void;
  onRefresh?: () => void;
  onExport?: (format: 'pdf' | 'excel') => void;
  isLoading?: boolean;
}

// Property types for filter
const PROPERTY_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'office', label: 'Oficina' },
];

// Zones for filter
const ZONES = [
  { value: 'all', label: 'Todas las zonas' },
  { value: 'zona-norte', label: 'Zona Norte' },
  { value: 'chapinero', label: 'Chapinero' },
  { value: 'usaquen', label: 'Usaquen' },
  { value: 'el-poblado', label: 'El Poblado' },
  { value: 'zona-centro', label: 'Zona Centro' },
];

// Periods for filter
const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

// Chart type icons
const CHART_TYPE_ICONS: Record<AnalyticsChart['type'], React.ElementType> = {
  line: ChartLine,
  bar: ChartBar,
  area: ChartLine,
  pie: ChartPie,
  donut: ChartDonut,
};

// SVG Bar Chart component
function BarChart({ chart }: { chart: AnalyticsChart }) {
  const maxValue = Math.max(...chart.datasets.flatMap((d) => d.data));

  return (
    <div className="space-y-3">
      {chart.labels.map((label, idx) => (
        <div key={label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
            <span className="font-medium text-neutral-900 dark:text-white">
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

// SVG Area/Line Chart component
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
        {/* Grid lines */}
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

        {/* Datasets */}
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
              {/* Area fill for first dataset */}
              {dIdx === 0 && chart.type === 'area' && (
                <path d={areaPath} fill={dataset.color} fillOpacity={0.1} />
              )}
              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={dataset.color}
                strokeWidth={dataset.type === 'line' || dIdx > 0 ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dIdx > 0 ? '6 4' : undefined}
              />
              {/* Points */}
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

      {/* Labels */}
      <div className="flex justify-between text-xs text-neutral-500 px-5 -mt-2">
        {chart.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {chart.datasets.map((dataset) => (
          <div key={dataset.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dataset.color }} />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// SVG Donut Chart component
function DonutChart({ chart }: { chart: AnalyticsChart }) {
  const data = chart.datasets[0].data;
  const total = data.reduce((sum, val) => sum + val, 0);
  const colors = ['#10B981', '#FBBF24', '#F59E0B', '#EF4444', '#8B5CF6'];

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
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data[0]}%</p>
            <p className="text-xs text-neutral-500">Al dia</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="flex-1 text-sm text-neutral-600 dark:text-neutral-400">{segment.label}</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {segment.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Card component
function ChartCard({ chart }: { chart: AnalyticsChart }) {
  const ChartIcon = CHART_TYPE_ICONS[chart.type];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:shadow-lg transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-neutral-400" weight="duotone" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">{chart.title}</h3>
          </div>
          {chart.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{chart.description}</p>
          )}
        </div>
        <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
          {getPeriodLabel(chart.period)}
        </span>
      </div>

      {/* Chart content */}
      <div className="min-h-[160px]">
        {chart.type === 'bar' && <BarChart chart={chart} />}
        {(chart.type === 'area' || chart.type === 'line') && <AreaLineChart chart={chart} />}
        {(chart.type === 'donut' || chart.type === 'pie') && <DonutChart chart={chart} />}
      </div>
    </motion.div>
  );
}

// Quick Insights component
function QuickInsights({ kpis }: { kpis: AdvancedKPI[] }) {
  // Generate insights from KPI data
  const insights = useMemo(() => {
    const result: { type: 'positive' | 'negative' | 'neutral'; text: string; icon: React.ElementType }[] = [];

    kpis.forEach((kpi) => {
      if (kpi.id === 'kpi-occupancy' && kpi.trend.direction === 'up') {
        result.push({
          type: 'positive',
          text: `Ocupacion subio ${kpi.trend.percentage.toFixed(1)}% vs mes anterior`,
          icon: TrendUp,
        });
      }
      if (kpi.id === 'kpi-days-to-rent' && kpi.value < 20) {
        result.push({
          type: 'positive',
          text: `Tiempo promedio de arriendo: ${kpi.value} dias (excelente)`,
          icon: Clock,
        });
      }
      if (kpi.id === 'kpi-late-payments' && kpi.trend.direction === 'down') {
        result.push({
          type: 'positive',
          text: `Cartera vencida reducida en ${Math.abs(kpi.trend.percentage).toFixed(0)}%`,
          icon: CheckCircle,
        });
      }
      if (kpi.id === 'kpi-renewals' && kpi.target && kpi.value < kpi.target) {
        result.push({
          type: 'neutral',
          text: `Renovaciones al ${((kpi.value / kpi.target) * 100).toFixed(0)}% de la meta`,
          icon: Lightning,
        });
      }
    });

    // Add some static insights
    result.push({
      type: 'neutral',
      text: '3 propiedades sin arrendar por mas de 60 dias',
      icon: WarningCircle,
    });

    return result.slice(0, 4);
  }, [kpis]);

  return (
    <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-center gap-2 mb-4">
        <Lightning className="w-5 h-5 text-amber-500" weight="fill" />
        <h3 className="font-semibold text-neutral-900 dark:text-white">Insights Rapidos</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl',
                insight.type === 'positive' && 'bg-emerald-50 dark:bg-emerald-900/20',
                insight.type === 'negative' && 'bg-red-50 dark:bg-red-900/20',
                insight.type === 'neutral' && 'bg-amber-50 dark:bg-amber-900/20'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 mt-0.5',
                  insight.type === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                  insight.type === 'negative' && 'text-red-600 dark:text-red-400',
                  insight.type === 'neutral' && 'text-amber-600 dark:text-amber-400'
                )}
                weight="fill"
              />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{insight.text}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * AnalyticsDashboard - Advanced analytics dashboard with charts and trend indicators
 * Main dashboard component for viewing agency performance metrics
 */
export function AnalyticsDashboard({
  data,
  onFilterChange,
  onRefresh,
  onExport,
  isLoading = false,
}: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: 'month',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [kpiLayout, setKpiLayout] = useState<'grid' | 'compact'>('grid');

  // Handle filter changes
  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  // Format last updated time
  const lastUpdatedTime = useMemo(() => {
    return new Date(data.lastUpdated).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [data.lastUpdated]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Analitica</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Ultima actualizacion: {lastUpdatedTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <ArrowClockwise className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </Button>

          {/* Export dropdown */}
          <div className="relative group">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
              <CaretDown className="w-3.5 h-3.5" />
            </Button>
            <div className="absolute right-0 mt-2 w-40 py-2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => onExport?.('pdf')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <FilePdf className="w-4 h-4 text-red-500" />
                Exportar PDF
              </button>
              <button
                onClick={() => onExport?.('excel')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <FileXls className="w-4 h-4 text-green-500" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Filter toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Funnel className="w-4 h-4" />
            Filtros
            {Object.keys(filters).filter((k) => filters[k as keyof AnalyticsFilters] && k !== 'period').length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">
                {Object.keys(filters).filter((k) => filters[k as keyof AnalyticsFilters] && k !== 'period').length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex flex-wrap items-end gap-4">
                {/* Period */}
                <div className="w-40">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Periodo
                  </label>
                  <Select
                    value={filters.period}
                    onValueChange={(value) => handleFilterChange('period', value as AnalyticsPeriod)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zone */}
                <div className="w-44">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" />
                    Zona
                  </label>
                  <Select
                    value={filters.zone || 'all'}
                    onValueChange={(value) => handleFilterChange('zone', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map((zone) => (
                        <SelectItem key={zone.value} value={zone.value}>
                          {zone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type */}
                <div className="w-40">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    <Buildings className="w-3.5 h-3.5 inline mr-1" />
                    Tipo
                  </label>
                  <Select
                    value={filters.propertyType || 'all'}
                    onValueChange={(value) => handleFilterChange('propertyType', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear filters */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters({ period: 'month' });
                    onFilterChange?.({ period: 'month' });
                  }}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Indicadores Clave
        </h2>
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setKpiLayout('grid')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              kpiLayout === 'grid'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            Grid
          </button>
          <button
            onClick={() => setKpiLayout('compact')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              kpiLayout === 'compact'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            Compacto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <AnalyticsKPICards
        kpis={data.kpis}
        layout={kpiLayout}
        showSparklines={kpiLayout === 'grid'}
        showTargets={kpiLayout === 'grid'}
      />

      {/* Charts Section */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Graficos
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.charts.map((chart) => (
            <ChartCard key={chart.id} chart={chart} />
          ))}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* Additional metrics or summary could go here */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
              Resumen del Periodo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.kpis.filter((k) => k.trend.direction === 'up').length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Metricas subiendo</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {data.kpis.filter((k) => k.trend.direction === 'down').length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Metricas bajando</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.kpis.filter((k) => k.target && k.value >= k.target * 0.9).length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Cerca de meta</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {data.kpis.filter((k) => k.target && k.value >= k.target).length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Metas cumplidas</p>
              </div>
            </div>
          </div>
        </div>
        <QuickInsights kpis={data.kpis} />
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
