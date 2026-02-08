'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChartLineUp,
  ChartBar,
  TrendUp,
  ArrowsClockwise,
  Export,
  CalendarBlank,
  CaretDown,
  Buildings,
  CurrencyDollar,
  Users,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  AnalyticsDashboard,
  AnalyticsKPICards,
  AnalyticsTrends,
  AnalyticsForecasting,
} from '@/components/inmobiliaria';
import {
  MOCK_ANALYTICS_DATA,
  MOCK_TREND_ANALYSIS,
  MOCK_FORECAST_DATA,
} from '@/lib/data/mock-inmobiliaria';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdvancedKPI } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

type AnalyticsView = 'dashboard' | 'trends' | 'forecasting';
type ExportFormat = 'pdf' | 'excel';
type DateRange = '7d' | '30d' | '90d' | '1y';

interface ViewConfig {
  id: AnalyticsView;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const VIEWS: ViewConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ChartBar,
    description: 'Metricas clave y KPIs',
  },
  {
    id: 'trends',
    label: 'Tendencias',
    icon: ChartLineUp,
    description: 'Analisis de tendencias',
  },
  {
    id: 'forecasting',
    label: 'Proyecciones',
    icon: TrendUp,
    description: 'Proyecciones futuras',
  },
];

const DATE_RANGES = [
  { id: '7d', label: 'Ultimos 7 dias' },
  { id: '30d', label: 'Ultimos 30 dias' },
  { id: '90d', label: 'Ultimos 90 dias' },
  { id: '1y', label: 'Ultimo ano' },
] as const;

// ============================================================================
// Stat Card Component
// ============================================================================

interface QuickStatProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: number;
  bgColor: string;
  iconColor: string;
}

function QuickStat({ icon: Icon, label, value, trend, bgColor, iconColor }: QuickStatProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {trend !== undefined && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AnalyticsPage - Advanced analytics hub
 * Route: /panel/inmobiliaria/analytics
 */
export default function AnalyticsPage() {
  // State
  const [activeView, setActiveView] = useState<AnalyticsView>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isExporting, setIsExporting] = useState(false);

  // Quick stats from analytics data
  const quickStats = useMemo(() => {
    const data = MOCK_ANALYTICS_DATA;
    const getKpiValue = (id: string) => data.kpis.find((k) => k.id === id)?.value || 0;
    const getKpiTrendPercent = (id: string) => {
      const kpi = data.kpis.find((k) => k.id === id);
      return kpi?.trend?.percentage || 0;
    };

    return {
      totalProperties: getKpiValue('total_properties'),
      occupancyRate: getKpiValue('occupancy_rate'),
      monthlyRevenue: getKpiValue('monthly_revenue'),
      activeAgents: getKpiValue('active_agents'),
      revenueTrend: getKpiTrendPercent('monthly_revenue'),
      occupancyTrend: getKpiTrendPercent('occupancy_rate'),
    };
  }, []);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    toast.success('Datos actualizados', {
      description: 'La informacion ha sido actualizada',
    });
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsExporting(false);

    const formatLabels = {
      pdf: 'PDF',
      excel: 'Excel',
    };

    toast.success(`Exportando a ${formatLabels[format]}`, {
      description: 'El archivo se descargara en breve',
    });
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
    toast.info('Rango actualizado', {
      description: DATE_RANGES.find((r) => r.id === range)?.label,
    });
  }, []);

  const handleKPIClick = useCallback((kpi: AdvancedKPI) => {
    toast.info('Detalle de metrica', {
      description: `Abriendo analisis detallado de ${kpi.label}`,
    });
  }, []);

  const handleExportDashboard = useCallback((format: 'pdf' | 'excel') => {
    toast.success(`Exportando dashboard a ${format.toUpperCase()}`);
  }, []);

  const handleForecastExport = useCallback(() => {
    toast.success('Exportando proyecciones');
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Analitica
          </h1>
          <p className="text-muted-foreground mt-2">
            Metricas avanzadas, tendencias y proyecciones
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
                <CalendarBlank className="w-4 h-4" />
                {DATE_RANGES.find((r) => r.id === dateRange)?.label}
                <CaretDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-48">
              {DATE_RANGES.map((range) => (
                <DropdownListItem
                  key={range.id}
                  onClick={() => handleDateRangeChange(range.id)}
                  className={cn(dateRange === range.id && 'bg-muted')}
                >
                  {range.label}
                </DropdownListItem>
              ))}
            </DropdownListContent>
          </DropdownList>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium transition-colors',
              isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
            )}
          >
            <ArrowsClockwise className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Export */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <button
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 font-medium shadow-lg shadow-indigo-500/20 transition-colors disabled:opacity-50"
              >
                <Export className="w-5 h-5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-48">
              <DropdownListItem onClick={() => handleExport('pdf')}>
                Exportar como PDF
              </DropdownListItem>
              <DropdownListItem onClick={() => handleExport('excel')}>
                Exportar como Excel
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <QuickStat
          icon={Buildings}
          label="Propiedades"
          value={String(quickStats.totalProperties)}
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <QuickStat
          icon={Percent}
          label="Ocupacion"
          value={`${quickStats.occupancyRate}%`}
          trend={quickStats.occupancyTrend}
          bgColor="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <QuickStat
          icon={CurrencyDollar}
          label="Ingresos/mes"
          value={`$${(quickStats.monthlyRevenue / 1000000).toFixed(1)}M`}
          trend={quickStats.revenueTrend}
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <QuickStat
          icon={Users}
          label="Agentes activos"
          value={String(quickStats.activeAgents)}
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
        />
      </motion.div>

      {/* View Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {VIEWS.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive && 'text-emerald-600 dark:text-emerald-400')} />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* View Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[500px]"
        >
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <AnalyticsKPICards
                kpis={MOCK_ANALYTICS_DATA.kpis}
                onKPIClick={handleKPIClick}
              />
              <AnalyticsDashboard
                data={MOCK_ANALYTICS_DATA}
                onExport={handleExportDashboard}
                isLoading={isRefreshing}
              />
            </div>
          )}

          {/* Trends View */}
          {activeView === 'trends' && (
            <AnalyticsTrends data={MOCK_TREND_ANALYSIS} />
          )}

          {/* Forecasting View */}
          {activeView === 'forecasting' && (
            <AnalyticsForecasting
              data={MOCK_FORECAST_DATA}
              onExport={handleForecastExport}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
