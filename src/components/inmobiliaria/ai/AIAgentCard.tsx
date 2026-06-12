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
  HourglassMedium,
  ArrowClockwise,
  DownloadSimple,
  Info,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AIAgentDefinition, ScoringAwaitingReason } from '@/lib/types/ai-agents';
import { AIAgentExecutionPanel } from './AIAgentExecutionPanel';
import { useAgentExecution } from '@/lib/hooks/use-agent';
import { CreditCheckBlock } from '@/components/inmobiliaria/CreditCheckBlock';
import { downloadEvaluationCertificate, sendCertificateToOwner } from '@/lib/api/evaluations.service';

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

// Maps each awaiting_reason to i18n messages and optional action type.
// Only `study_in_progress` keeps polling; every other reason is terminal and
// offers a manual retry (re-dispatches the evaluation through the backend).
type AwaitingConfig = {
  messageEs: string;
  messageEn: string;
  action?: 'retry';
};

const AWAITING_CONFIG: Record<ScoringAwaitingReason, AwaitingConfig> = {
  study_in_progress: {
    messageEs: 'Esperando aprobaciones…',
    messageEn: 'Waiting for approvals…',
  },
  no_consent: {
    messageEs: 'El candidato no autorizó el tratamiento de datos.',
    messageEn: 'The candidate did not authorize data processing.',
    action: 'retry',
  },
  consent_unavailable: {
    messageEs: 'No se pudo verificar el consentimiento. Reintentá en unos minutos.',
    messageEn: 'Could not verify consent. Please retry in a few minutes.',
    action: 'retry',
  },
  cannot_launch: {
    messageEs: 'Faltan datos del candidato o la propiedad para lanzar el estudio.',
    messageEn: 'Missing candidate or property data to launch the study.',
    action: 'retry',
  },
  no_cedula: {
    messageEs: 'No se pudo leer la cédula. Volvé a subir el documento y reintentá.',
    messageEn: 'Could not read the ID document. Re-upload it and retry.',
    action: 'retry',
  },
  study_not_completed: {
    messageEs: 'El estudio expiró (48 h sin autorización). Podés reintentar.',
    messageEn: 'The study expired (48h without authorization). You can retry.',
    action: 'retry',
  },
  no_db: {
    messageEs: 'Error de infraestructura al lanzar el estudio. Reintentá.',
    messageEn: 'Infrastructure error launching the study. Please retry.',
    action: 'retry',
  },
};

export function AIAgentCard({ agent, metrics, lastAction, recentCount }: AIAgentCardProps) {
  const { locale, formatCurrency } = useI18n();
  const [showRunPopover, setShowRunPopover] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [applicationIdInput, setApplicationIdInput] = useState('');
  // applicationId of the last dispatched run — used for post-completion artifacts.
  const [lastAppId, setLastAppId] = useState('');
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Send-certificate-to-owner inline form state.
  const [showSendForm, setShowSendForm] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isRunning, error, result, trace, awaiting, recheckScoring, runScoring, clearResult } = useAgentExecution();

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
    setActionError(null);

    // Scoring is the only agent runnable from the card. Smart-matching is
    // server-triggered (out of scope for the card — see use-agent.ts).
    if (isScoring) {
      setLastAppId(appId);
      await runScoring(appId);
    }
  }

  // Re-runs scoring for the current applicationId input (for retry actions).
  async function handleRetry() {
    const appId = applicationIdInput.trim();
    if (!appId) return;
    if (isScoring) {
      setLastAppId(appId);
      setActionError(null);
      await runScoring(appId);
    }
  }

  // Downloads the official scoring certificate PDF for the completed run.
  async function handleDownloadCertificate() {
    const appId = lastAppId || applicationIdInput.trim();
    if (!appId) return;
    setActionError(null);
    setDownloadingCert(true);
    try {
      await downloadEvaluationCertificate(appId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo descargar el certificado.';
      setActionError(msg);
    } finally {
      setDownloadingCert(false);
    }
  }

  function handleOpenRunPopover(e: ReactMouseEvent) {
    // Card is wrapped in a <Link>; prevent the click from navigating.
    e.preventDefault();
    e.stopPropagation();
    setShowRunPopover(true);
  }

  // Sends the certificate PDF to the property owner's email.
  // NOTE: ownerEmail is entered manually for now — auto-resolving the property
  // owner's email is a pending feature (the recipient is the OWNER, not the agency).
  async function handleSendToOwner() {
    const appId = lastAppId || applicationIdInput.trim();
    const email = ownerEmail.trim();
    if (!appId || !email) return;
    setActionError(null);
    setSendSuccess(null);
    setSendingEmail(true);
    try {
      const res = await sendCertificateToOwner(appId, email, ownerName.trim() || undefined);
      setSendSuccess(locale === 'es' ? `Certificado enviado a ${res.sentTo}` : `Certificate sent to ${res.sentTo}`);
      setShowSendForm(false);
      setOwnerEmail('');
      setOwnerName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el certificado.';
      setActionError(msg);
    } finally {
      setSendingEmail(false);
    }
  }

  function handleClearAndReset() {
    clearResult();
    setApplicationIdInput('');
    setLastAppId('');
    setActionError(null);
    setShowSendForm(false);
    setOwnerEmail('');
    setOwnerName('');
    setSendSuccess(null);
  }

  // Derive a short result label to display inline
  let resultLabel: string | null = null;
  if (result && !isRunning && !awaiting) {
    if ('score' in result && result.score !== undefined) {
      resultLabel = `Score: ${result.score}/100 (${result.level})`;
    } else if ('suggestionsCount' in result) {
      resultLabel = locale === 'es'
        ? `${result.suggestionsCount} sugerencias`
        : `${result.suggestionsCount} suggestions`;
    }
  }

  // Awaiting banner config
  const awaitingConfig = awaiting ? AWAITING_CONFIG[awaiting.reason] : null;

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
      <Link href={`/panel/inmobiliaria/ai?agent=${agent.id}`} className="group block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/20 transition-all overflow-hidden cursor-pointer">
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

        {/* Inline result / running / error / awaiting banner */}
        {(resultLabel || error || isRunning || awaiting) && (
          <div className={cn(
            'mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/50',
          )}>
            {isRunning && !awaiting && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                <span>{locale === 'es' ? 'Ejecutando...' : 'Running...'}</span>
              </div>
            )}

            {/* Awaiting banner — canonical DESIGN.md banner pattern (amber for "waiting") */}
            {awaiting && awaitingConfig && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-3 flex items-start gap-2">
                <HourglassMedium
                  className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {locale === 'es' ? 'En espera' : 'Waiting'}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                    {locale === 'es' ? awaitingConfig.messageEs : awaitingConfig.messageEn}
                  </p>

                  {/* Action CTA — manual retry re-dispatches the evaluation */}
                  {awaitingConfig.action === 'retry' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleRetry();
                      }}
                      disabled={isRunning || !applicationIdInput.trim()}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowClockwise className="h-3 w-3" aria-hidden="true" />
                      {locale === 'es' ? 'Reintentar' : 'Retry'}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearAndReset(); }}
                  className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 flex-shrink-0"
                  aria-label={locale === 'es' ? 'Descartar' : 'Dismiss'}
                >
                  <X className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                </button>
              </div>
            )}

            {!isRunning && !awaiting && error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
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
            {!isRunning && !awaiting && resultLabel && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle weight="fill" className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-neutral-900 dark:text-white truncate flex-1">
                    {resultLabel}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (trace) setShowExecution(true); }}
                    className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors whitespace-nowrap"
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

                {/* Credit check block — rendered when the backend includes credit_check
                    in the completed evaluation. not_evaluated and absent → renders nothing. */}
                {result && 'creditCheck' in result && result.creditCheck && (
                  <CreditCheckBlock
                    creditCheck={result.creditCheck}
                    locale={locale}
                    formatCurrency={formatCurrency}
                  />
                )}

                {/* Certificate actions — available once the study completed */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleDownloadCertificate(); }}
                    disabled={downloadingCert}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors active:scale-[0.97]',
                      'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {downloadingCert ? (
                      <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <DownloadSimple weight="bold" className="h-3.5 w-3.5" />
                    )}
                    {locale === 'es' ? 'Descargar certificado' : 'Download certificate'}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActionError(null);
                      setSendSuccess(null);
                      setShowSendForm((s) => !s);
                    }}
                    aria-expanded={showSendForm}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors active:scale-[0.97]',
                      'border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200',
                      'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    )}
                  >
                    <PaperPlaneTilt weight="bold" className="h-3.5 w-3.5" />
                    {locale === 'es' ? 'Enviar al propietario' : 'Send to owner'}
                  </button>
                </div>

                {/* Send-to-owner inline form. Recipient is the property OWNER's
                    email, entered manually for now (owner-email resolution pending). */}
                {showSendForm && (
                  <div
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.03] p-3 space-y-2"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder={locale === 'es' ? 'Correo del propietario' : "Owner's email"}
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0c0c0e] px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      maxLength={120}
                      placeholder={locale === 'es' ? 'Nombre (opcional)' : 'Name (optional)'}
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0c0c0e] px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleSendToOwner(); }}
                      disabled={sendingEmail || !ownerEmail.trim()}
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors active:scale-[0.97]',
                        'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {sendingEmail ? (
                        <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PaperPlaneTilt weight="bold" className="h-3.5 w-3.5" />
                      )}
                      {locale === 'es' ? 'Enviar certificado' : 'Send certificate'}
                    </button>
                  </div>
                )}

                {sendSuccess && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle weight="fill" className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{sendSuccess}</span>
                  </div>
                )}

                {actionError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <Warning weight="fill" className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{actionError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live activity ticker */}
        {lastAction && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/50">
            <div className="relative overflow-hidden rounded-lg bg-neutral-50/80 dark:bg-white/[0.03] px-3 py-2">
              {/* Shimmer sweep */}
              <div className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-white/60 dark:via-white/[0.06] to-transparent w-1/2" />
              <div className="relative flex items-center gap-2">
                {/* Animated dots */}
                <div className="flex items-center gap-[3px] flex-shrink-0">
                  <span className="h-[5px] w-[5px] rounded-full bg-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                  <span className="h-[5px] w-[5px] rounded-full bg-emerald-400 animate-[pulse_1.5s_ease-in-out_0.3s_infinite]" />
                  <span className="h-[5px] w-[5px] rounded-full bg-emerald-300 animate-[pulse_1.5s_ease-in-out_0.6s_infinite]" />
                </div>
                <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200 truncate flex-1">{lastAction.title}</p>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap tabular-nums">{lastAction.time}</span>
              </div>
            </div>
          </div>
        )}

        {/* View detail hint */}
        <div className="mt-2.5 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
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
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
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
              className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-lg shadow-neutral-200/60 dark:shadow-black/40 p-3"
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
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0c0c0e] px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { void handleRun(); }}
                disabled={!applicationIdInput.trim() || isRunning}
                className={cn(
                  'mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors',
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
