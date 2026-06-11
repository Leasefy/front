'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PageGuard } from '@/components/auth/PageGuard';
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
  Percent,
  Lightning,
  Target,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  AnalyticsDashboard,
} from '@/components/inmobiliaria';
import {
  useAiMetrics,
  useAiActivity,
} from '@/lib/hooks/useInmobiliaria';
import type { AiMetricsResponse } from '@/lib/api/inmobiliaria.service';
import type { AnalyticsData } from '@/lib/types/inmobiliaria';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Types
// ============================================================================

type AnalyticsView = 'dashboard';
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
      bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
      icon: 'text-[#1A40FF] dark:text-[#5570FF]',
      border: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40',
      progress: 'bg-[#1A40FF]',
      progressBg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    },
    emerald: {
      bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
      icon: 'text-[#2C7A53] dark:text-[#3EAE70]',
      border: 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
      progress: 'bg-[#2C7A53]',
      progressBg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    },
    amber: {
      bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
      icon: 'text-[#B7791F] dark:text-[#D2992F]',
      border: 'border-[#B7791F]/30 dark:border-[#B7791F]/40',
      progress: 'bg-[#B7791F]',
      progressBg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    },
    violet: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      icon: 'text-neutral-600 dark:text-neutral-300',
      border: 'border-neutral-200 dark:border-neutral-700',
      progress: 'bg-neutral-100 dark:bg-neutral-800',
      progressBg: 'bg-neutral-100 dark:bg-neutral-800',
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
        'w-full p-5 rounded-xl border bg-card text-left transition-all hover:',
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
              stroke={trendIsPositive ? '#2C7A53' : trendIsNegative ? '#C4503B' : '#1A40FF'}
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
              trendIsPositive && 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]',
              trendIsNegative && 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D]',
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
      bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
      border: 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
      icon: CheckCircle,
      iconColor: 'text-[#2C7A53] dark:text-[#3EAE70]',
    },
    warning: {
      bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
      border: 'border-[#B7791F]/30 dark:border-[#B7791F]/40',
      icon: WarningCircle,
      iconColor: 'text-[#B7791F] dark:text-[#D2992F]',
    },
    info: {
      bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
      border: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40',
      icon: Lightning,
      iconColor: 'text-[#1A40FF] dark:text-[#5570FF]',
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
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#1A40FF] dark:text-[#5570FF] hover:underline"
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

// ============================================================================
// AI metrics helpers
// ============================================================================

function parsePercentage(s: string): number {
  return parseFloat(s.replace('%', '')) || 0;
}

function parseNumber(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
}

function metricsToAnalyticsData(metrics: AiMetricsResponse): AnalyticsData {
  const stable = { direction: 'stable' as const, percentage: 0, previousValue: 0, currentValue: 0 };
  const up = { direction: 'up' as const, percentage: 0, previousValue: 0, currentValue: 0 };

  return {
    lastUpdated: new Date().toISOString(),
    charts: [],
    kpis: [
      {
        id: 'ai-evaluations',
        label: 'Evaluaciones este mes',
        value: metrics.scoring.evaluationsThisMonth,
        formattedValue: String(metrics.scoring.evaluationsThisMonth),
        trend: stable,
        sparkline: [],
        category: 'operational',
      },
      {
        id: 'ai-avg-time',
        label: 'Tiempo promedio',
        value: parseNumber(metrics.scoring.avgTimeMin),
        formattedValue: metrics.scoring.avgTimeMin,
        trend: stable,
        sparkline: [],
        category: 'operational',
        target: 3,
        targetLabel: 'Meta: < 3 min',
      },
      {
        id: 'ai-escalation',
        label: 'Tasa de escalación',
        value: parsePercentage(metrics.scoring.escalationRate),
        formattedValue: metrics.scoring.escalationRate,
        trend: stable,
        sparkline: [],
        category: 'performance',
        target: 10,
        targetLabel: 'Meta: < 10%',
      },
      {
        id: 'ai-accuracy',
        label: 'Tasa de precisión',
        value: parsePercentage(metrics.scoring.accuracyRate),
        formattedValue: metrics.scoring.accuracyRate,
        trend: stable,
        sparkline: [],
        category: 'performance',
        target: 95,
        targetLabel: 'Meta: 95%',
      },
      {
        id: 'ai-actions-week',
        label: 'Acciones esta semana',
        value: metrics.summary.actionsThisWeek,
        formattedValue: String(metrics.summary.actionsThisWeek),
        trend: stable,
        sparkline: [],
        category: 'operational',
      },
      {
        id: 'ai-hours-saved',
        label: 'Horas ahorradas',
        value: parseNumber(metrics.summary.hoursSavedThisMonth),
        formattedValue: metrics.summary.hoursSavedThisMonth,
        trend: up,
        sparkline: [],
        category: 'performance',
      },
    ],
  };
}

// TODO: Backend - Implementar actualizaciones en tiempo real via WebSocket o SSE
// Las métricas deben actualizarse automáticamente sin necesidad de refresh manual

function AnalyticsContent() {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<AnalyticsView>('dashboard');
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  // API hooks — PageGuard guarantees this only mounts when analytics:view is granted
  const { metrics, isLoading: loadingMetrics, error: metricsError } = useAiMetrics();
  const { isLoading: loadingActivity } = useAiActivity(20);

  const isLoading = loadingMetrics || loadingActivity;
  const analyticsError = metricsError;

  // Map AI metrics → AnalyticsData for AnalyticsDashboard
  const analyticsData = useMemo<AnalyticsData | null>(() => {
    if (!metrics) return null;
    return metricsToAnalyticsData(metrics);
  }, [metrics]);

  const VIEWS: ViewConfig[] = useMemo(() => [
    { id: 'dashboard' as const, label: t('inmobiliaria.analytics.tabs.dashboard'), icon: ChartBar },
  ], [t]);

  const DATE_RANGES = useMemo(() => [
    { id: '7d' as const, label: t('inmobiliaria.analytics.dateRanges.7d') },
    { id: '30d' as const, label: t('inmobiliaria.analytics.dateRanges.30d') },
    { id: '90d' as const, label: t('inmobiliaria.analytics.dateRanges.90d') },
    { id: '1y' as const, label: t('inmobiliaria.analytics.dateRanges.1y') },
  ], [t]);

  // Hero KPI data from AI metrics
  const heroKPIs = useMemo(() => {
    if (!metrics) {
      return {
        evaluations: { value: '—' },
        accuracy: { value: '—', target: undefined },
        escalation: { value: '—', target: undefined },
        hoursSaved: { value: '—' },
      };
    }
    return {
      evaluations: { value: String(metrics.scoring.evaluationsThisMonth) },
      accuracy: {
        value: metrics.scoring.accuracyRate,
        target: { value: 95, current: parsePercentage(metrics.scoring.accuracyRate), label: t('inmobiliaria.analytics.kpi.target') },
      },
      escalation: {
        value: metrics.scoring.escalationRate,
        target: { value: 10, current: parsePercentage(metrics.scoring.escalationRate), label: t('inmobiliaria.analytics.kpi.target') },
      },
      hoursSaved: { value: metrics.summary.hoursSavedThisMonth },
    };
  }, [metrics, t]);

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
            <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
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
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A40FF] text-white hover:opacity-90 text-sm font-medium transition-colors">
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
          icon={Lightning}
          label="Evaluaciones este mes"
          value={heroKPIs.evaluations.value}
          accentColor="indigo"
        />
        <HeroKPICard
          icon={Target}
          label="Tasa de precisión"
          value={heroKPIs.accuracy.value}
          target={heroKPIs.accuracy.target}
          accentColor="emerald"
        />
        <HeroKPICard
          icon={Percent}
          label="Tasa de escalación"
          value={heroKPIs.escalation.value}
          target={heroKPIs.escalation.target}
          accentColor="amber"
        />
        <HeroKPICard
          icon={ChartLineUp}
          label="Horas ahorradas este mes"
          value={heroKPIs.hoursSaved.value}
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
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground'
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
                  {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
                  {analyticsError && <p className="text-sm text-[#C4503B]">{analyticsError}</p>}
                  {analyticsData && <AnalyticsDashboard data={analyticsData} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PageGuard module="analytics">
      <AnalyticsContent />
    </PageGuard>
  );
}
