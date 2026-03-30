'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChartLineUp,
  ChartBar,
  TrendUp,
  TrendDown,
  Minus,
  Export,
  CalendarBlank,
  CaretDown,
  CaretRight,
  Buildings,
  CurrencyDollar,
  Percent,
  Lightning,
  Target,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  AnalyticsDashboard,
  AnalyticsTrends,
  AnalyticsForecasting,
} from '@/components/inmobiliaria';
import {
  useAnalyticsData,
  useTrendAnalysis,
  useForecastData,
} from '@/lib/hooks/useInmobiliaria';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Types
// ============================================================================

type AnalyticsView = 'dashboard' | 'trends' | 'forecasting';
type DateRange = '7d' | '30d' | '90d' | '1y';

interface ViewConfig {
  id: AnalyticsView;
  label: string;
  icon: React.ElementType;
}

// ============================================================================
// Constants
// ============================================================================

// VIEWS and DATE_RANGES moved inside component for i18n support

// ============================================================================
// Hero KPI Card Component
// ============================================================================

interface HeroKPIProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage: number };
  target?: { value: number; current: number; label: string };
  sparkline?: number[];
  accentColor: 'indigo' | 'emerald' | 'amber' | 'violet';
  onClick?: () => void;
}

function HeroKPICard({
  icon: Icon,
  label,
  value,
  trend,
  target,
  sparkline,
  accentColor,
  onClick,
}: HeroKPIProps) {
  const colorConfig = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      icon: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-800/50',
      progress: 'bg-indigo-600',
      progressBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-800/50',
      progress: 'bg-emerald-500',
      progressBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-800/50',
      progress: 'bg-amber-500',
      progressBg: 'bg-amber-100 dark:bg-amber-900/40',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      icon: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-100 dark:border-violet-800/50',
      progress: 'bg-violet-500',
      progressBg: 'bg-violet-100 dark:bg-violet-900/40',
    },
  };

  const colors = colorConfig[accentColor];

  // Generate sparkline path
  const sparklinePath = useMemo(() => {
    if (!sparkline || sparkline.length < 2) return null;
    const width = 80;
    const height = 24;
    const padding = 2;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;

    const points = sparkline.map((val, i) => {
      const x = padding + (i / (sparkline.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [sparkline]);

  const trendIsPositive = trend?.direction === 'up';
  const trendIsNegative = trend?.direction === 'down';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full p-5 rounded-xl border bg-card text-left transition-all hover:shadow-lg',
        colors.border
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} weight="duotone" />
        </div>
        {sparkline && sparklinePath && (
          <svg width={80} height={24} className="opacity-60">
            <path
              d={sparklinePath}
              fill="none"
              stroke={trendIsPositive ? '#10B981' : trendIsNegative ? '#EF4444' : '#6B7280'}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-sm text-muted-foreground mb-3">{label}</p>

      {/* Trend & Target */}
      <div className="flex items-center justify-between">
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              trendIsPositive && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
              trendIsNegative && 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
              !trendIsPositive && !trendIsNegative && 'bg-muted text-muted-foreground'
            )}
          >
            {trendIsPositive && <TrendUp className="w-3 h-3" weight="bold" />}
            {trendIsNegative && <TrendDown className="w-3 h-3" weight="bold" />}
            {!trendIsPositive && !trendIsNegative && <Minus className="w-3 h-3" />}
            <span>{trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%</span>
          </div>
        )}
        {target && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="w-3.5 h-3.5" />
            <span>{Math.round((target.current / target.value) * 100)}% {target.label}</span>
          </div>
        )}
      </div>

      {/* Target Progress Bar */}
      {target && (
        <div className="mt-3">
          <div className={cn('h-1.5 rounded-full overflow-hidden', colors.progressBg)}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (target.current / target.value) * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', colors.progress)}
            />
          </div>
        </div>
      )}
    </motion.button>
  );
}

// ============================================================================
// Quick Insight Card
// ============================================================================

interface InsightProps {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

function InsightCard({ type, title, description, action }: InsightProps) {
  const config = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      icon: CheckCircle,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/50',
      icon: WarningCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-200 dark:border-indigo-800/50',
      icon: Lightning,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  };

  const { bg, border, icon: Icon, iconColor } = config[type];

  return (
    <div className={cn('p-4 rounded-xl border', bg, border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColor)} weight="fill" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {action.label}
              <CaretRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// TODO: Backend - Implementar actualizaciones en tiempo real via WebSocket o SSE
// Las métricas deben actualizarse automáticamente sin necesidad de refresh manual

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<AnalyticsView>('dashboard');
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  // API hooks
  const { analyticsData, isLoading: loadingAnalytics, error: analyticsError } = useAnalyticsData(dateRange);
  const { trends, isLoading: loadingTrends, error: trendsError } = useTrendAnalysis();
  const { forecasts, isLoading: loadingForecasts, error: forecastsError } = useForecastData();

  const VIEWS: ViewConfig[] = useMemo(() => [
    { id: 'dashboard', label: t('inmobiliaria.analytics.tabs.dashboard'), icon: ChartBar },
    { id: 'trends', label: t('inmobiliaria.analytics.tabs.trends'), icon: ChartLineUp },
    { id: 'forecasting', label: t('inmobiliaria.analytics.tabs.forecasting'), icon: TrendUp },
  ], [t]);

  const DATE_RANGES = useMemo(() => [
    { id: '7d' as const, label: t('inmobiliaria.analytics.dateRanges.7d') },
    { id: '30d' as const, label: t('inmobiliaria.analytics.dateRanges.30d') },
    { id: '90d' as const, label: t('inmobiliaria.analytics.dateRanges.90d') },
    { id: '1y' as const, label: t('inmobiliaria.analytics.dateRanges.1y') },
  ], [t]);

  // Hero KPI data
  const heroKPIs = useMemo(() => {
    if (!analyticsData) {
      return {
        revenue: { value: '$0', trend: undefined, sparkline: [] },
        occupancy: { value: '0%', trend: undefined, target: undefined, sparkline: [] },
        collection: { value: '0%', trend: undefined, target: undefined },
        properties: { value: '0', trend: undefined },
      };
    }

    const getKpi = (id: string) => analyticsData.kpis.find((k) => k.id === id);

    const revenue = getKpi('kpi-revenue');
    const occupancy = getKpi('kpi-occupancy');
    const collection = getKpi('kpi-collection-rate');
    const properties = getKpi('kpi-properties');

    return {
      revenue: {
        value: revenue?.formattedValue || '$0',
        trend: revenue?.trend,
        sparkline: revenue?.sparkline?.map((s) => s.value) || [],
      },
      occupancy: {
        value: occupancy?.formattedValue || '0%',
        trend: occupancy?.trend,
        target: occupancy?.target ? { value: occupancy.target, current: occupancy.value, label: t('inmobiliaria.analytics.kpi.target') } : undefined,
        sparkline: occupancy?.sparkline?.map((s) => s.value) || [],
      },
      collection: {
        value: collection?.formattedValue || '0%',
        trend: collection?.trend,
        target: collection?.target ? { value: collection.target, current: collection.value, label: t('inmobiliaria.analytics.kpi.target') } : undefined,
      },
      properties: {
        value: properties?.formattedValue || '0',
        trend: properties?.trend,
      },
    };
  }, [analyticsData, t]);

  // Insights
  const insights = useMemo(() => [
    {
      type: 'success' as const,
      title: t('inmobiliaria.analytics.insights.occupancyUp'),
      description: t('inmobiliaria.analytics.insights.occupancyUpDesc'),
    },
    {
      type: 'warning' as const,
      title: t('inmobiliaria.analytics.insights.unrentedProperties'),
      description: t('inmobiliaria.analytics.insights.unrentedPropertiesDesc'),
      action: { label: t('inmobiliaria.analytics.insights.viewProperties'), onClick: () => toast.info(t('inmobiliaria.analytics.insights.viewProperties')) },
    },
    {
      type: 'info' as const,
      title: t('inmobiliaria.analytics.insights.collectionGoalNear'),
      description: t('inmobiliaria.analytics.insights.collectionGoalNearDesc'),
    },
  ], [t]);

  // Handlers
  const handleExport = useCallback(async (format: 'pdf' | 'excel') => {
    toast.success(t('inmobiliaria.analytics.toasts.exporting', { format: format.toUpperCase() }));
  }, [t]);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
    toast.info(t('inmobiliaria.analytics.toasts.periodUpdated'), {
      description: DATE_RANGES.find((r) => r.id === range)?.label,
    });
  }, [DATE_RANGES, t]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {t('inmobiliaria.analytics.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('inmobiliaria.analytics.subtitle')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Date Range */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
                <CalendarBlank className="w-4 h-4 text-muted-foreground" />
                <span className="hidden sm:inline">
                  {DATE_RANGES.find((r) => r.id === dateRange)?.label}
                </span>
                <CaretDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-44">
              {DATE_RANGES.map((range) => (
                <DropdownListItem
                  key={range.id}
                  onSelect={() => handleDateRangeChange(range.id)}
                  className={cn(dateRange === range.id && 'bg-muted')}
                >
                  {range.label}
                </DropdownListItem>
              ))}
            </DropdownListContent>
          </DropdownList>

          {/* Export */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white uppercase tracking-wide font-mono hover:bg-indigo-700 text-sm font-medium transition-colors">
                <Export className="w-4 h-4" />
                <span className="hidden sm:inline">{t('inmobiliaria.common.export')}</span>
              </button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-44">
              <DropdownListItem onSelect={() => handleExport('pdf')}>
                {t('inmobiliaria.analytics.exportPdf')}
              </DropdownListItem>
              <DropdownListItem onSelect={() => handleExport('excel')}>
                {t('inmobiliaria.analytics.exportExcel')}
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        </div>
      </div>

      {/* Hero KPIs - Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <HeroKPICard
          icon={CurrencyDollar}
          label={t('inmobiliaria.analytics.kpi.totalRevenue')}
          value={heroKPIs.revenue.value}
          trend={heroKPIs.revenue.trend}
          sparkline={heroKPIs.revenue.sparkline}
          accentColor="indigo"
        />
        <HeroKPICard
          icon={Percent}
          label={t('inmobiliaria.analytics.kpi.occupancyRate')}
          value={heroKPIs.occupancy.value}
          trend={heroKPIs.occupancy.trend}
          target={heroKPIs.occupancy.target}
          sparkline={heroKPIs.occupancy.sparkline}
          accentColor="emerald"
        />
        <HeroKPICard
          icon={CurrencyDollar}
          label={t('inmobiliaria.analytics.kpi.collectionRate')}
          value={heroKPIs.collection.value}
          trend={heroKPIs.collection.trend}
          target={heroKPIs.collection.target}
          accentColor="amber"
        />
        <HeroKPICard
          icon={Buildings}
          label={t('inmobiliaria.analytics.kpi.activeProperties')}
          value={heroKPIs.properties.value}
          trend={heroKPIs.properties.trend}
          accentColor="violet"
        />
      </motion.div>

      {/* Quick Insights */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {insights.map((insight, i) => (
          <InsightCard key={i} {...insight} />
        ))}
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1.5 m-4 mb-0 rounded-xl bg-muted w-fit">
          {VIEWS.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {view.label}
              </button>
            );
          })}
        </div>

        {/* View Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && (
                <>
                  {loadingAnalytics && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
                  {analyticsError && <p className="text-sm text-rose-600">{analyticsError}</p>}
                  {analyticsData && <AnalyticsDashboard data={analyticsData} />}
                </>
              )}

              {activeView === 'trends' && (
                <>
                  {loadingTrends && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
                  {trendsError && <p className="text-sm text-rose-600">{trendsError}</p>}
                  {trends && <AnalyticsTrends data={trends} />}
                </>
              )}

              {activeView === 'forecasting' && (
                <>
                  {loadingForecasts && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
                  {forecastsError && <p className="text-sm text-rose-600">{forecastsError}</p>}
                  {forecasts && (
                    <AnalyticsForecasting
                      data={forecasts}
                      onExport={() => toast.success(t('inmobiliaria.analytics.toasts.exportingForecasts'))}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
