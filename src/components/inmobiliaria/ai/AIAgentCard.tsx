'use client';

import { useState, useRef, useEffect } from 'react';
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
  Play,
  CircleNotch,
  CheckCircle,
  X,
  Warning,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AIAgentDefinition } from '@/lib/types/ai-agents';
import { AIAgentDetailSidebar } from './AIAgentDetailSidebar';
import { AIAgentExecutionPanel } from './AIAgentExecutionPanel';
import { useAgentExecution } from '@/lib/hooks/use-agent';

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

/** Reads the agency ID from localStorage auth, falls back to demo */
function getAgencyId(): string {
  if (typeof window === 'undefined') return 'demo-agency-001';
  try {
    const raw = localStorage.getItem('arriendo-facil-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch { /* ignore */ }
  return 'demo-agency-001';
}

export function AIAgentCard({ agent, metrics, recentCount }: AIAgentCardProps) {
  const { locale } = useI18n();
  const [showDetail, setShowDetail] = useState(false);
  const [showRunPopover, setShowRunPopover] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [applicationIdInput, setApplicationIdInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isRunning, error, result, trace, runScoring, runMatching, clearResult } = useAgentExecution();

  const AgentIcon = ICON_MAP[agent.icon] || ShieldCheck;
  const isActive = agent.status === 'active';
  const name = locale === 'es' ? agent.nameEs : agent.nameEn;
  const description = locale === 'es' ? agent.descriptionEs : agent.descriptionEn;
  const isScoring = agent.id === 'tenant-scoring';

  // Close popover on outside click
  useEffect(() => {
    if (!showRunPopover) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowRunPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showRunPopover]);

  // Focus input when popover opens
  useEffect(() => {
    if (showRunPopover && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showRunPopover]);

  // When execution completes, auto-open the execution panel
  useEffect(() => {
    if (trace && trace.status === 'completed') {
      setShowExecution(true);
    }
  }, [trace?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRun() {
    const appId = applicationIdInput.trim();
    if (!appId) return;

    setShowRunPopover(false);
    const agencyId = getAgencyId();

    if (isScoring) {
      await runScoring(appId, agencyId);
    } else {
      await runMatching(appId, agencyId, 'new_application');
    }
  }

  function handleClearAndReset() {
    clearResult();
    setApplicationIdInput('');
  }

  // Derive a short result label to display inline
  let resultLabel: string | null = null;
  if (result && !isRunning) {
    if ('score' in result && result.score !== undefined) {
      resultLabel = `Score: ${result.score}/100 (${result.level})`;
    } else if ('suggestionsCount' in result) {
      resultLabel = locale === 'es'
        ? `${result.suggestionsCount} sugerencias`
        : `${result.suggestionsCount} suggestions`;
    }
  }

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
                {locale === 'es' ? 'Proximamente' : 'Coming soon'}
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
            title={locale === 'es' ? 'Que hace este agente?' : 'What does this agent do?'}
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

        {/* Inline result banner */}
        {(resultLabel || error || isRunning) && (
          <div className={cn(
            'mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/50',
          )}>
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                <span>{locale === 'es' ? 'Ejecutando...' : 'Running...'}</span>
              </div>
            )}
            {!isRunning && error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <Warning weight="fill" className="h-4 w-4" />
                <span className="truncate flex-1">{error}</span>
                <button
                  onClick={handleClearAndReset}
                  className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {!isRunning && resultLabel && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle weight="fill" className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-neutral-900 dark:text-white truncate flex-1">
                  {resultLabel}
                </span>
                <button
                  onClick={() => { if (trace) setShowExecution(true); }}
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors whitespace-nowrap"
                >
                  {locale === 'es' ? 'Ver trace' : 'View trace'}
                </button>
                <button
                  onClick={handleClearAndReset}
                  className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-3 w-3 text-neutral-400" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="mt-2.5 flex items-center justify-between">
          <Link
            href="/panel/inmobiliaria/ai"
            className="flex items-center gap-1 text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            {locale === 'es' ? 'Ver actividad' : 'View activity'}
            <ArrowRight className="h-3 w-3" />
          </Link>

          <div className="flex items-center gap-2">
            {/* Run button */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isRunning) return;
                  setShowRunPopover((prev) => !prev);
                }}
                disabled={isRunning}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                  isRunning
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm',
                )}
              >
                {isRunning ? (
                  <CircleNotch weight="bold" className="h-3 w-3 animate-spin" />
                ) : (
                  <Play weight="fill" className="h-3 w-3" />
                )}
                {locale === 'es' ? 'Ejecutar' : 'Run'}
              </button>

              {/* Run popover */}
              {showRunPopover && (
                <div
                  ref={popoverRef}
                  className="absolute right-0 bottom-full mb-2 w-72 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-50 p-4"
                >
                  <p className="text-xs font-medium text-neutral-900 dark:text-white mb-2">
                    {locale === 'es'
                      ? isScoring
                        ? 'Evaluar aplicacion'
                        : 'Buscar propiedades compatibles'
                      : isScoring
                        ? 'Evaluate application'
                        : 'Find compatible properties'}
                  </p>
                  <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Application ID
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={applicationIdInput}
                    onChange={(e) => setApplicationIdInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRun(); if (e.key === 'Escape') setShowRunPopover(false); }}
                    placeholder="app-abc123..."
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#0c0c0e] px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition-colors"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => setShowRunPopover(false)}
                      className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                    >
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleRun}
                      disabled={!applicationIdInput.trim()}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        applicationIdInput.trim()
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed',
                      )}
                    >
                      <Play weight="fill" className="h-3 w-3" />
                      {locale === 'es' ? 'Ejecutar' : 'Run'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetail(true)}
              className="text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              {locale === 'es' ? 'Como funciona?' : 'How does it work?'}
            </button>
          </div>
        </div>
      </div>

      {/* Detail sidebar */}
      {showDetail && (
        <AIAgentDetailSidebar agent={agent} onClose={() => setShowDetail(false)} />
      )}

      {/* Execution panel */}
      {showExecution && trace && (
        <AIAgentExecutionPanel trace={trace} onClose={() => setShowExecution(false)} />
      )}
    </>
  );
}
