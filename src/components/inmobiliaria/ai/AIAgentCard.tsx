'use client';

import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
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
  CircleNotch,
  CheckCircle,
  X,
  Warning,
  Play,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AIAgentDefinition } from '@/lib/types/ai-agents';
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
  lastAction?: { title: string; time: string } | null;
  recentCount?: number;
}

export function AIAgentCard({ agent, metrics, lastAction, recentCount }: AIAgentCardProps) {
  const { locale } = useI18n();
  const [showRunPopover, setShowRunPopover] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [applicationIdInput, setApplicationIdInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isRunning, error, result, trace, runScoring, clearResult } = useAgentExecution();

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

    // Scoring is the only agent runnable from the card. Smart-matching is
    // server-triggered (out of scope for the card — see use-agent.ts).
    if (isScoring) {
      await runScoring(appId);
    }
  }

  function handleOpenRunPopover(e: ReactMouseEvent) {
    // Card is wrapped in a <Link>; prevent the click from navigating.
    e.preventDefault();
    e.stopPropagation();
    setShowRunPopover(true);
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
    <div className="relative">
      <Link href={`/panel/inmobiliaria/ai?agent=${agent.id}`} className="group block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 hover:border-neutral-300 dark:hover:border-neutral-600 hover: hover:shadow-neutral-200/50 dark:hover:shadow-black/20 transition-all overflow-hidden cursor-pointer">
        {/* Header: badge + active + info */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            <Robot weight="bold" className="h-2.5 w-2.5" />
            Agente AI
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 bg-neutral-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neutral-500" />
            </span>
            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
              {locale === 'es' ? 'Activo' : 'Active'}
            </span>
          </span>
        </div>

        {/* Icon + name */}
        <div className="flex items-center gap-3">
          <div className={cn('rounded-md p-2 flex-shrink-0', agent.colorBg)}>
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
              <div className="flex items-center gap-2 text-sm text-[#1A40FF] dark:text-[#5570FF]">
                <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                <span>{locale === 'es' ? 'Ejecutando...' : 'Running...'}</span>
              </div>
            )}
            {!isRunning && error && (
              <div className="flex items-center gap-2 text-sm text-[#C4503B]">
                <Warning weight="fill" className="h-4 w-4" />
                <span className="truncate flex-1">{error}</span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearAndReset(); }}
                  className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label={locale === 'es' ? 'Descartar error' : 'Dismiss error'}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {!isRunning && resultLabel && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle weight="fill" className="h-4 w-4 text-[#2C7A53]" />
                <span className="font-medium text-neutral-900 dark:text-white truncate flex-1">
                  {resultLabel}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (trace) setShowExecution(true); }}
                  className="text-xs font-medium text-[#1A40FF] hover:text-[#1A40FF] transition-colors whitespace-nowrap"
                >
                  {locale === 'es' ? 'Ver trace' : 'View trace'}
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearAndReset(); }}
                  className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label={locale === 'es' ? 'Limpiar resultado' : 'Clear result'}
                >
                  <X className="h-3 w-3 text-neutral-400" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live activity ticker */}
        {lastAction && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/50">
            <div className="relative overflow-hidden rounded-md bg-neutral-50/80 dark:bg-white/[0.03] px-3 py-2">
              {/* Shimmer sweep */}
              <div className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-white/60 dark:via-white/[0.06] to-transparent w-1/2" />
              <div className="relative flex items-center gap-2">
                {/* Animated dots */}
                <div className="flex items-center gap-[3px] flex-shrink-0">
                  <span className="h-[5px] w-[5px] rounded-full bg-neutral-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                  <span className="h-[5px] w-[5px] rounded-full bg-neutral-400 animate-[pulse_1.5s_ease-in-out_0.3s_infinite]" />
                  <span className="h-[5px] w-[5px] rounded-full bg-neutral-300 animate-[pulse_1.5s_ease-in-out_0.6s_infinite]" />
                </div>
                <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200 truncate flex-1">{lastAction.title}</p>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap tabular-nums">{lastAction.time}</span>
              </div>
            </div>
          </div>
        )}

        {/* View detail hint */}
        <div className="mt-2.5 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
          {locale === 'es' ? 'Ver detalle del agente' : 'View agent detail'}
          <ArrowRight className="h-3 w-3" />
        </div>
      </Link>

      {/* Run control — scoring only. Sibling of <Link> so navigation stays intact. */}
      {isScoring && (
        <div className="absolute top-4 right-4 z-10" ref={popoverRef}>
          <button
            type="button"
            onClick={handleOpenRunPopover}
            disabled={isRunning}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
              'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label={locale === 'es' ? 'Ejecutar agente' : 'Run agent'}
          >
            {isRunning ? (
              <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play weight="fill" className="h-3.5 w-3.5" />
            )}
            {locale === 'es' ? 'Ejecutar' : 'Run'}
          </button>

          {showRunPopover && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-neutral-200/60 dark:shadow-black/40 p-3"
              role="dialog"
              aria-label={locale === 'es' ? 'Ejecutar evaluación' : 'Run evaluation'}
              onClick={(e) => e.stopPropagation()}
            >
              <label
                htmlFor={`run-app-${agent.id}`}
                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5"
              >
                {locale === 'es' ? 'ID de aplicación' : 'Application ID'}
              </label>
              <input
                id={`run-app-${agent.id}`}
                ref={inputRef}
                type="text"
                value={applicationIdInput}
                onChange={(e) => setApplicationIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleRun(); } }}
                placeholder={locale === 'es' ? 'p. ej. app_abc123' : 'e.g. app_abc123'}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0c0c0e] px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { void handleRun(); }}
                disabled={!applicationIdInput.trim() || isRunning}
                className={cn(
                  'mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
                  'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Play weight="fill" className="h-3.5 w-3.5" />
                {locale === 'es' ? 'Ejecutar' : 'Run'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Execution panel — full-screen overlay, sibling of <Link>. */}
      {showExecution && trace && (
        <AIAgentExecutionPanel trace={trace} onClose={() => setShowExecution(false)} />
      )}
    </div>
  );
}
