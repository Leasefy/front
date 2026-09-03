'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PageGuard } from '@/components/auth/PageGuard';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SegmentedControl } from '@leasefy/cadence';
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
  // Tiles/borders = neutral (blue is actionable-only); progress bars keep brand tones (data).
  const colorConfig = {
    indigo: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      icon: 'text-neutral-600 dark:text-neutral-300',
      border: 'border-neutral-200 dark:border-neutral-700',
      progress: 'bg-primary',
      progressBg: 'bg-primary-soft',
    },
    emerald: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      icon: 'text-neutral-600 dark:text-neutral-300',
      border: 'border-neutral-200 dark:border-neutral-700',
      progress: 'bg-success',
      progressBg: 'bg-success-soft',
    },
    amber: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      icon: 'text-neutral-600 dark:text-neutral-300',
      border: 'border-neutral-200 dark:border-neutral-700',
      progress: 'bg-warning',
      progressBg: 'bg-warning-soft',
    },
    violet: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      icon: 'text-neutral-600 dark:text-neutral-300',
      border: 'border-neutral-200 dark:border-neutral-700',
      progress: 'bg-primary',
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
        'w-full p-5 rounded-lg border bg-card text-left transition-all',
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
          <Badge
            variant={trendIsPositive ? 'success' : trendIsNegative ? 'destructive' : 'secondary'}
          >
            {trendIsPositive && <TrendUp className="w-3 h-3" weight="bold" />}
            {trendIsNegative && <TrendDown className="w-3 h-3" weight="bold" />}
            {!trendIsPositive && !trendIsNegative && <Minus className="w-3 h-3" />}
            <span>{trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%</span>
          </Badge>
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
          <Progress
            value={Math.min(100, (target.current / target.value) * 100)}
            variant={accentColor === 'emerald' ? 'success' : accentColor === 'amber' ? 'warning' : 'default'}
            size="xs"
          />
        </div>
      )}
    </motion.button>
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
  // `errorCrudo`, no el mensaje: `FalloDeCarga` clasifica por status.
  const {
    metrics,
    isLoading: loadingMetrics,
    errorCrudo: metricsError,
    refetch: recargarMetricas,
  } = useAiMetrics();
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

  /*
   * ── Los «insights» salieron ────────────────────────────────────────────
   *
   * Eran tres tarjetas fijas leídas de i18n. No miraban un solo dato:
   *
   *   «La ocupación subió 2.1% respecto al mes anterior»
   *   «3 propiedades sin arrendar · Llevan más de 45 días disponibles»
   *   «Estás al 94% de tu meta mensual de recaudo»
   *
   * Se le mostraban idénticas a cualquier inmobiliaria. En la agencia de
   * pruebas —1 inmueble, $0 de recaudo, sin meta configurada— las tres eran
   * falsas al mismo tiempo, arriba de unos KPI que decían 0. Y «Ver
   * propiedades» abría un toast con su propia etiqueta: un botón que no lleva
   * a ningún lado.
   *
   * Un insight que no se calcula de los datos no es un insight: es decoración
   * que afirma cosas. Cuando el back exponga tendencia de ocupación, días en
   * mercado y meta de recaudo, esto vuelve — calculado.
   */

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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-neutral-600 dark:text-neutral-300" weight="duotone" />
            </div>
            {t('inmobiliaria.analytics.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.analytics.subtitle')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Date Range */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <Button variant="secondary" size="sm" hideArrow className="gap-2">
                <CalendarBlank className="w-4 h-4 text-muted-foreground" />
                <span className="hidden sm:inline">
                  {DATE_RANGES.find((r) => r.id === dateRange)?.label}
                </span>
                <CaretDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
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
              <Button size="sm" hideArrow className="gap-2">
                <Export className="w-4 h-4" />
                <span className="hidden sm:inline">{t('inmobiliaria.common.export')}</span>
              </Button>
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

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {/* View Tabs */}
        <div className="m-4 mb-0 w-fit">
          <SegmentedControl<AnalyticsView>
            value={activeView}
            onChange={setActiveView}
            options={VIEWS.map((view) => {
              const Icon = view.icon;
              return {
                value: view.id,
                ariaLabel: view.label,
                label: (
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {view.label}
                  </span>
                ),
              };
            })}
          />
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
                  {/* Antes acá salía `Unauthorized` en rojo: el mensaje crudo
                      del backend, en inglés, suelto en el medio de la tarjeta,
                      sin decir qué hacer. `FalloDeCarga` lo clasifica y ofrece
                      reintentar cuando reintentar sirve. */}
                  {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
                  {!isLoading && Boolean(analyticsError) && (
                    <FalloDeCarga
                      error={analyticsError}
                      queEs="las métricas del asistente"
                      onReintentar={() => void recargarMetricas()}
                      enmarcado={false}
                    />
                  )}
                  {!analyticsError && analyticsData && <AnalyticsDashboard data={analyticsData} />}
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
