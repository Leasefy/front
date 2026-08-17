'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useLenis } from '@/components/providers/SmoothScroll';
import {
  X,
  Robot,
  Sparkle,
  ArrowClockwise,
  MagnifyingGlass,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  XCircle,
  Envelope,
  User,
  ArrowUpRight,
  Info,
  FileText,
  DownloadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner as DSSpinner } from '@/components/ui/spinner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { IconButton } from '@leasefy/cadence';
import { formatCurrency } from '@/lib/format';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { ChatThread } from '@/components/messages/ChatThread';
import { agentCreditsApi } from '@/lib/api/agent-credits.service';
import { useCandidateDocuments } from '@/lib/hooks/useDocuments';
import { useContractByApplication } from '@/lib/hooks/useContracts';
import { getAccessToken, ApiError } from '@/lib/api/client';
import type { DocumentItem } from '@/lib/api/documents.service';
import type {
  LandlordCandidate,
  LandlordApplicationStatus,
  EvaluationResult,
  IntegrityFlag,
  Observation,
  ScoreBreakdown,
  SmartMatchingResponse,
} from '@/lib/api/applications.types';
import type { AgentCreditsBalance } from '@/lib/api/agent-credits.service';

// ============================================================================
// Props
// ============================================================================

export type CandidateAction = 'preapprove' | 'approve' | 'reject' | 'request-info';

interface CandidateDrawerProps {
  candidate: LandlordCandidate | null;
  onClose: () => void;
  onAction: (type: CandidateAction, candidate: LandlordCandidate) => void;
  onReevaluated?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_LABELS: Record<LandlordApplicationStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Postulado',
  UNDER_REVIEW: 'En revisión',
  // «Pre-aprobado» no significa nada para quien lo lee (docs/VOCABULARIO.md), y
  // la tabla de Postulaciones ya lo mostraba como «En revisión». Acá seguía
  // diciendo lo otro: la misma postulación se llamaba distinto en la lista y en
  // su propio cajón, que es lo que hacía preguntar por qué no se podía aprobar
  // «algo que está en revisión».
  PREAPPROVED: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  NEEDS_INFO: 'Pide info',
  WITHDRAWN: 'Retirado',
  CONTRACT_FAILED: 'Contrato fallido',
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-success-soft', text: 'text-success', border: 'border-success/30' },
  B: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/30' },
  C: { bg: 'bg-warning-soft', text: 'text-warning', border: 'border-warning/30' },
  D: { bg: 'bg-danger-soft', text: 'text-danger', border: 'border-danger/30' },
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  A: 'Candidato con perfil financiero sólido y riesgo muy bajo',
  B: 'Perfil aceptable, riesgo bajo-moderado',
  C: 'Riesgo moderado — considerar documentación adicional',
  D: 'Riesgo alto — requiere análisis detallado o rechazo',
};

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  approve: { label: 'Aprobar', color: 'text-success', icon: CheckCircle },
  preapprove: { label: 'Pre-aprobar', color: 'text-primary', icon: ShieldCheck },
  needs_info: { label: 'Pedir más información', color: 'text-warning', icon: Info },
  reject: { label: 'Rechazar', color: 'text-danger', icon: XCircle },
};

const INTEGRITY_FLAG_MESSAGES: Record<string, string> = {
  metadata_modified: 'El documento fue modificado después de creado',
  suspicious_producer: 'El documento fue editado con herramienta no permitida',
  name_mismatch: 'El nombre no coincide entre documentos',
  employer_mismatch: 'El empleador no coincide entre documentos',
  salary_mismatch: 'El salario declarado difiere más del 10%',
  date_inconsistency: 'Las fechas entre documentos son inconsistentes',
  credit_score_discrepancy: 'El reporte de crédito adjunto difiere del score verificado',
};

/**
 * Los factores del score, con el nombre que usa quien los lee.
 *
 * Sin entrada acá se pinta la llave cruda del agente: en el panel real salían
 * «bureau» y «asegurabilidad» en minúscula, mezclados entre etiquetas bien
 * escritas. La llave es contrato con el agente; el rótulo es nuestro.
 */
const SCORE_BREAKDOWN_LABELS: Record<string, string> = {
  solvencia: 'Solvencia',
  credito: 'Crédito',
  bureau: 'Buró de crédito',
  asegurabilidad: 'Asegurabilidad',
  estabilidad_laboral: 'Estabilidad laboral',
  consistencia_cruzada: 'Consistencia',
  consistencia: 'Consistencia',
  identidad: 'Identidad',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  // Frontend canonical (uppercase)
  ID_DOCUMENT: 'Cédula de ciudadanía',
  BANK_STATEMENT: 'Extracto bancario',
  INCOME_PROOF: 'Comprobante de ingresos',
  EMPLOYMENT_LETTER: 'Carta laboral',
  PAY_STUB: 'Desprendible de nómina',
  CREDIT_REPORT: 'Reporte de crédito',
  OTHER: 'Otro documento',
  // Agent output (snake_case Spanish)
  cedula: 'Cédula de ciudadanía',
  extracto_bancario: 'Extracto bancario',
  certificado_ingresos: 'Certificado de ingresos',
  contrato_laboral: 'Contrato laboral',
  nomina: 'Nómina',
  reporte_credito: 'Reporte de crédito',
  // No es un documento: es un cruce ENTRE documentos. Sin esta entrada se
  // pintaba la llave cruda —«cross_validation»— donde va el nombre del papel.
  cross_validation: 'Entre documentos',
};

// ============================================================================
// Drawer component
// ============================================================================

export function CandidateDrawer({ candidate, onClose, onAction, onReevaluated }: CandidateDrawerProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [noEvaluationYet, setNoEvaluationYet] = useState(false);

  const [isReevaluating, setIsReevaluating] = useState(false);
  const [reevalMessage, setReevalMessage] = useState<string | null>(null);
  const [reevalError, setReevalError] = useState<string | null>(null);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  const [isMatching, setIsMatching] = useState(false);
  const [matchingResults, setMatchingResults] = useState<SmartMatchingResponse | null>(null);
  const [matchingError, setMatchingError] = useState<string | null>(null);

  const [creditsBalance, setCreditsBalance] = useState<AgentCreditsBalance | null>(null);

  const { documents, isLoading: isLoadingDocs, error: docsError } = useCandidateDocuments(candidate?.id);
  // Only relevant when the candidate was approved — we skip the request otherwise
  const { contract: existingContract } = useContractByApplication(
    candidate?.status === 'APPROVED' ? candidate?.id : null
  );

  // Polling state for re-evaluation
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Pause Lenis smooth scroll while the drawer is open so native scrolling
  // inside the panel works. Without this, wheel events get hijacked by Lenis.
  const lenis = useLenis();
  useEffect(() => {
    if (candidate) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [candidate, lenis]);

  // Escape / overlay close + portal + scroll-lock are owned by the Cadence Sheet
  // (Radix Dialog) shell below — no manual handlers needed.

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Stop polling when the drawer is closed or the candidate changes
  useEffect(() => {
    return () => stopPolling();
  }, [candidate, stopPolling]);

  const refreshCreditsBalance = useCallback(async () => {
    try {
      const balance = await agentCreditsApi.getBalance();
      setCreditsBalance(balance);
    } catch {
      // Silently fail — we show 'saldo: -' in that case
    }
  }, []);

  // Fetch consolidated evaluation result when a candidate is opened.
  // Landlords/agencies use /evaluations/:id/result — NOT /scoring/* (tenant-only).
  useEffect(() => {
    if (!candidate) return;
    let cancelled = false;

    async function loadAIData() {
      if (!candidate) return;
      setIsLoadingAI(true);
      setAiError(null);
      setNoEvaluationYet(false);
      try {
        const result = await landlordApplicationsApi.getEvaluationResult(candidate.id);
        if (cancelled) return;

        // If the evaluation is still running, start polling every 2 min and
        // keep the section in "loading" state — don't show partial/stale data.
        const pending = result.status === 'pending' || result.status === 'queued' || result.status === 'running';
        if (pending) {
          setEvaluation(null);
          setIsPolling(true);
          pollingRef.current = setInterval(async () => {
            try {
              const r = await landlordApplicationsApi.getEvaluationResult(candidate.id);
              if (r.status === 'completed') {
                setEvaluation(r);
                setIsLoadingAI(false);
                stopPolling();
              } else if (r.status === 'failed') {
                setAiError('El agente no pudo completar la evaluación. Intentá de nuevo.');
                setIsLoadingAI(false);
                stopPolling();
              }
            } catch (err) {
              if (err instanceof ApiError && err.status === 503) {
                // Agent micro unreachable — backend 503. No credit deducted, evaluation state intact.
                // Stop polling and surface the error; user can retry via "Re-evaluar".
                setAiError('Servicio temporalmente no disponible. Reintenta en unos minutos.');
                setIsLoadingAI(false);
                stopPolling();
                return;
              }
              // Keep polling on other transient errors.
            }
          }, 120_000); // 2 minutes
          return;
        }

        setEvaluation(result);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Error cargando análisis';
        if (/404|not found|no.*encontr/i.test(msg)) {
          setNoEvaluationYet(true);
        } else {
          setAiError(msg);
        }
      } finally {
        if (!cancelled && !pollingRef.current) setIsLoadingAI(false);
      }
    }

    loadAIData();
    return () => { cancelled = true; };
  }, [candidate]);

  // Reset transient state when candidate changes
  useEffect(() => {
    setMatchingResults(null);
    setMatchingError(null);
    setReevalMessage(null);
    setReevalError(null);
    setCreditsExhausted(false);
  }, [candidate]);

  // Load credits balance when the drawer opens
  useEffect(() => {
    if (!candidate) return;
    refreshCreditsBalance();
  }, [candidate, refreshCreditsBalance]);

  const handleReevaluate = useCallback(async () => {
    if (!candidate) return;
    setIsReevaluating(true);
    setReevalMessage(null);
    setReevalError(null);
    setCreditsExhausted(false);
    try {
      const res = await landlordApplicationsApi.triggerReevaluation(candidate.id);
      const triggerTime = Date.now();
      const expectedRunId = res.runId;

      setReevalMessage('Re-evaluación en curso. Esperando nuevo resultado...');
      onReevaluated?.();
      refreshCreditsBalance();

      // Clear the stale result and start polling for the new one
      setEvaluation(null);
      setNoEvaluationYet(false);
      setAiError(null);
      setIsLoadingAI(true);
      setIsPolling(true);

      pollingRef.current = setInterval(async () => {
        try {
          const result = await landlordApplicationsApi.getEvaluationResult(candidate.id);

          // If the agent explicitly failed, stop and show error
          if (result.status === 'failed') {
            setAiError('El agente no pudo completar la evaluación. Intentá de nuevo.');
            setIsLoadingAI(false);
            stopPolling();
            return;
          }

          // Accept result if runId matches OR if completedAt is newer than trigger
          const isNew =
            (expectedRunId && result.runId === expectedRunId) ||
            (result.completedAt && new Date(result.completedAt).getTime() > triggerTime);
          if (isNew) {
            setEvaluation(result);
            setIsLoadingAI(false);
            setReevalMessage('Re-evaluación completada.');
            stopPolling();
          }
        } catch (err) {
          if (err instanceof ApiError && err.status === 503) {
            // Agent micro unreachable — backend 503. No credit deducted, evaluation state intact.
            // Stop polling and surface the error; user can retry via "Re-evaluar".
            setReevalError('Servicio temporalmente no disponible. Reintenta en unos minutos.');
            setIsLoadingAI(false);
            stopPolling();
            return;
          }
          // Keep polling on other transient errors.
        }
      }, 3000);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Error al disparar la re-evaluación';
      if (/cr[eé]ditos?\s+insuficient|saldo.*insuficient/i.test(raw)) {
        setCreditsExhausted(true);
        setReevalError('No tienes créditos disponibles para ejecutar el agente.');
      } else {
        setReevalError(raw);
      }
    } finally {
      setIsReevaluating(false);
    }
  }, [candidate, onReevaluated, stopPolling, refreshCreditsBalance]);

  const handleSmartMatching = useCallback(async () => {
    if (!candidate) return;
    setIsMatching(true);
    setMatchingError(null);
    setMatchingResults(null);
    try {
      const res = await landlordApplicationsApi.triggerSmartMatching(candidate.id, 10);
      setMatchingResults(res);
    } catch (err) {
      setMatchingError(
        err instanceof Error ? err.message : 'Error al buscar propiedades compatibles'
      );
    } finally {
      setIsMatching(false);
    }
  }, [candidate]);

  if (!candidate) return null;

  // During polling, suppress the candidate.riskScore fallback to avoid showing the stale value
  const level = evaluation?.level ?? (isPolling ? undefined : candidate.riskScore?.level);
  const totalScore = evaluation?.totalScore ?? (isPolling ? undefined : candidate.riskScore?.totalScore);
  const levelColor = level ? LEVEL_COLORS[level] : null;
  const recommendation = evaluation?.recommendation ? RECOMMENDATION_LABELS[evaluation.recommendation] : null;

  const requiresManualReview = evaluation?.requires_manual_review === true;
  const canPreapprove = candidate.status === 'SUBMITTED' || candidate.status === 'UNDER_REVIEW';

  /*
   * Aprobar se puede desde «en revisión», que es lo que la pantalla dice.
   *
   * Antes sólo aparecía en PREAPPROVED **y** encima se dibujaba deshabilitado
   * cuando la evaluación pedía revisión manual. Dos problemas:
   *
   *  1. `PREAPPROVED` se muestra como «En revisión» (docs/VOCABULARIO.md: la
   *     palabra "pre-aprobado" no significa nada). Así que quien leía «En
   *     revisión» y no podía aprobar tenía razón en no entender.
   *  2. El motivo del bloqueo vivía en un `title=` — un tooltip. Un botón
   *     apagado sin decir por qué no es una salvaguarda, es un callejón.
   *
   * Ahora el botón **nunca** sale apagado: las alertas de integridad se
   * anuncian a la vista, junto al botón, y la confirmación las nombra. La
   * decisión sigue siendo de la persona, que es de quien siempre fue.
   */
  const canApprove =
    candidate.status === 'PREAPPROVED' ||
    candidate.status === 'UNDER_REVIEW' ||
    candidate.status === 'SUBMITTED';
  const canReject = canPreapprove || candidate.status === 'PREAPPROVED';
  const canRequestInfo = canPreapprove;
  const hayAcciones = canPreapprove || canApprove || canReject || canRequestInfo;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        hideCloseButton
        aria-describedby={undefined}
        className="w-full sm:max-w-2xl !p-0 flex flex-col gap-0 bg-background"
      >
        {/* sr-only title satisfies Dialog a11y; the visual header lives below */}
        <SheetTitle className="sr-only">{candidate.tenantName || 'Candidato'}</SheetTitle>
        {/* Header — flex-none keeps it pinned to the top of the panel */}
        <div className="flex-none bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground truncate">
                {candidate.tenantName || 'Candidato'}
              </h2>
              <p className="text-xs text-fg-muted truncate flex items-center gap-1.5">
                <Envelope className="w-3 h-3" />
                {candidate.tenantEmail}
              </p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="md"
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
            aria-label="Cerrar"
            className="flex-shrink-0"
          />
        </div>

        {/* Scrollable body — data-lenis-prevent so Lenis stays out of native scroll */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">Estado:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
              {STATUS_LABELS[candidate.status]}
            </span>
            <span className="text-sm text-fg-muted ml-auto">
              Postulado el {new Date(candidate.submittedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Contract CTA — shown FIRST when approved so the next step is obvious */}
          {candidate.status === 'APPROVED' && (
            <section className="rounded-xl border border-success/30 bg-success-soft/60 dark:bg-success/20 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-surface dark:bg-ink flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">
                    {existingContract ? 'Contrato en curso' : 'Candidato aprobado'}
                  </p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {existingContract
                      ? 'Ya hay un contrato creado para esta aplicación.'
                      : 'Ya puedes crear el contrato y enviarlo para firma.'}
                  </p>
                </div>
              </div>
              {existingContract ? (
                <Link
                  href={`/panel/inmobiliaria/contratos/${existingContract.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-surface dark:bg-ink border border-success/30 hover:bg-success-soft text-success text-sm font-semibold transition-colors"
                >
                  Ver contrato
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href={`/panel/inmobiliaria/contratos/nuevo?applicationId=${candidate.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-success hover:bg-success text-white text-sm font-semibold transition-colors"
                >
                  Crear contrato
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </section>
          )}

          {/* Terminal: contract flow collapsed (rechazo definitivo o cancelación). */}
          {candidate.status === 'CONTRACT_FAILED' && (
            <section className="rounded-xl border border-danger/30 bg-danger-soft/60 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-surface dark:bg-ink flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-danger" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Proceso de contrato cerrado</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    El contrato se canceló o fue rechazado definitivamente. Para reintentar con este candidato, necesitás una nueva aplicación.
                  </p>
                </div>
              </div>
              {existingContract && (
                <Link
                  href={`/panel/inmobiliaria/contratos/${existingContract.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-surface dark:bg-ink border border-danger/30 hover:bg-danger-soft text-danger text-sm font-semibold transition-colors"
                >
                  Ver contrato cancelado
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </section>
          )}

          {/* AI Scoring Block */}
          <section className={cn(
            'rounded-xl border p-5 space-y-4',
            levelColor ? `${levelColor.bg} ${levelColor.border}` : 'bg-muted border-border'
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-surface dark:bg-ink flex items-center justify-center">
                  <Robot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Análisis IA · Tenant Scoring</h3>
                  <p className="text-xs text-fg-muted">Generado por el agente de evaluación de riesgo</p>
                </div>
              </div>
              {/*
                * «Re-evaluar» queda comentado por pedido de Nico (2026-08-16):
                * esta pantalla es para DECIDIR sobre una persona, no para
                * gastar créditos re-corriendo al agente. La acción sigue viva
                * —`handleReevaluate` y el saldo de créditos no se tocaron—;
                * cuando se decida dónde va, se descomenta acá.
                *
                * <Button variant="secondary" size="sm" hideArrow
                *   onClick={handleReevaluate} disabled={isReevaluating} className="gap-1.5">
                *   {isReevaluating ? <DSSpinner size="xs" variant="current" />
                *                   : <ArrowClockwise className="w-3.5 h-3.5" />}
                *   Re-evaluar
                * </Button>
                */}
            </div>

            {/* Credits balance chip */}
            {creditsBalance && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-fg-muted">
                  <Sparkle className="w-3.5 h-3.5" />
                  <span>
                    Saldo:{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      {creditsBalance.total}
                    </span>{' '}
                    <span className="text-fg-muted">
                      créditos (1 por evaluación)
                    </span>
                  </span>
                </div>
                {(creditsBalance.planBalance > 0 || creditsBalance.purchasedBalance > 0) && (
                  <span className="text-fg-muted">
                    {creditsBalance.planBalance} del plan
                    {creditsBalance.purchasedBalance > 0 && ` + ${creditsBalance.purchasedBalance} comprados`}
                  </span>
                )}
              </div>
            )}

            {reevalMessage && (
              <div className="rounded-md bg-success-soft text-success flex items-center gap-2">
                {isPolling && <DSSpinner size="xs" variant="current" className="flex-shrink-0" />}
                {reevalMessage}
              </div>
            )}

            {creditsExhausted ? (
              <div className="rounded-xl bg-danger-soft border border-danger/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-danger flex items-center gap-1.5">
                  <WarningCircle className="w-4 h-4" />
                  Créditos de evaluación agotados
                </p>
                <p className="text-xs text-danger">
                  Cada evaluación del agente consume un crédito. Podés comprar un pack extra —
                  los créditos comprados no expiran.
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href="/panel/inmobiliaria/creditos"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-danger hover:opacity-90 text-white text-xs font-medium transition-colors"
                  >
                    Comprar créditos
                  </Link>
                  <Link
                    href="/panel/inmobiliaria/upgrade"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger/30 text-danger text-xs font-medium hover:bg-danger-soft transition-colors"
                  >
                    Ver planes
                  </Link>
                </div>
              </div>
            ) : reevalError ? (
              <div className="rounded-md bg-danger-soft text-danger">
                {reevalError}
              </div>
            ) : null}

            {isLoadingAI ? (
              <div className="flex items-center justify-center py-6">
                <DSSpinner size="sm" variant="muted" />
              </div>
            ) : noEvaluationYet ? (
              <div className="rounded-xl bg-surface-muted p-3 border border-border">
                <p className="text-xs text-fg-muted">
                  Este candidato todavía no tiene evaluación del agente.
                </p>
              </div>
            ) : aiError ? (
              <div className="flex items-start gap-2 text-xs text-fg-muted">
                <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            ) : (
              <>
                {/* Score display */}
                {level && totalScore !== undefined && levelColor && (
                  <div className="flex items-center gap-4">
                    <div className={cn('w-16 h-16 rounded-xl flex flex-col items-center justify-center', levelColor.bg, levelColor.border, 'border-2')}>
                      <span className={cn('text-2xl font-bold uppercase tracking-wide font-mono', levelColor.text)}>
                        {level}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-3xl font-bold text-foreground">{totalScore}<span className="text-sm font-normal text-fg-muted">/100</span></p>
                      <p className="text-xs text-fg-muted mt-0.5">{LEVEL_DESCRIPTIONS[level]}</p>
                    </div>
                  </div>
                )}

                {/* Requires manual review banner */}
                {requiresManualReview && (
                  <div className="rounded-xl bg-danger-soft border border-danger/30 p-3 flex items-start gap-2">
                    <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-danger">
                        Revisión manual requerida
                      </p>
                      <p className="text-xs text-danger mt-0.5">
                        Esta evaluación requiere revisión manual antes de tomar una decisión.
                        Se detectaron inconsistencias que deben ser verificadas.
                      </p>
                    </div>
                  </div>
                )}

                {/* Score breakdown */}
                {evaluation?.score_breakdown && Object.keys(evaluation.score_breakdown).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(evaluation.score_breakdown).map(([key, factor]) => (
                      <SubscoreBar
                        key={key}
                        label={SCORE_BREAKDOWN_LABELS[key] ?? key}
                        value={factor.value}
                        weight={factor.weight}
                      />
                    ))}
                  </div>
                )}

                {/* Fallback: legacy subscores */}
                {!evaluation?.score_breakdown && evaluation?.subscores && (
                  <div className="grid grid-cols-2 gap-2">
                    {evaluation.subscores.financialStability !== undefined && (
                      <SubscoreBar label="Estabilidad financiera" value={evaluation.subscores.financialStability} />
                    )}
                    {evaluation.subscores.rentalHistory !== undefined && (
                      <SubscoreBar label="Historial de arriendo" value={evaluation.subscores.rentalHistory} />
                    )}
                    {evaluation.subscores.documentVerification !== undefined && (
                      <SubscoreBar label="Verificación de docs" value={evaluation.subscores.documentVerification} />
                    )}
                    {evaluation.subscores.personalProfile !== undefined && (
                      <SubscoreBar label="Perfil personal" value={evaluation.subscores.personalProfile} />
                    )}
                  </div>
                )}

                {/* Recommendation */}
                {recommendation && (
                  <div className="rounded-xl bg-surface-muted p-3 flex items-start gap-2 border border-border">
                    <recommendation.icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', recommendation.color)} />
                    <div>
                      <p className="text-xs text-fg-muted">Recomendación del agente</p>
                      <p className={cn('text-sm font-semibold', recommendation.color)}>{recommendation.label}</p>
                      {evaluation?.confidence !== undefined && (
                        <p className="text-xs text-fg-muted mt-0.5">
                          Confianza: {Math.round(evaluation.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {evaluation?.summary && (
                  <div className="rounded-xl bg-surface-muted p-3 border border-border">
                    <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Sparkle className="w-3.5 h-3.5" />
                      Resumen
                    </p>
                    <p className="text-sm text-foreground">{evaluation.summary}</p>
                  </div>
                )}

                {/* Reasoning */}
                {evaluation?.reasoning && evaluation.reasoning.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Razonamiento</p>
                    <ul className="space-y-1.5">
                      {evaluation.reasoning.map((r, i) => (
                        <li key={i} className="text-xs text-fg-muted flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Integrity flags — structured fraud/inconsistency signals */}
                {evaluation?.integrity_flags && evaluation.integrity_flags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <WarningCircle className="w-3.5 h-3.5" />
                      Alertas de integridad
                    </p>
                    {evaluation.integrity_flags.map((flag, i) => (
                      <IntegrityFlagCard key={i} flag={flag} />
                    ))}
                  </div>
                )}

                {/* Legacy flags fallback */}
                {!evaluation?.integrity_flags && evaluation?.flags && evaluation.flags.length > 0 && (
                  <div className="rounded-xl bg-warning-soft border border-warning/30 p-3">
                    <p className="text-xs font-semibold text-warning mb-2 flex items-center gap-1">
                      <WarningCircle className="w-3.5 h-3.5" />
                      Alertas detectadas
                    </p>
                    <ul className="space-y-1">
                      {evaluation.flags.map((f, i) => (
                        <li key={i} className="text-xs text-warning">• {f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Observations — soft non-blocking warnings */}
                {evaluation?.observations && evaluation.observations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Observaciones</p>
                    {evaluation.observations.map((obs, i) => (
                      <ObservationCard key={i} observation={obs} />
                    ))}
                  </div>
                )}

                {!level && !evaluation && !aiError && (
                  <p className="text-xs text-fg-muted">Aún no hay análisis disponible.</p>
                )}
              </>
            )}
          </section>

          {/* Smart Matching Block */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
                  <MagnifyingGlass className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Smart Matching</h3>
                  <p className="text-xs text-fg-muted">Otras propiedades de tu portafolio que le podrían calzar</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                hideArrow
                onClick={handleSmartMatching}
                disabled={isMatching}
                isLoading={isMatching}
                className="gap-1.5"
              >
                {!isMatching && <MagnifyingGlass className="w-3.5 h-3.5" />}
                {isMatching ? 'Buscando...' : 'Buscar compatibles'}
              </Button>
            </div>

            {matchingError && (
              <div className="flex items-start gap-2 text-xs text-danger">
                <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{matchingError}</span>
              </div>
            )}

            {matchingResults && (
              <>
                {matchingResults.candidateProfile && (
                  <div className="rounded-xl bg-muted p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">Perfil detectado del candidato:</p>
                    <p className="text-fg-muted">
                      Ingresos: <span className="text-foreground">{formatCurrency(matchingResults.candidateProfile.monthlyIncome)}</span> · Presupuesto máx: <span className="text-foreground">{formatCurrency(matchingResults.candidateProfile.maxBudget)}</span>
                    </p>
                    {matchingResults.candidateProfile.preferredLocations &&
                      matchingResults.candidateProfile.preferredLocations.length > 0 && (
                        <p className="text-fg-muted">
                          Zonas preferidas: <span className="text-foreground">{matchingResults.candidateProfile.preferredLocations.join(', ')}</span>
                        </p>
                      )}
                  </div>
                )}

                {matchingResults.results.length === 0 ? (
                  <p className="text-xs text-fg-muted text-center py-4">
                    {matchingResults.message ?? 'No hay otras propiedades compatibles disponibles en tu portafolio.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matchingResults.results.map((r) => (
                      <Link
                        key={r.propertyId}
                        href={`/panel/inmobiliaria/inmuebles/${r.propertyId}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border dark:border-border-strong dark:hover:border-border dark:border-border-strong hover:bg-muted/50 transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-fg-muted dark:text-fg-subtle dark:group-hover:text-fg-muted dark:text-fg-subtle transition-colors">
                            {r.property.title}
                          </p>
                          <p className="text-xs text-fg-muted">
                            {r.property.neighborhood}, {r.property.city} · {r.property.bedrooms} hab · {formatCurrency(r.property.monthlyRent)}/mes
                          </p>
                        </div>
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="px-2 py-0.5 rounded-full bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle text-xs font-bold">
                            {r.compatibilityScore}%
                          </div>
                          <p className="text-[10px] text-fg-muted mt-0.5">match</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-fg-muted dark:text-fg-subtle dark:group-hover:text-fg-muted dark:text-fg-subtle transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {!matchingResults && !isMatching && !matchingError && (
              <p className="text-xs text-fg-muted">
                Haz clic en &ldquo;Buscar compatibles&rdquo; para que el agente analice tu portafolio y te sugiera propiedades que le podrían calzar mejor a este candidato.
              </p>
            )}
          </section>

          {/* Documents section */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              {/* `bg-surface-muted` es un token de TEXTO usado como fondo: pintaba
                  un disco gris claro, y encima el icono iba con ESE MISMO color
                  — invisible. El chip va con superficie, el icono con texto. */}
              <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center">
                <FileText className="w-4 h-4 text-fg-muted" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Documentos adjuntos</h3>
                <p className="text-xs text-fg-muted">Archivos cargados por el candidato</p>
              </div>
            </div>

            {/* Integrity flags from the AI agent */}
            {evaluation?.integrity_flags && evaluation.integrity_flags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <WarningCircle className="w-3.5 h-3.5 text-danger" />
                  Alertas del agente de verificación
                </p>
                {evaluation.integrity_flags.map((flag, i) => (
                  <IntegrityFlagCard key={i} flag={flag} />
                ))}
                <div className="rounded-md bg-warning-soft border border-warning/30 px-3 py-2">
                  <p className="text-xs text-warning">
                    La verificación final es responsabilidad de tu equipo. Revisa los documentos originales antes de tomar una decisión.
                  </p>
                </div>
              </div>
            )}

            {/* Documents list */}
            {isLoadingDocs ? (
              <div className="flex items-center justify-center py-4">
                <DSSpinner size="sm" variant="muted" />
              </div>
            ) : docsError ? (
              <div className="flex items-start gap-2 text-xs text-fg-muted">
                <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No se pudieron cargar los documentos.</span>
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-fg-muted text-center py-3">
                Este candidato no tiene documentos adjuntos aún.
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} applicationId={candidate.id} />
                ))}
              </div>
            )}
          </section>

          {/* Messages — chat with the candidate without leaving the drawer */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Mensajes</h3>
            <ChatThread applicationId={candidate.id} />
          </section>

        </div>

        {/*
          * Las acciones, al pie y siempre visibles.
          *
          * Estaban al FINAL del cuerpo con scroll, después del scoring, los
          * documentos y el chat: para decidir había que recorrer el cajón
          * entero. Decidir es a lo que se viene, así que no se scrollea.
          */}
        {hayAcciones && (
          <div className="flex-none border-t border-border bg-background px-6 py-4 space-y-3">
            {requiresManualReview && (
              // El motivo, a la vista. Antes vivía en un `title=`: el botón se
              // veía apagado y nadie podía saber por qué.
              <p className="flex items-start gap-2 text-xs text-danger">
                <WarningCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                <span>
                  El análisis marcó inconsistencias en los documentos. Revisá las alertas de
                  integridad antes de decidir.
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {canReject && (
                <Button
                  variant="destructive"
                  hideArrow
                  onClick={() => onAction('reject', candidate)}
                  className="flex-1 min-w-[8rem]"
                >
                  Rechazar
                </Button>
              )}
              {canRequestInfo && (
                <Button
                  variant="secondary"
                  hideArrow
                  onClick={() => onAction('request-info', candidate)}
                  className="flex-1 min-w-[8rem]"
                >
                  Pedir info
                </Button>
              )}
              {canPreapprove && (
                <Button
                  variant="secondary"
                  hideArrow
                  onClick={() => onAction('preapprove', candidate)}
                  className="flex-1 min-w-[8rem]"
                >
                  Pasar a revisión
                </Button>
              )}
              {/* Aprobar, SIEMPRE la última: es la acción que cierra el paso. */}
              {canApprove && (
                // success/green: Cadence Button has no success variant (logged gap) — real
                // Button keeps all DS states; only the fill is overridden for the missing tone.
                <Button
                  hideArrow
                  onClick={() => onAction('approve', candidate)}
                  className="flex-1 min-w-[8rem] bg-success text-white hover:bg-success/90"
                >
                  Aprobar
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function SubscoreBar({ label, value, weight }: { label: string; value: number; weight?: number }) {
  const color = value >= 75 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="rounded-md bg-surface-muted p-2 border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-fg-muted truncate">{label}</span>
        <div className="flex items-center gap-1.5">
          {weight !== undefined && (
            <span className="text-[10px] text-fg-subtle tabular-nums">{weight}%</span>
          )}
          <span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** `"3.625.317,5"` (colombiano) → `3625317.5`. */
function numeroColombiano(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

/** Qué se contrasta, con las dos cifras enfrentadas. */
export interface CaraACara {
  izqRotulo: string;
  izqValor: string;
  derRotulo: string;
  derValor: string;
  brecha?: string;
}

export interface AlertaExplicada {
  texto: string;
  caraACara?: CaraACara;
}

/**
 * Traduce el detalle técnico de una alerta a algo que se pueda leer.
 *
 * El agente devuelve el hallazgo tal como lo midió, y está bien que lo haga:
 *
 *     "ModDate posterior a CreationDate por 1623 día(s). Producer: 'pdf-lib…'"
 *     "Diferencia de salario entre contrato (6.419.000) y nómina/certificado
 *      (3.625.317,5) es del 43.5%, supera el umbral del 10%."
 *
 * Lo que no está bien es que eso sea lo único que se lee. La primera nombra
 * campos internos de un PDF; la segunda **sí** trae las dos cifras, pero
 * enterradas en una frase de sesenta palabras — y el titular de arriba decía
 * sólo «difiere más del 10%», sin decir de cuánto a cuánto.
 *
 * Devuelve `null` cuando no sabe traducir. Quien renderiza debe entonces
 * mostrar el detalle crudo **a la vista**: esconder lo que no reemplazamos
 * sería perder el dato.
 */
export function explicarAlerta(flag: IntegrityFlag): AlertaExplicada | null {
  const d = flag.detail ?? '';

  // ── Salario: el contrato dice una cosa y la nómina otra ──────────────────
  const salario = d.match(
    /entre\s+(.+?)\s*\(([\d.,]+)\)\s*y\s+(.+?)(?:\s*\(([\d.,]+)\)|:\s*([\d.,]+))\s*es del\s*([\d.,]+)\s*%/i,
  );
  if (salario) {
    const [, rotA, montoA, rotB, montoBpar, montoBdp, pct] = salario;
    const montoB = montoBpar ?? montoBdp;
    const umbral = d.match(/umbral del\s*([\d.,]+)\s*%/i)?.[1];
    const diferencia = pct.replace('.', ',');
    return {
      texto: umbral
        ? `Las dos cifras se llevan un ${diferencia}%, y el tope aceptado es ${umbral.replace('.', ',')}%. Pedí el soporte que las concilie antes de decidir.`
        : `Las dos cifras se llevan un ${diferencia}%. Pedí el soporte que las concilie antes de decidir.`,
      caraACara: {
        izqRotulo: rotA.trim(),
        izqValor: formatCurrency(numeroColombiano(montoA)),
        derRotulo: rotB.trim(),
        derValor: formatCurrency(numeroColombiano(montoB)),
        brecha: `${diferencia}% de diferencia`,
      },
    };
  }

  // ── Nombre: mismo humano escrito distinto, o dos humanos distintos ───────
  const nombre = d.match(
    /Nombre en\s+(.+?)\s*\('([^']+)'\)\s*no coincide con\s+(.+?)\s*\('([^']+)'\)/i,
  );
  if (nombre) {
    const [, fuenteA, nombreA, fuenteB, nombreB] = nombre;
    const palabras = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .sort()
        .join(' ');
    const mismasPalabras = palabras(nombreA) === palabras(nombreB);
    return {
      texto: mismasPalabras
        ? 'Son las mismas palabras en otro orden —apellidos primero—, no dos personas distintas. Suele pasar cuando la nómina se exporta del sistema de la empresa.'
        : 'Los nombres no coinciden. Verificá que los documentos sean de la misma persona antes de decidir.',
      caraACara: {
        izqRotulo: fuenteA.trim(),
        izqValor: nombreA,
        derRotulo: fuenteB.trim(),
        derValor: nombreB,
      },
    };
  }

  // ── Metadatos del PDF ────────────────────────────────────────────────────
  const dias = d.match(/ModDate posterior a CreationDate por\s+(\d+)\s+d/i)?.[1];
  const herramienta = d.match(/Producer:\s*'([^'(]+)/i)?.[1]?.trim();

  if (dias) {
    const n = Number(dias);
    const cuando =
      n >= 365
        ? `${Math.floor(n / 365)} año${Math.floor(n / 365) === 1 ? '' : 's'} después`
        : n >= 30
          ? `${Math.floor(n / 30)} mes${Math.floor(n / 30) === 1 ? '' : 'es'} después`
          : `${n} día${n === 1 ? '' : 's'} después`;
    return {
      texto: herramienta
        ? `El archivo se guardó otra vez ${cuando} de haberse creado, con ${herramienta}. No prueba que lo hayan alterado, pero conviene pedir el original.`
        : `El archivo se guardó otra vez ${cuando} de haberse creado. No prueba que lo hayan alterado, pero conviene pedir el original.`,
    };
  }

  if (herramienta) {
    return {
      texto: `El archivo pasó por ${herramienta}, una herramienta de edición de PDF. Conviene pedir el original al emisor.`,
    };
  }

  return null;
}

function IntegrityFlagCard({ flag }: { flag: IntegrityFlag }) {
  const message = INTEGRITY_FLAG_MESSAGES[flag.code] ?? flag.detail;
  const docLabel = flag.doc_type ? (DOC_TYPE_LABELS[flag.doc_type] ?? flag.doc_type) : null;
  const explicacion = explicarAlerta(flag);
  const hayDetalleCrudo = Boolean(flag.detail) && flag.detail !== message;

  const tono =
    flag.severity === 'high'
      ? { caja: 'bg-danger-soft border-danger/30', texto: 'text-danger', icono: WarningCircle }
      : flag.severity === 'medium'
        ? { caja: 'bg-warning-soft border-warning/30', texto: 'text-warning', icono: WarningCircle }
        : { caja: 'bg-muted border-border', texto: 'text-fg-muted', icono: Info };
  const Icono = tono.icono;

  return (
    <div className={cn('rounded-md border px-3 py-2.5', tono.caja)}>
      <p className={cn('flex items-start gap-1.5 text-xs font-semibold', tono.texto)}>
        <Icono className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        <span className="flex-1">{message}</span>
        {docLabel && <span className="font-normal whitespace-nowrap">— {docLabel}</span>}
      </p>

      {/* Las dos cifras enfrentadas: el titular decía «difiere más del 10%» sin
          decir nunca de cuánto a cuánto, que es lo único con lo que se puede
          hacer algo (llamar al empleador, pedir el desprendible que falta). */}
      {explicacion?.caraACara && (
        <div className="mt-2 ml-5 flex flex-wrap items-stretch gap-2">
          <ValorEnfrentado
            rotulo={explicacion.caraACara.izqRotulo}
            valor={explicacion.caraACara.izqValor}
            tono={tono.texto}
          />
          <ValorEnfrentado
            rotulo={explicacion.caraACara.derRotulo}
            valor={explicacion.caraACara.derValor}
            tono={tono.texto}
          />
          {explicacion.caraACara.brecha && (
            <span
              className={cn(
                'self-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                tono.texto,
                'border-current/30',
              )}
            >
              {explicacion.caraACara.brecha}
            </span>
          )}
        </div>
      )}

      {explicacion && (
        <p className={cn('mt-1.5 ml-5 text-xs font-normal opacity-90', tono.texto)}>
          {explicacion.texto}
        </p>
      )}

      {/* El crudo se esconde SÓLO si arriba se dijo lo mismo en cristiano. Sin
          traducción se muestra tal cual: tapar lo que no reemplazamos sería
          perder el dato. */}
      {hayDetalleCrudo &&
        (explicacion ? (
          <details className="mt-1 ml-5">
            <summary
              className={cn(
                'cursor-pointer list-none text-[11px] underline underline-offset-2 opacity-70',
                tono.texto,
              )}
            >
              Ver detalle técnico
            </summary>
            <p className={cn('mt-1 font-mono text-[11px] leading-relaxed opacity-80', tono.texto)}>
              {flag.detail}
            </p>
          </details>
        ) : (
          <p className={cn('mt-1 ml-5 text-xs font-normal opacity-90', tono.texto)}>{flag.detail}</p>
        ))}
    </div>
  );
}

/** Una de las dos cifras que se contrastan. */
function ValorEnfrentado({
  rotulo,
  valor,
  tono,
}: {
  rotulo: string;
  valor: string;
  tono: string;
}) {
  return (
    <div className={cn('rounded-md border border-current/20 bg-surface/60 px-2.5 py-1.5', tono)}>
      {/* Sin `uppercase`: el agente manda rótulos largos («nómina quincenal
          normalizada a mensual») y en mayúscula con tracking ocupan el doble. */}
      <p className="text-[10px] leading-tight opacity-70 first-letter:uppercase">{rotulo}</p>
      <p className="text-xs font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

function DocumentRow({ doc, applicationId }: { doc: DocumentItem; applicationId: string }) {
  const label = DOC_TYPE_LABELS[doc.type] ?? doc.type;
  const sizeKb = doc.size ? `${Math.round(doc.size / 1024)} KB` : null;
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.endsWith('.pdf');
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = useCallback(async () => {
    setIsOpening(true);
    try {
      // Use the local proxy route so the Supabase URL is never exposed in the browser
      const token = getAccessToken();
      const proxyUrl = `/api/docs/${doc.id}?app=${applicationId}`;
      // Fetch through proxy (auth header forwarded server-side)
      const res = await fetch(proxyUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('No se pudo abrir el documento');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      // silently ignore — button just stays enabled again
    } finally {
      setIsOpening(false);
    }
  }, [applicationId, doc.id]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-muted hover:border-primary/30 dark:hover:border-primary/30 transition-colors group">
      <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
        <FileText className={cn('w-4 h-4', isPdf ? 'text-danger' : 'text-fg-muted')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-fg-muted truncate">
          {doc.fileName ?? 'archivo'}
          {sizeKb && ` · ${sizeKb}`}
        </p>
      </div>
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        disabled={isOpening}
        aria-label="Ver / descargar"
        title="Ver / descargar"
        className="flex-shrink-0"
        icon={isOpening ? <DSSpinner size="xs" variant="current" /> : <DownloadSimple className="w-3.5 h-3.5" />}
      />
    </div>
  );
}

function ObservationCard({ observation }: { observation: Observation }) {
  const isWarning = observation.severity === 'warning';
  return (
    <div className={cn(
      'rounded-md px-3 py-2 border text-xs',
      isWarning
        ? 'bg-warning-soft text-warning'
        : 'bg-muted border-border text-fg-muted'
    )}>
      <p className="flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>{observation.message}</span>
      </p>
    </div>
  );
}
