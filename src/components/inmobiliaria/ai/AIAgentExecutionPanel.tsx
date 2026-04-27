'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  GitMerge,
  Globe,
  PlugsConnected,
  Brain,
  LightbulbFilament,
  Bell,
  FileText,
  MagnifyingGlass,
  CheckCircle,
  CircleNotch,
  Warning,
  Clock,
  Play,
  ArrowLeft,
  Monitor,
  ChatCircleDots,
  Lightning,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentExecutionTrace, ExecutionStep, ExecutionStepStatus } from '@/lib/types/ai-agents';
import { getAgentById } from '@/lib/types/ai-agents';

const AGENT_ICONS: Record<string, Icon> = {
  'tenant-scoring': ShieldCheck,
  'smart-matching': GitMerge,
};

const STEP_TYPE_ICONS: Record<string, Icon> = {
  browser: Globe,
  api: PlugsConnected,
  analysis: Brain,
  decision: LightbulbFilament,
  notification: Bell,
  document: FileText,
  search: MagnifyingGlass,
};

const STEP_TYPE_LABELS: Record<string, { es: string; en: string }> = {
  browser: { es: 'Navegador', en: 'Browser' },
  api: { es: 'API', en: 'API' },
  analysis: { es: 'Análisis', en: 'Analysis' },
  decision: { es: 'Decisión', en: 'Decision' },
  notification: { es: 'Notificación', en: 'Notification' },
  document: { es: 'Documento', en: 'Document' },
  search: { es: 'Búsqueda', en: 'Search' },
};

// Mock screenshot URLs for the "computer view" — in production these come from the agent
const STEP_SCREENSHOTS: Record<string, string> = {};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StepStatusDot({ status }: { status: ExecutionStepStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500">
          <CheckCircle weight="fill" className="h-4 w-4 text-white" />
        </div>
      );
    case 'running':
      return (
        <div className="relative flex items-center justify-center h-6 w-6">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
          <span className="relative flex items-center justify-center h-6 w-6 rounded-full bg-blue-500">
            <CircleNotch weight="bold" className="h-3.5 w-3.5 text-white animate-spin" />
          </span>
        </div>
      );
    case 'failed':
      return (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500">
          <Warning weight="fill" className="h-4 w-4 text-white" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-transparent" />
      );
  }
}

/**
 * Computer View — Shows what the agent "sees" at the selected step
 * In production this would show actual browser screenshots/video
 */
function ComputerView({ step, trace, locale }: { step: ExecutionStep | null; trace: AgentExecutionTrace; locale: string }) {
  const isRunning = step?.status === 'running';
  const StepIcon = STEP_TYPE_ICONS[step?.stepType || 'analysis'] || Brain;
  const typeLabel = STEP_TYPE_LABELS[step?.stepType || 'analysis'];

  return (
    <div className="h-full flex flex-col">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-[#1a1a1c] border-b border-neutral-200 dark:border-neutral-700 rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white dark:bg-[#0c0c0e] border border-neutral-200 dark:border-neutral-700 max-w-md w-full">
            {step?.stepType === 'browser' ? (
              <Globe className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
            ) : (
              <StepIcon className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
            )}
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {step?.stepType === 'browser'
                ? 'datacredito.com.co/consulta/verificacion'
                : `leasefy.ai/agent/${trace.agentId}/${step?.stepType || 'process'}`}
            </span>
          </div>
        </div>
        {step && (
          <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase">
            {typeLabel?.[locale as 'es' | 'en'] || step.stepType}
          </span>
        )}
      </div>

      {/* Screen content */}
      <div className="flex-1 bg-[#0c0c0e] rounded-b-xl overflow-hidden relative">
        {!step ? (
          /* No step selected — show overview */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4">
              <Monitor weight="duotone" className="h-8 w-8 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-400 mb-1">
              {locale === 'es' ? 'Vista del agente' : 'Agent view'}
            </p>
            <p className="text-xs text-neutral-500 max-w-xs">
              {locale === 'es'
                ? 'Selecciona un paso para ver lo que el agente estaba haciendo en ese momento'
                : 'Select a step to see what the agent was doing at that moment'}
            </p>
          </div>
        ) : (
          /* Step content — simulated computer view */
          <div className="h-full flex flex-col">
            {/* Simulated screen content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {step.stepType === 'browser' && (
                <div className="space-y-4">
                  {/* Simulated DataCrédito page */}
                  <div className="bg-white rounded-lg p-4 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">DC</div>
                      <span className="text-sm font-semibold text-neutral-900">DataCrédito</span>
                      <span className="text-xs text-neutral-400">Consulta de historial crediticio</span>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Documento consultado:</span>
                        <span className="font-mono text-neutral-700">{trace.title.includes('CC') ? trace.title.split('CC ')[1] || '1.023.456.789' : '52.789.123'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Estado consulta:</span>
                        <span className={cn('font-medium', isRunning ? 'text-blue-600' : 'text-emerald-600')}>
                          {isRunning ? 'Procesando...' : 'Completada'}
                        </span>
                      </div>
                      {step.output && (
                        <div className="mt-3 p-2 bg-emerald-50 rounded border border-emerald-200">
                          <p className="text-xs text-emerald-800 font-mono whitespace-pre-wrap">{step.output}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isRunning && (
                    <div className="flex items-center justify-center gap-2 text-blue-400 animate-pulse">
                      <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{locale === 'es' ? 'Consultando...' : 'Querying...'}</span>
                    </div>
                  )}
                </div>
              )}

              {step.stepType === 'analysis' && (
                <div className="space-y-3 max-w-lg mx-auto">
                  <div className="bg-white/[0.05] rounded-lg border border-white/[0.08] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain weight="duotone" className="h-5 w-5 text-neutral-400" />
                      <span className="text-sm font-medium text-white/90">
                        {locale === 'es' ? 'Motor de Análisis' : 'Analysis Engine'}
                      </span>
                      {isRunning && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-blue-400 animate-pulse">
                          <CircleNotch weight="bold" className="h-3 w-3 animate-spin" />
                          {locale === 'es' ? 'Procesando' : 'Processing'}
                        </span>
                      )}
                    </div>
                    {step.reasoning && (
                      <div className="mb-3 p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-neutral-400 mb-1 uppercase tracking-wider">{locale === 'es' ? 'Pensamiento' : 'Thinking'}</p>
                        <p className="text-sm text-neutral-300 leading-relaxed italic">&ldquo;{step.reasoning}&rdquo;</p>
                      </div>
                    )}
                    {step.output && (
                      <div className="p-3 rounded bg-emerald-900/20 border border-emerald-700/30">
                        <p className="text-xs text-emerald-400 mb-1 uppercase tracking-wider">{locale === 'es' ? 'Output' : 'Output'}</p>
                        <p className="text-sm text-emerald-200 font-mono leading-relaxed whitespace-pre-wrap">{step.output}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step.stepType === 'document' && (
                <div className="max-w-lg mx-auto">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                      <FileText weight="duotone" className="h-5 w-5 text-neutral-500" />
                      <span className="text-sm font-semibold text-neutral-900">{locale === 'es' ? 'Generando Documento' : 'Generating Document'}</span>
                    </div>
                    {step.output && (
                      <p className="text-xs text-neutral-600 font-mono leading-relaxed whitespace-pre-wrap">{step.output}</p>
                    )}
                    {isRunning && (
                      <div className="mt-4 flex items-center gap-2 text-neutral-500">
                        <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{locale === 'es' ? 'Generando PDF...' : 'Generating PDF...'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step.stepType === 'search' && (
                <div className="space-y-3 max-w-lg mx-auto">
                  <div className="bg-white/[0.05] rounded-lg border border-white/[0.08] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MagnifyingGlass weight="duotone" className="h-5 w-5 text-neutral-400" />
                      <span className="text-sm font-medium text-white/90">{locale === 'es' ? 'Búsqueda de Candidatos' : 'Candidate Search'}</span>
                    </div>
                    {step.reasoning && (
                      <p className="text-sm text-neutral-400 mb-3 italic">&ldquo;{step.reasoning}&rdquo;</p>
                    )}
                    {step.output && (
                      <div className="p-3 rounded bg-white/[0.05] border border-white/[0.08]">
                        <p className="text-sm text-neutral-200 font-mono">{step.output}</p>
                      </div>
                    )}
                    {isRunning && (
                      <div className="mt-3 space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={cn('h-3 rounded bg-white/[0.06]', i === 3 ? 'w-2/3' : 'w-full')} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step.stepType === 'notification' && (
                <div className="max-w-sm mx-auto mt-8">
                  <div className="bg-white rounded-2xl shadow-xl p-5 border">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <Bell weight="fill" className="h-5 w-5 text-neutral-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">Leasefy</p>
                        <p className="text-xs text-neutral-600 mt-0.5">{step.output || 'Enviando notificación...'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step.stepType === 'decision' && (
                <div className="max-w-lg mx-auto">
                  <div className="bg-white/[0.05] rounded-lg border border-white/[0.08] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <LightbulbFilament weight="duotone" className="h-5 w-5 text-amber-400" />
                      <span className="text-sm font-medium text-white/90">{locale === 'es' ? 'Tomando Decisión' : 'Making Decision'}</span>
                    </div>
                    {step.reasoning && (
                      <p className="text-sm text-neutral-300 leading-relaxed italic mb-3">&ldquo;{step.reasoning}&rdquo;</p>
                    )}
                    {step.output && (
                      <div className="p-3 rounded bg-amber-900/20 border border-amber-700/30">
                        <p className="text-sm text-amber-200 font-mono">{step.output}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video controls bar — for completed traces */}
            {trace.status === 'completed' && (
              <div className="px-4 py-2.5 bg-black/40 border-t border-white/[0.06] flex items-center gap-3">
                <button className="p-1 hover:bg-white/10 rounded transition-colors">
                  <Play weight="fill" className="h-4 w-4 text-white/70" />
                </button>
                <div className="flex-1 h-1 rounded-full bg-white/10 relative">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-neutral-500" style={{ width: '60%' }} />
                </div>
                <span className="text-[11px] text-white/50 tabular-nums">
                  {step.durationMs ? formatDuration(step.durationMs) : '0:00'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Step in the left timeline
 */
function TimelineStep({
  step,
  index,
  isLast,
  isSelected,
  onSelect,
}: {
  step: ExecutionStep;
  index: number;
  isLast: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isDone = step.status === 'completed';
  const isActive = step.status === 'running';
  const isPending = step.status === 'pending';

  return (
    <div className="relative flex gap-3">
      {/* Vertical connector */}
      {!isLast && (
        <div className={cn(
          'absolute left-[11px] top-8 bottom-0 w-0.5',
          isDone ? 'bg-emerald-300 dark:bg-emerald-700' :
          isActive ? 'bg-blue-300 dark:bg-blue-700' :
          'bg-neutral-200 dark:bg-neutral-700',
        )} />
      )}

      <button
        onClick={onSelect}
        disabled={isPending}
        className={cn(
          'relative z-10 w-full flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 text-left transition-colors',
          isSelected && !isPending && 'bg-neutral-100 dark:bg-white/[0.04]',
          !isSelected && !isPending && 'hover:bg-neutral-50 dark:hover:bg-white/[0.02]',
          isPending && 'opacity-40 cursor-default',
        )}
      >
        <div className="flex-shrink-0 mt-0.5">
          <StepStatusDot status={step.status} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-sm font-medium truncate',
              isDone && 'text-neutral-900 dark:text-white',
              isActive && 'text-blue-700 dark:text-blue-300',
              isPending && 'text-neutral-400 dark:text-neutral-500',
            )}>
              {step.label}
            </span>
          </div>
          {isActive && step.reasoning && (
            <p className="mt-1 text-xs text-blue-600/80 dark:text-blue-400/80 line-clamp-2 italic">
              {step.reasoning}
            </p>
          )}
          {isDone && step.durationMs && (
            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
              {formatDuration(step.durationMs)}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}


interface AIAgentExecutionPanelProps {
  trace: AgentExecutionTrace;
  onClose: () => void;
}

export function AIAgentExecutionPanel({ trace, onClose }: AIAgentExecutionPanelProps) {
  const { locale } = useI18n();
  const agent = getAgentById(trace.agentId);
  const AgentIcon = AGENT_ICONS[trace.agentId] || ShieldCheck;
  const isRunning = trace.status === 'running';

  // Auto-select the current running step, or first completed step
  const runningStep = trace.steps.find(s => s.status === 'running');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    runningStep?.id || trace.steps[0]?.id || null
  );
  const selectedStep = trace.steps.find(s => s.id === selectedStepId) || null;

  const completedSteps = trace.steps.filter(s => s.status === 'completed').length;
  const totalSteps = trace.steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  // Auto-scroll to running step
  useEffect(() => {
    if (runningStep) setSelectedStepId(runningStep.id);
  }, [runningStep?.id]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#0c0c0e] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113]">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft weight="bold" className="h-4 w-4" />
          <span>{locale === 'es' ? 'Volver' : 'Back'}</span>
        </button>

        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

        <div className={cn('rounded-lg p-1.5', agent?.colorBg)}>
          <AgentIcon weight="duotone" className={cn('h-4 w-4', agent?.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
            {trace.title}
          </h1>
        </div>

        {/* Status + Progress */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" />
              {locale === 'es' ? 'En ejecución' : 'Running'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle weight="fill" className="h-3.5 w-3.5" />
              {locale === 'es' ? 'Completado' : 'Completed'}
            </span>
          )}
          <span className="text-xs text-neutral-400 tabular-nums">{completedSteps}/{totalSteps}</span>
          <div className="w-24 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', isRunning ? 'bg-blue-500' : 'bg-emerald-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
          {trace.totalDurationMs && (
            <span className="text-xs text-neutral-400 tabular-nums flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(trace.totalDurationMs)}
            </span>
          )}
        </div>
      </div>

      {/* Main content: split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Timeline */}
        <div className="w-80 xl:w-96 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lightning weight="fill" className="h-3 w-3" />
              {locale === 'es' ? 'Ejecución' : 'Execution'}
            </h3>
            <div className="space-y-0.5">
              {trace.steps.map((step, i) => (
                <TimelineStep
                  key={step.id}
                  step={step}
                  index={i}
                  isLast={i === trace.steps.length - 1}
                  isSelected={step.id === selectedStepId}
                  onSelect={() => setSelectedStepId(step.id)}
                />
              ))}
            </div>
          </div>

          {/* Conclusion */}
          {trace.status === 'completed' && trace.conclusion && (
            <div className="mx-4 mb-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.03] p-4">
              <h4 className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ChatCircleDots weight="fill" className="h-3 w-3" />
                {locale === 'es' ? 'Conclusión' : 'Conclusion'}
              </h4>
              <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                {trace.conclusion}
              </p>
              {trace.result && (
                <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {trace.result}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel — Computer View */}
        <div className="flex-1 bg-neutral-50 dark:bg-[#0c0c0e] p-4 overflow-hidden">
          <div className="h-full rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <ComputerView step={selectedStep} trace={trace} locale={locale} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
