'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  GitMerge,
  CurrencyDollar,
  FileText,
  PaperPlaneTilt,
  Kanban,
  Wrench,
  ArrowsClockwise,
  ArrowRight,
  Lock,
  Robot,
  Info,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AIAgentDefinition } from '@/lib/types/ai-agents';
import { AIAgentDetailSidebar } from './AIAgentDetailSidebar';

const ICON_MAP: Record<string, Icon> = {
  ShieldCheck,
  GitMerge,
  CurrencyDollar,
  FileText,
  PaperPlaneTilt,
  Kanban,
  Wrench,
  ArrowsClockwise,
};

interface AIAgentCardProps {
  agent: AIAgentDefinition;
  metrics?: { label: string; value: string | number }[];
  recentCount?: number;
}

export function AIAgentCard({ agent, metrics, recentCount }: AIAgentCardProps) {
  const { locale } = useI18n();
  const [showDetail, setShowDetail] = useState(false);
  const AgentIcon = ICON_MAP[agent.icon] || ShieldCheck;
  const isActive = agent.status === 'active';
  const name = locale === 'es' ? agent.nameEs : agent.nameEn;
  const description = locale === 'es' ? agent.descriptionEs : agent.descriptionEn;

  if (!isActive) {
    return (
      <div className="relative rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-white/[0.02] p-5 opacity-75">
        <div className="flex items-start gap-4">
          <div className={cn('rounded-xl p-3', 'bg-neutral-100 dark:bg-neutral-800')}>
            <AgentIcon weight="duotone" className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-neutral-500 dark:text-neutral-400">{name}</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                <Lock weight="bold" className="h-3 w-3" />
                {locale === 'es' ? 'Próximamente' : 'Coming soon'}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/20 transition-all overflow-hidden">
        {/* Header: badge + active + info */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            <Robot weight="bold" className="h-2.5 w-2.5" />
            Agente AI
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {locale === 'es' ? 'Activo' : 'Active'}
            </span>
          </span>
          <button
            onClick={(e) => { e.preventDefault(); setShowDetail(true); }}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={locale === 'es' ? '¿Qué hace este agente?' : 'What does this agent do?'}
          >
            <Info weight="duotone" className="h-4 w-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" />
          </button>
        </div>

        {/* Icon + name */}
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2 flex-shrink-0', agent.colorBg)}>
            <AgentIcon weight="duotone" className={cn('h-4 w-4', agent.color)} />
          </div>
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white truncate flex-1">{name}</h3>
        </div>

        {/* Description */}
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
          {description}
        </p>

        {/* Metrics */}
        {metrics && metrics.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/50 grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{m.label}</p>
                <p className="text-base font-semibold text-neutral-900 dark:text-white">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <Link
            href="/panel/inmobiliaria/ai"
            className="flex items-center gap-1 text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            {locale === 'es' ? 'Ver actividad' : 'View activity'}
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setShowDetail(true)}
            className="text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            {locale === 'es' ? '¿Cómo funciona?' : 'How does it work?'}
          </button>
        </div>
      </div>

      {/* Detail sidebar */}
      {showDetail && (
        <AIAgentDetailSidebar agent={agent} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
