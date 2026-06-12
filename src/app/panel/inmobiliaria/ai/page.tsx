'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Robot,
  TrendUp,
  CheckCircle,
  Clock,
  Info,
  ArrowLeft,
  ShieldCheck,
  GitMerge,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { AIAgentCard } from '@/components/inmobiliaria/ai/AIAgentCard';
import { AIAgentActivityFeed } from '@/components/inmobiliaria/ai/AIAgentActivityFeed';
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge';
import {
  getActiveAgents,
  getComingSoonAgents,
} from '@/lib/types/ai-agents';
import type { AIAgentDefinition } from '@/lib/types/ai-agents';
import { useAgentMetrics } from '@/lib/hooks/use-agent-metrics';
import { useAgentActivity } from '@/lib/hooks/use-agent-activity';
import { useAiHubLanding } from '@/lib/hooks/use-ai-hub-landing';
import { useAiHubResumen } from '@/lib/hooks/ai/use-ai-hub-resumen';
import { EquipoAgentes } from '@/components/inmobiliaria/ai/EquipoAgentes';
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton';

// ── Relative time helper (XR-05 i18n for es-CO) ───────────────────────────
// Avoids date-fns dependency; covers Intl.RelativeTimeFormat semantics.
function formatRelativeTime(isoString: string | null | undefined, locale: string): string {
  if (!isoString) return locale === 'es' ? 'Sin actividad reciente' : 'No recent activity';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return locale === 'es' ? `hace ${diffMins}min` : `${diffMins}min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return locale === 'es' ? `hace ${diffHours}h` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return locale === 'es' ? `hace ${diffDays}d` : `${diffDays}d ago`;
}

/**
 * Agent Detail View — shown when ?agent= query param is present
 */
function AgentDetailView({ agent, agentId }: { agent: AIAgentDefinition; agentId: string }) {
  const { locale } = useI18n();
  const { activities } = useAgentActivity({ refreshIntervalMs: 15_000, limit: 50 });
  const { metrics, isLoading } = useAgentMetrics(60_000);

  const agentActivities = activities.filter(a => a.agentId === agentId);
  const isScoring = agentId === 'tenant-scoring';
  const AgentIcon = isScoring ? ShieldCheck : GitMerge;

  const name = locale === 'es' ? agent.nameEs : agent.nameEn;
  const description = locale === 'es' ? agent.descriptionEs : agent.descriptionEn;

  // Build detailed metrics
  const detailMetrics = isScoring ? [
    { label: locale === 'es' ? 'Evaluaciones este mes' : 'Evaluations this month', value: isLoading ? '...' : (metrics?.scoring.evaluationsThisMonth ?? '—') },
    { label: locale === 'es' ? 'Tiempo promedio' : 'Avg time', value: metrics?.scoring.avgTimeMin ?? '—' },
    { label: locale === 'es' ? 'Precisión' : 'Accuracy', value: isLoading ? '...' : (metrics?.scoring.accuracyRate ?? '—') },
    { label: locale === 'es' ? 'Escalados a humano' : 'Escalated to human', value: isLoading ? '...' : (metrics?.scoring.escalationRate ?? '—') },
  ] : [
    { label: locale === 'es' ? 'Sugerencias enviadas' : 'Suggestions sent', value: isLoading ? '...' : (metrics?.matching.suggestionsSent ?? '—') },
    { label: locale === 'es' ? 'Tasa de conversión' : 'Conversion rate', value: isLoading ? '...' : (metrics?.matching.conversionRate ?? '—') },
    { label: locale === 'es' ? 'Candidatos redirigidos' : 'Candidates redirected', value: isLoading ? '...' : (metrics?.matching.candidatesRedirected ?? '—') },
    { label: locale === 'es' ? 'Compatibilidad promedio' : 'Avg compatibility', value: isLoading ? '...' : (metrics?.matching.avgCompatibility ?? '—') },
  ];

  // How it works steps
  const steps = isScoring ? [
    { title: locale === 'es' ? 'Recibe documentos' : 'Receives documents', desc: locale === 'es' ? 'El aplicante sube cédula, certificados laborales y extractos bancarios' : 'Applicant uploads ID, employment certificates, and bank statements' },
    { title: locale === 'es' ? 'Extrae datos con OCR' : 'Extracts data with OCR', desc: locale === 'es' ? 'Claude Vision analiza cada documento y extrae información estructurada' : 'Claude Vision analyzes each document and extracts structured information' },
    { title: locale === 'es' ? 'Verifica consistencia' : 'Verifies consistency', desc: locale === 'es' ? 'Cruza datos entre documentos para detectar inconsistencias o fraude' : 'Cross-references documents to detect inconsistencies or fraud' },
    { title: locale === 'es' ? 'Calcula score' : 'Calculates score', desc: locale === 'es' ? 'Algoritmo determinístico genera score 0-100 (A/B/C/D) basado en ingresos, estabilidad y riesgo' : 'Deterministic algorithm generates 0-100 score (A/B/C/D) based on income, stability, and risk' },
    { title: locale === 'es' ? 'Genera reporte' : 'Generates report', desc: locale === 'es' ? 'PDF con QR de verificación, resumen ejecutivo y recomendación' : 'PDF with verification QR, executive summary, and recommendation' },
  ] : [
    { title: locale === 'es' ? 'Analiza perfil' : 'Analyzes profile', desc: locale === 'es' ? 'Lee los requisitos del aplicante: presupuesto, ubicación, tamaño' : 'Reads applicant requirements: budget, location, size' },
    { title: locale === 'es' ? 'Escanea portafolio' : 'Scans portfolio', desc: locale === 'es' ? 'Busca en todas las propiedades disponibles de la inmobiliaria' : 'Searches all available properties in the agency portfolio' },
    { title: locale === 'es' ? 'Calcula compatibilidad' : 'Calculates compatibility', desc: locale === 'es' ? 'Score de compatibilidad basado en presupuesto, ubicación, metros y amenidades' : 'Compatibility score based on budget, location, size, and amenities' },
    { title: locale === 'es' ? 'Envía sugerencias' : 'Sends suggestions', desc: locale === 'es' ? 'Notifica al agente con las mejores opciones ordenadas por compatibilidad' : 'Notifies agent with best options sorted by compatibility' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back nav */}
      <Link
        href="/panel/inmobiliaria/ai"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors animate-stagger-in"
        style={{ animationDelay: '0s' }}
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === 'es' ? 'Todos los agentes' : 'All agents'}
      </Link>

      {/* Agent header */}
      <div className="flex items-center gap-4 animate-stagger-in" style={{ animationDelay: '0.06s' }}>
        <div className={cn('rounded-xl p-3', agent.colorBg)}>
          <AgentIcon weight="duotone" className={cn('h-6 w-6', agent.color)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">{name}</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[11px] font-medium text-[#2C7A53] dark:text-[#3EAE70]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-[#2C7A53]" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2C7A53]" />
              </span>
              {locale === 'es' ? 'Activo' : 'Active'}
            </span>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {detailMetrics.map((m, i) => (
          <div key={m.label} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 animate-stagger-in" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{m.label}</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Two columns: Activity + How it works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-stagger-in" style={{ animationDelay: '0.3s' }}>
        {/* Activity — 2 cols */}
        <div className="lg:col-span-2">
          <AIAgentActivityFeed activities={agentActivities} maxItems={15} />
        </div>

        {/* How it works — 1 col */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            {locale === 'es' ? 'Cómo funciona' : 'How it works'}
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-full bg-neutral-200 dark:bg-neutral-700 mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{step.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AI Agents Hub — Central command for all AI agents
 */
export default function AIAgentsPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAgentId = searchParams.get('agent');

  const activeAgents = getActiveAgents();
  const comingSoonAgents = getComingSoonAgents();
  const { activities } = useAgentActivity({ refreshIntervalMs: 30_000, limit: 20 });
  const { metrics, isLoading } = useAgentMetrics(60_000);
  const { data: landing, isLoading: hubLoading } = useAiHubLanding();
  // F10 — hub real: 6 colas por rol + vista agregada (decisión 2026-06-08).
  // 404 / backend not deployed → graceful panel; the Phase 37 surfaces below
  // keep working untouched.
  const resumen = useAiHubResumen();

  // If an agent is selected, show detail view
  const selectedAgent = selectedAgentId ? activeAgents.find(a => a.id === selectedAgentId) : null;
  if (selectedAgent && selectedAgentId) {
    return <AgentDetailView agent={selectedAgent} agentId={selectedAgentId} />;
  }

  // Phase 38-05b: PageSkeleton during initial useAiHubLanding load (D-38-04: skeleton
  // only; per-card NoDataYetBadge from Phase 37 below is PRESERVED for empty data).
  if (hubLoading && !landing) return <PageSkeleton variant="dashboard" />;

  // Build metrics arrays from real data
  const scoringMetrics = [
    { label: locale === 'es' ? 'Evaluaciones este mes' : 'Evaluations this month', value: isLoading ? '...' : (metrics?.scoring.evaluationsThisMonth ?? '—') },
    { label: locale === 'es' ? 'Tiempo promedio' : 'Avg time', value: metrics?.scoring.avgTimeMin ?? '—' },
    { label: locale === 'es' ? 'Precisión' : 'Accuracy', value: isLoading ? '...' : (metrics?.scoring.accuracyRate ?? '—') },
    { label: locale === 'es' ? 'Escalados a humano' : 'Escalated to human', value: isLoading ? '...' : (metrics?.scoring.escalationRate ?? '—') },
  ];

  const matchingMetrics = [
    { label: locale === 'es' ? 'Sugerencias enviadas' : 'Suggestions sent', value: isLoading ? '...' : (metrics?.matching.suggestionsSent ?? '—') },
    { label: locale === 'es' ? 'Tasa de conversión' : 'Conversion rate', value: isLoading ? '...' : (metrics?.matching.conversionRate ?? '—') },
    { label: locale === 'es' ? 'Candidatos redirigidos' : 'Candidates redirected', value: isLoading ? '...' : (metrics?.matching.candidatesRedirected ?? '—') },
    { label: locale === 'es' ? 'Compatibilidad promedio' : 'Avg compatibility', value: isLoading ? '...' : (metrics?.matching.avgCompatibility ?? '—') },
  ];

  // ── Cobranza card KPIs (from useAiHubLanding) ────────────────────────────
  const cobranzaCard = landing?.cobranza;
  const cobranzaPermitted = cobranzaCard?.permitted ?? false;
  const cobranzaMetrics = [
    {
      label: locale === 'es' ? '% COP recuperado (30d)' : '% COP recovered (30d)',
      value: cobranzaPermitted && cobranzaCard?.heroKpi?.populated
        ? (cobranzaCard.heroKpi.value ?? '...')
        : '—',
    },
    {
      label: locale === 'es' ? 'Escalaciones abiertas' : 'Open escalations',
      value: cobranzaPermitted ? String(cobranzaCard?.secondaryKpi?.value ?? 0) : '—',
    },
    {
      label: locale === 'es' ? 'Última llamada' : 'Last call',
      value: cobranzaPermitted
        ? formatRelativeTime(cobranzaCard?.lastActivityAt, locale)
        : '—',
    },
  ];

  // ── Cotizador card KPIs (from useAiHubLanding) ───────────────────────────
  const cotizadorCard = landing?.cotizador;
  const cotizadorPermitted = cotizadorCard?.permitted ?? false;
  const cotizadorMetrics = [
    {
      label: locale === 'es' ? '% aprobación (30d)' : '% approval rate (30d)',
      value: cotizadorPermitted && cotizadorCard?.heroKpi?.populated
        ? (cotizadorCard.heroKpi.value ?? '...')
        : '—',
    },
    {
      label: locale === 'es' ? 'Cotizaciones hoy' : 'Quotes today',
      value: cotizadorPermitted ? String(cotizadorCard?.secondaryKpi?.value ?? 0) : '—',
    },
    {
      label: locale === 'es' ? 'Última cotización' : 'Last quote',
      value: cotizadorPermitted
        ? formatRelativeTime(cotizadorCard?.lastActivityAt, locale)
        : '—',
    },
  ];

  const cobranzaAgent = getActiveAgents().find((a) => a.id === 'cobranza');
  const cotizadorAgent = getActiveAgents().find((a) => a.id === 'cotizador');

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header — F10 "AGENTES IA · Equipo" tone */}
      <div className="flex flex-col gap-1 animate-stagger-in" style={{ animationDelay: '0s' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Robot weight="duotone" className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {locale === 'es' ? 'Agentes IA · Equipo' : 'AI Agents · Team'}
            </span>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
              {locale === 'es' ? 'Equipo de agentes' : 'Agent team'}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {locale === 'es'
                ? 'Tu equipo autónomo trabajando 24/7 para tu inmobiliaria'
                : 'Your autonomous team working 24/7 for your agency'}
            </p>
          </div>
        </div>
      </div>

      {/* F10 — Equipo de agentes: 6 colas por rol + vista agregada. Leads the
          page; the Phase 37 cards/feed below are PRESERVED. */}
      <div className="animate-stagger-in" style={{ animationDelay: '0.04s' }}>
        <EquipoAgentes
          data={resumen.data}
          isLoading={resumen.isLoading}
          error={resumen.error}
          notAvailable={resumen.notAvailable}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger-in" style={{ animationDelay: '0.08s' }}>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-neutral-100 dark:bg-neutral-800">
              <CheckCircle weight="duotone" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{activeAgents.length}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {locale === 'es' ? 'Agentes activos' : 'Active agents'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-neutral-100 dark:bg-neutral-800">
              <TrendUp weight="duotone" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {isLoading ? '...' : (metrics?.summary.actionsThisWeek ?? '—')}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {locale === 'es' ? 'Acciones esta semana' : 'Actions this week'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-neutral-100 dark:bg-neutral-800">
              <Clock weight="duotone" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {isLoading ? '...' : (metrics?.summary.hoursSavedThisMonth ?? '—')}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {locale === 'es' ? 'Horas ahorradas este mes' : 'Hours saved this month'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="animate-stagger-in" style={{ animationDelay: '0.16s' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {locale === 'es' ? 'Agentes Activos' : 'Active Agents'}
          </h2>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2C7A53] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2C7A53]" />
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Existing agents: TenantScoring + SmartMatching */}
          {activeAgents
            .filter((a) => a.id === 'tenant-scoring' || a.id === 'smart-matching')
            .map((agent) => (
              <AIAgentCard
                key={agent.id}
                agent={agent}
                metrics={agent.id === 'tenant-scoring' ? scoringMetrics : matchingMetrics}
              />
            ))}

          {/* Cobranza card — click-through to analytics (D-37-03b per-card layout) */}
          {cobranzaAgent && (
            <div
              className="relative cursor-pointer"
              onClick={() => router.push('/panel/inmobiliaria/ai/cobranza/analitica')}
              data-testid="cobranza-agent-card"
              data-tour-target="cobranza-card"
            >
              <AIAgentCard
                agent={cobranzaAgent}
                metrics={cobranzaMetrics}
              />
              {/* populated:false overlay — NoDataYetBadge (T-37-11-01) */}
              {cobranzaPermitted && cobranzaCard?.heroKpi?.populated === false && (
                <div className="absolute top-3 right-3">
                  <NoDataYetBadge phase={37} reason={locale === 'es' ? 'Sin datos de cobranza aún' : 'No collections data yet'} />
                </div>
              )}
              {!cobranzaPermitted && (
                <div className="absolute top-3 right-3">
                  <NoDataYetBadge phase={37} reason={locale === 'es' ? 'Sin permiso cobranza:view' : 'Missing cobranza:view permission'} />
                </div>
              )}
            </div>
          )}

          {/* Cotizador card — click-through to cotizador page */}
          {cotizadorAgent && (
            <div
              className="relative cursor-pointer"
              onClick={() => router.push('/panel/inmobiliaria/ai/cotizador')}
              data-testid="cotizador-agent-card"
              data-tour-target="cotizador-card"
            >
              <AIAgentCard
                agent={cotizadorAgent}
                metrics={cotizadorMetrics}
              />
              {/* populated:false overlay — NoDataYetBadge (T-37-11-01) */}
              {cotizadorPermitted && cotizadorCard?.heroKpi?.populated === false && (
                <div className="absolute top-3 right-3">
                  <NoDataYetBadge phase={37} reason={locale === 'es' ? 'Sin datos de cotizador aún' : 'No quoter data yet'} />
                </div>
              )}
              {!cotizadorPermitted && (
                <div className="absolute top-3 right-3">
                  <NoDataYetBadge phase={37} reason={locale === 'es' ? 'Sin permiso cotizador:view' : 'Missing cotizador:view permission'} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="animate-stagger-in" style={{ animationDelay: '0.24s' }}>
        <AIAgentActivityFeed activities={activities} maxItems={10} />
      </div>

      {/* Coming Soon */}
      <div className="animate-stagger-in" style={{ animationDelay: '0.32s' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {locale === 'es' ? 'Próximos Agentes' : 'Upcoming Agents'}
          </h2>
          <span className="text-sm text-neutral-400 dark:text-neutral-500">
            {locale === 'es' ? `${comingSoonAgents.length} en desarrollo` : `${comingSoonAgents.length} in development`}
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.02] px-5 py-4">
          <div className="flex items-start gap-3">
            <Info weight="duotone" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {locale === 'es'
                  ? 'Estos agentes se activarán automáticamente a medida que estén listos.'
                  : 'These agents will activate automatically as they become ready.'}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {locale === 'es'
                  ? 'Cada agente nuevo amplifica la capacidad de tu equipo sin agregar complejidad operativa.'
                  : 'Each new agent amplifies your team\'s capacity without adding operational complexity.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comingSoonAgents.map((agent) => (
            <AIAgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
