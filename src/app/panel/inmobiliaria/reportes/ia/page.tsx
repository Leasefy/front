'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { PageGuard } from '@/components/auth/PageGuard';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  ChartLineUp,
  ChartBar,
  TrendUp,
  TrendDown,
  Minus,
  Percent,
  Lightning,
  Target,
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
} from '@/lib/hooks/useInmobiliaria';
import type { AiMetricsResponse } from '@/lib/api/inmobiliaria.service';
import type { AnalyticsData } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

type AnalyticsView = 'dashboard';

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

  // Un `<button>` sin `onClick` es una trampa: tiene cursor de mano, se eleva
  // al pasar por encima, se hunde al hacer clic, entra en el recorrido del
  // teclado y un lector de pantalla lo anuncia como botón. Las cuatro tarjetas
  // de arriba nunca recibieron `onClick`. Si no hay a dónde ir, es un bloque.
  const Contenedor = onClick ? motion.button : motion.div;

  return (
    <Contenedor
      {...(onClick
        ? { onClick, whileHover: { y: -2 }, whileTap: { scale: 0.98 } }
        : {})}
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
    </Contenedor>
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

/**
 * Las métricas del agente, tal como llegan.
 *
 * 🔴 Sin `trend`. Antes cada tarjeta llevaba uno inventado —cinco `stable` con
 * 0 % y, en «Horas ahorradas», un `up` con 0 %— y la tarjeta lo pintaba como
 * insignia: una flecha verde de crecimiento sobre un delta que nadie midió.
 * `GET /inmobiliaria/ai/metrics` no devuelve el período anterior, así que no
 * hay tendencia que mostrar. `trend` es opcional y la tarjeta se calla.
 *
 * 🔴 Sin `target`. Las metas («< 3 min», «< 10 %», «95 %») eran constantes
 * escritas acá y se leían como objetivos de LA AGENCIA. Ninguna agencia las
 * configuró y no hay dónde configurarlas.
 */
function metricsToAnalyticsData(metrics: AiMetricsResponse): AnalyticsData {
  return {
    lastUpdated: new Date().toISOString(),
    charts: [],
    kpis: [
      {
        id: 'ai-evaluations',
        label: 'Evaluaciones este mes',
        value: metrics.scoring.evaluationsThisMonth,
        formattedValue: String(metrics.scoring.evaluationsThisMonth),
        sparkline: [],
        category: 'operational',
      },
      {
        id: 'ai-avg-time',
        label: 'Tiempo promedio',
        value: parseNumber(metrics.scoring.avgTimeMin),
        formattedValue: metrics.scoring.avgTimeMin,
        sparkline: [],
        category: 'operational',
      },
      {
        id: 'ai-escalation',
        label: 'Evaluaciones que fallaron',
        value: parsePercentage(metrics.scoring.escalationRate),
        formattedValue: metrics.scoring.escalationRate,
        sparkline: [],
        category: 'performance',
      },
      {
        id: 'ai-accuracy',
        label: 'Evaluaciones completadas',
        value: parsePercentage(metrics.scoring.accuracyRate),
        formattedValue: metrics.scoring.accuracyRate,
        sparkline: [],
        category: 'performance',
      },
      {
        id: 'ai-actions-week',
        label: 'Acciones esta semana',
        value: metrics.summary.actionsThisWeek,
        formattedValue: String(metrics.summary.actionsThisWeek),
        sparkline: [],
        category: 'operational',
      },
      {
        id: 'ai-hours-saved',
        label: 'Horas ahorradas (estimadas)',
        value: parseNumber(metrics.summary.hoursSavedThisMonth),
        formattedValue: metrics.summary.hoursSavedThisMonth,
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

  // API hooks — PageGuard guarantees this only mounts when analytics:view is granted
  // `errorCrudo`, no el mensaje: `FalloDeCarga` clasifica por status.
  const {
    metrics,
    isLoading: loadingMetrics,
    errorCrudo: metricsError,
    refetch: recargarMetricas,
  } = useAiMetrics();
  // Acá había un `useAiActivity(20)` del que sólo se leía `isLoading`: una
  // petición por montaje cuyo resultado no se pintaba nunca, cuyo error se
  // tragaba, y que además dejaba la pantalla en «Cargando…» esperándola.
  const isLoading = loadingMetrics;
  const analyticsError = metricsError;

  // Map AI metrics → AnalyticsData for AnalyticsDashboard
  const analyticsData = useMemo<AnalyticsData | null>(() => {
    if (!metrics) return null;
    return metricsToAnalyticsData(metrics);
  }, [metrics]);

  const VIEWS: ViewConfig[] = useMemo(() => [
    { id: 'dashboard' as const, label: t('inmobiliaria.analytics.tabs.dashboard'), icon: ChartBar },
  ], [t]);

  // Hero KPI data from AI metrics
  /**
   * Los cuatro números de arriba. Sin `target`: las metas («95 %», «< 10 %»)
   * eran constantes escritas acá, y la barra encima las medía al revés —para
   * una tasa que conviene BAJA, `current / value` daba «500 % meta» y una
   * barra llena cuando la cosa iba mal—. Ninguna agencia configuró esas metas
   * y no hay dónde configurarlas.
   */
  const heroKPIs = useMemo(() => {
    if (!metrics) {
      return {
        evaluations: { value: '—' },
        accuracy: { value: '—' },
        escalation: { value: '—' },
        hoursSaved: { value: '—' },
      };
    }
    return {
      evaluations: { value: String(metrics.scoring.evaluationsThisMonth) },
      accuracy: { value: metrics.scoring.accuracyRate },
      escalation: { value: metrics.scoring.escalationRate },
      hoursSaved: { value: metrics.summary.hoursSavedThisMonth },
    };
  }, [metrics]);

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

  /*
   * ── Los dos botones del encabezado salieron ───────────────────────────
   *
   * «Exportar PDF / Excel»: el handler entero era
   *     toast.success('Exportando a PDF')
   * Ni una petición. Nunca hubo archivo. `GET /inmobiliaria/ai/metrics` no
   * tiene export, y `/reports/export` no sirve estas métricas (su catálogo son
   * cartera, comisiones, vencimientos, flujo de caja, ocupación y
   * rentabilidad).
   *
   * Selector de período (7d/30d/90d/1a): guardaba el estado, tiraba un
   * «Período actualizado» y no cambiaba un solo número. `useAiMetrics()` no
   * recibe parámetros, `aiApi.getMetrics()` tampoco, y la ruta del back menos:
   * las métricas son siempre «este mes» y «esta semana».
   *
   * Los dos vuelven cuando exista con qué cumplirlos.
   */

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-h2 text-fg flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted">
            <ChartLineUp className="h-5 w-5 text-fg-muted" weight="duotone" />
          </div>
          {t('inmobiliaria.analytics.title')}
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.analytics.subtitle')}
        </p>
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
        {/* 🔴 «Tasa de precisión» no era precisión: el back calcula
            `completadas / total` (`ai-insights.service.ts`), que es cuántas
            evaluaciones terminaron, no cuántas acertaron —para eso haría falta
            un resultado real contra el cual comparar, y no se guarda—. Igual
            «Tasa de escalación», que es `fallidas / total`. Se llaman por lo
            que miden. */}
        <HeroKPICard
          icon={Target}
          label="Evaluaciones completadas"
          value={heroKPIs.accuracy.value}
          accentColor="emerald"
        />
        <HeroKPICard
          icon={Percent}
          label="Evaluaciones que fallaron"
          value={heroKPIs.escalation.value}
          accentColor="amber"
        />
        {/* Estimación, no medición: el back multiplica las evaluaciones
            completadas por media hora. El rótulo lo dice. */}
        <HeroKPICard
          icon={ChartLineUp}
          label="Horas ahorradas este mes (estimadas)"
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
