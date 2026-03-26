'use client';

import {
  Robot,
  TrendUp,
  CheckCircle,
  Clock,
  Info,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { AIAgentCard } from '@/components/inmobiliaria/ai/AIAgentCard';
import { AIAgentActivityFeed } from '@/components/inmobiliaria/ai/AIAgentActivityFeed';
import {
  getActiveAgents,
  getComingSoonAgents,
  getMockAgentActivity,
} from '@/lib/types/ai-agents';

/**
 * AI Agents Hub — Central command for all AI agents
 */
export default function AIAgentsPage() {
  const { locale } = useI18n();
  const activeAgents = getActiveAgents();
  const comingSoonAgents = getComingSoonAgents();
  const activities = getMockAgentActivity();

  // Mock metrics for active agents
  const scoringMetrics = [
    { label: locale === 'es' ? 'Evaluaciones este mes' : 'Evaluations this month', value: 47 },
    { label: locale === 'es' ? 'Tiempo promedio' : 'Avg time', value: locale === 'es' ? '< 3 min' : '< 3 min' },
    { label: locale === 'es' ? 'Precisión' : 'Accuracy', value: '94%' },
    { label: locale === 'es' ? 'Escalados a humano' : 'Escalated to human', value: '3%' },
  ];

  const matchingMetrics = [
    { label: locale === 'es' ? 'Sugerencias enviadas' : 'Suggestions sent', value: 128 },
    { label: locale === 'es' ? 'Tasa de conversión' : 'Conversion rate', value: '31%' },
    { label: locale === 'es' ? 'Candidatos redirigidos' : 'Candidates redirected', value: 12 },
    { label: locale === 'es' ? 'Compatibilidad promedio' : 'Avg compatibility', value: '87%' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Robot weight="duotone" className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
              {locale === 'es' ? 'Agentes AI' : 'AI Agents'}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {locale === 'es'
                ? 'Tu equipo autónomo trabajando 24/7 para tu inmobiliaria'
                : 'Your autonomous team working 24/7 for your agency'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-neutral-100 dark:bg-neutral-800">
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
            <div className="rounded-lg p-2 bg-neutral-100 dark:bg-neutral-800">
              <TrendUp weight="duotone" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">175</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {locale === 'es' ? 'Acciones esta semana' : 'Actions this week'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-neutral-100 dark:bg-neutral-800">
              <Clock weight="duotone" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {locale === 'es' ? '~18h' : '~18h'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {locale === 'es' ? 'Horas ahorradas este mes' : 'Hours saved this month'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {locale === 'es' ? 'Agentes Activos' : 'Active Agents'}
          </h2>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeAgents.map((agent) => (
            <AIAgentCard
              key={agent.id}
              agent={agent}
              metrics={agent.id === 'tenant-scoring' ? scoringMetrics : matchingMetrics}
            />
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <AIAgentActivityFeed activities={activities} maxItems={6} />

      {/* Coming Soon */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {locale === 'es' ? 'Próximos Agentes' : 'Upcoming Agents'}
          </h2>
          <span className="text-sm text-neutral-400 dark:text-neutral-500">
            {locale === 'es' ? `${comingSoonAgents.length} en desarrollo` : `${comingSoonAgents.length} in development`}
          </span>
        </div>

        {/* Info banner */}
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
