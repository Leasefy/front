'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useLenis } from '@/components/providers/SmoothScroll';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import {
  X,
  Robot,
  Sparkle,
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
import { useCandidateDocuments } from '@/lib/hooks/useDocuments';
import {
  partitionScoreBreakdown,
  type PartitionedScoreBreakdown,
} from '@/lib/utils/score-breakdown';
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
  PreScoringStudy,
} from '@/lib/api/applications.types';

// ============================================================================
// Props
// ============================================================================

export type CandidateAction = 'approve' | 'reject' | 'request-info';

interface CandidateDrawerProps {
  candidate: LandlordCandidate | null;
  onClose: () => void;
  onAction: (type: CandidateAction, candidate: LandlordCandidate) => void;
  /**
   * Kept for caller compatibility; no longer invoked. The drawer used to call
   * this after triggering a fresh AI re-evaluation — that trigger was removed
   * in T-0024 (the panel now reads the pre-scoring study the candidate
   * already paid for, instead of dispatching a new one).
   */
  onReevaluated?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_LABELS: Record<LandlordApplicationStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Postulado',
  UNDER_REVIEW: 'En revisión',
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
  // El back aún emite 'preapprove' como recomendación; se muestra con palabra viva (docs/VOCABULARIO.md).
  preapprove: { label: 'Pasar a revisión', color: 'text-primary', icon: ShieldCheck },
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

/**
 * El envoltorio: es dueño del `Sheet` y de nada más.
 *
 * Antes el componente entero hacía `if (!candidate) return null` con
 * `<Sheet open>` fijo, y cerrar era desmontarlo de un tirón. Radix anima la
 * salida sólo si el contenido sigue montado con `data-state="closed"` mientras
 * dura la animación, así que el cajón se cortaba en seco (Nico, 2026-09-04).
 *
 * `useUltimoPresente` conserva al candidato durante la salida: en el render
 * del cierre `candidate` ya es null y el cajón se iría deslizando en blanco.
 * Y el cuerpo va DENTRO del `SheetContent` para que Radix lo desmonte al
 * cerrar: así el polling de la evaluación no queda vivo con el cajón cerrado,
 * y abrir a otro candidato lo vuelve a montar limpio.
 */
export function CandidateDrawer({ candidate, onClose, onAction }: CandidateDrawerProps) {
  const ultimo = useUltimoPresente(candidate);

  return (
    <Sheet open={Boolean(candidate)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        hideCloseButton
        aria-describedby={undefined}
        className="w-full sm:max-w-2xl !p-0 flex flex-col gap-0 bg-background"
      >
        {ultimo && (
          <CuerpoDelCandidato candidate={ultimo} onClose={onClose} onAction={onAction} />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface CuerpoDelCandidatoProps {
  /** Nunca null: el envoltorio no monta el cuerpo sin candidato. */
  candidate: LandlordCandidate;
  onClose: () => void;
  onAction: (type: CandidateAction, candidate: LandlordCandidate) => void;
}

function CuerpoDelCandidato({ candidate, onClose, onAction }: CuerpoDelCandidatoProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [noEvaluationYet, setNoEvaluationYet] = useState(false);

  const [isMatching, setIsMatching] = useState(false);
  const [matchingResults, setMatchingResults] = useState<SmartMatchingResponse | null>(null);
  const [matchingError, setMatchingError] = useState<string | null>(null);

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
  // El cuerpo sólo existe con el cajón abierto, así que el freno es montar y
  // el suelte es desmontar — ya no hace falta mirar si hay candidato.
  const lenis = useLenis();
  useEffect(() => {
    lenis.stop();
    return () => {
      lenis.start();
    };
  }, [lenis]);

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
                // Agent micro unreachable — backend 503. Evaluation state intact.
                // Stop polling and surface the error; there is no re-trigger from
                // this drawer (T-0024 removed the front-side trigger).
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
  }, [candidate]);

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

  // During polling, suppress the candidate.riskScore fallback to avoid showing the stale value
  const level = evaluation?.level ?? (isPolling ? undefined : candidate.riskScore?.level);
  const totalScore = evaluation?.totalScore ?? (isPolling ? undefined : candidate.riskScore?.totalScore);
  const levelColor = level ? LEVEL_COLORS[level] : null;
  const recommendation = evaluation?.recommendation ? RECOMMENDATION_LABELS[evaluation.recommendation] : null;

  /**
   * Las 5 dimensiones reales, con las mitades del crédito aparte.
   *
   * `main.length > 0` y no `Object.keys(...)`: un desglose que sólo trajera
   * `bureau` y `asegurabilidad` dejaría `main` vacío y pintaría el título
   * «Cómo se compone» sobre la nada.
   */
  const particion =
    evaluation?.score_breakdown && Object.keys(evaluation.score_breakdown).length > 0
      ? partitionScoreBreakdown(evaluation.score_breakdown)
      : null;
  const desglose = particion && particion.main.length > 0 ? particion : null;

  const requiresManualReview = evaluation?.requires_manual_review === true;
  const isOpenForDecision = candidate.status === 'SUBMITTED' || candidate.status === 'UNDER_REVIEW';
  /*
   * Aprobar sólo desde «en revisión»: la máquina de estados no permite saltar
   * de SUBMITTED a APPROVED (application-state-machine.ts).
   *
   * Y el botón **nunca** sale apagado por la revisión manual: las alertas de
   * integridad se anuncian a la vista, junto al botón, y la confirmación las
   * nombra. La decisión sigue siendo de la persona, que es de quien siempre
   * fue. (Antes el motivo del bloqueo vivía en un `title=` — un tooltip; un
   * botón apagado sin decir por qué no es una salvaguarda, es un callejón.)
   */
  const canApprove = candidate.status === 'UNDER_REVIEW';
  const canReject = isOpenForDecision;
  const canRequestInfo = isOpenForDecision;
  const hayAcciones = canApprove || canReject || canRequestInfo;

  return (
    <>
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
            <section className="rounded-lg border border-success/30 bg-success-soft/60 dark:bg-success/20 p-5 space-y-3">
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
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-surface dark:bg-ink border border-success/30 hover:bg-success-soft text-success text-sm font-semibold transition-colors"
                >
                  Ver contrato
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href={`/panel/inmobiliaria/contratos/nuevo?applicationId=${candidate.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-success hover:bg-success text-white text-sm font-semibold transition-colors"
                >
                  Crear contrato
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </section>
          )}

          {/* Terminal: contract flow collapsed (rechazo definitivo o cancelación). */}
          {candidate.status === 'CONTRACT_FAILED' && (
            <section className="rounded-lg border border-danger/30 bg-danger-soft/60 p-5 space-y-3">
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
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-surface dark:bg-ink border border-danger/30 hover:bg-danger-soft text-danger text-sm font-semibold transition-colors"
                >
                  Ver contrato cancelado
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </section>
          )}

          {/*
            Pre-scoring study — the candidate already paid for and completed
            this study (Fianly) when they applied. The panel reads the result
            pinned to THIS application (never the tenant's currently vigent
            order — that's a back-side invariant, see contract.md §3.2) and
            never triggers a new one. T-0024.
          */}
          <section className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Estudio de preescoring</h3>
                <p className="text-xs text-fg-muted">Resultado del estudio de asegurabilidad que ya pagó el candidato</p>
              </div>
            </div>
            <PreScoringStudyPanel study={candidate.preScoringStudy} />
          </section>

          {/* AI Scoring Block */}
          <section className={cn(
            'rounded-lg border p-5 space-y-4',
            levelColor ? `${levelColor.bg} ${levelColor.border}` : 'bg-muted border-border'
          )}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-surface dark:bg-ink flex items-center justify-center">
                <Robot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Análisis IA · Tenant Scoring</h3>
                <p className="text-xs text-fg-muted">Generado por el agente de evaluación de riesgo</p>
              </div>
            </div>

            {isLoadingAI ? (
              <div className="flex items-center justify-center py-6">
                <DSSpinner size="sm" variant="muted" />
              </div>
            ) : noEvaluationYet ? (
              <div className="rounded-lg bg-surface-muted p-3 border border-border">
                <p className="text-xs text-fg-muted">
                  Este candidato aún no tiene un análisis de IA generado por el agente.
                </p>
              </div>
            ) : aiError ? (
              <div className="flex items-start gap-2 text-xs text-fg-muted">
                <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            ) : (
              <>
                {/* El score, con el color del nivel sólo en su ficha. */}
                {level && totalScore !== undefined && levelColor && (
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border',
                        levelColor.bg,
                        levelColor.border,
                      )}
                    >
                      <span className={cn('font-mono text-2xl font-bold', levelColor.text)}>
                        {level}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-3xl font-semibold leading-none text-foreground tabular-nums">
                        {totalScore}
                        <span className="ml-0.5 text-sm font-normal text-fg-muted">/100</span>
                      </p>
                      <p className="mt-1.5 text-xs text-fg-muted">{LEVEL_DESCRIPTIONS[level]}</p>
                    </div>
                  </div>
                )}

                {/* La misma advertencia va también al pie, junto a los botones.
                    Acá se dice corto: el detalle está en las alertas de abajo. */}
                {requiresManualReview && (
                  <p className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                    <WarningCircle className="mt-px h-4 w-4 flex-shrink-0" />
                    <span>
                      <span className="font-semibold">Pide revisión manual.</span> El agente
                      encontró inconsistencias entre los documentos — están listadas abajo.
                    </span>
                  </p>
                )}

                {/*
                  * Cómo se compone el score.
                  *
                  * Antes se pintaban las SIETE llaves del agente en una grilla
                  * pareja, y los pesos sumaban **130%**: `bureau` y
                  * `asegurabilidad` no son dimensiones, son las dos mitades de
                  * `credito` (credito = (bureau + asegurabilidad) / 2). Ponerlas
                  * al lado contaba el crédito dos veces.
                  *
                  * `partitionScoreBreakdown` existía desde antes, con su test,
                  * y no lo usaba nadie: separarlas era el motivo por el que se
                  * escribió.
                  */}
                {desglose && (
                  <div className="space-y-3">
                    <p className="text-overline text-fg-subtle">Cómo se compone</p>
                    <div className="space-y-2.5">
                      {desglose.main.map(([key, factor]) => (
                        <FactorDelScore
                          key={key}
                          etiqueta={SCORE_BREAKDOWN_LABELS[key] ?? key}
                          valor={factor.value}
                          peso={factor.weight}
                          detalle={
                            key === 'credito' && desglose.creditDetail ? (
                              <DetalleDeCredito detalle={desglose.creditDetail} />
                            ) : null
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Respaldo: evaluaciones viejas, sin `score_breakdown`. */}
                {!desglose && evaluation?.subscores && (
                  <div className="space-y-3">
                    <p className="text-overline text-fg-subtle">Cómo se compone</p>
                    <div className="space-y-2.5">
                      {evaluation.subscores.financialStability !== undefined && (
                        <FactorDelScore
                          etiqueta="Estabilidad financiera"
                          valor={evaluation.subscores.financialStability}
                        />
                      )}
                      {evaluation.subscores.rentalHistory !== undefined && (
                        <FactorDelScore
                          etiqueta="Historial de arriendo"
                          valor={evaluation.subscores.rentalHistory}
                        />
                      )}
                      {evaluation.subscores.documentVerification !== undefined && (
                        <FactorDelScore
                          etiqueta="Verificación de documentos"
                          valor={evaluation.subscores.documentVerification}
                        />
                      )}
                      {evaluation.subscores.personalProfile !== undefined && (
                        <FactorDelScore
                          etiqueta="Perfil personal"
                          valor={evaluation.subscores.personalProfile}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                {recommendation && (
                  <div className="rounded-lg bg-surface-muted p-3 flex items-start gap-2 border border-border">
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
                  <div className="rounded-lg bg-surface-muted p-3 border border-border">
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
                  <div className="rounded-lg bg-warning-soft border border-warning/30 p-3">
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
                  <p className="text-xs text-fg-muted">
                    Aún no hay análisis disponible.
                  </p>
                )}
              </>
            )}
          </section>

          {/* Smart Matching Block */}
          <section className="rounded-lg border border-border bg-card p-5 space-y-4">
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
                  <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
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
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-border dark:border-border-strong dark:hover:border-border dark:border-border-strong hover:bg-muted/50 transition-all group"
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
          <section className="rounded-lg border border-border bg-card p-5 space-y-4">
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
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Renders the candidate's Fianly pre-scoring study, already paid for at
 * application time (T-0024 contract.md §3.2). Four states, none of which may
 * render a blank panel:
 *  - `study` null/absent → an honest "no study" state.
 *  - `carriers: []` with `maxAsegurableCop` present → ceiling-only, the
 *    common case for every order that predates the per-carrier column. Must
 *    NOT look like "no study".
 *  - `status: 'EXPIRED'` → still shown, labeled — the study stayed valid for
 *    the application it was filed under.
 *  - Full result → verdict-adjacent ceiling + per-carrier viability rows.
 *
 * Exported for direct unit testing (see CandidateDrawer.test.tsx).
 */
export function PreScoringStudyPanel({ study }: { study: PreScoringStudy | null | undefined }) {
  if (!study) {
    return (
      <div className="rounded-lg bg-surface-muted p-3 border border-border" data-testid="prescoring-panel-empty">
        <p className="text-xs text-fg-muted">
          Este candidato no tiene un estudio de preescoring registrado para esta postulación.
        </p>
      </div>
    );
  }

  const carriers = study.carriers ?? [];
  const isExpired = study.status === 'EXPIRED';

  return (
    <div className="space-y-3" data-testid="prescoring-panel-full">
      {isExpired && (
        <div className="rounded-md bg-warning-soft border border-warning/30 px-3 py-2 flex items-start gap-2" data-testid="prescoring-expired-badge">
          <Info className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-warning">
            El estudio venció, pero el resultado sigue siendo válido para esta postulación.
          </p>
        </div>
      )}

      {study.maxAsegurableCop != null ? (
        <div>
          <p className="text-xs text-fg-muted">Monto máximo asegurable</p>
          <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
            {formatCurrency(study.maxAsegurableCop)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-fg-muted">Este estudio no registró un monto máximo asegurable.</p>
      )}

      {study.completedAt && (
        <p className="text-xs text-fg-muted">
          Completado el{' '}
          {new Date(study.completedAt).toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      {carriers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Aseguradoras evaluadas</p>
          {carriers.map((carrier) => (
            <div
              key={carrier.name}
              className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-2.5 border border-border"
              data-testid="prescoring-carrier-row"
            >
              <span className="text-xs text-foreground truncate">{carrier.name}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                {carrier.maxAsegurableCop != null ? (
                  <span className="text-xs font-semibold text-foreground tabular-nums font-mono">
                    {formatCurrency(carrier.maxAsegurableCop)}
                  </span>
                ) : (
                  // Nullable per contract §3.1/§9 amendment 2 — the back emits `null` for a
                  // carrier that will not back the tenant. MUST NOT fall through to
                  // formatCurrency: it null-coalesces to 0 and renders a false "$0" ceiling,
                  // which reads as "will back you for zero pesos" instead of "will not back you".
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium text-danger"
                    data-testid="prescoring-carrier-no-cover"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Sin cobertura
                  </span>
                )}
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium', carrier.viable ? 'text-success' : 'text-danger')}>
                  {carrier.viable ? (
                    <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {carrier.viable ? 'Viable' : 'No viable'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-fg-muted" data-testid="prescoring-ceiling-only-note">
          El detalle por aseguradora no está disponible para este estudio; se muestra el monto máximo asegurable global.
        </p>
      )}
    </div>
  );
}

function colorDeValor(value: number): string {
  return value >= 75 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-danger';
}

/**
 * Una dimensión del score, en fila. (El merge con develop había fusionado el
 * encabezado del SubscoreBar de HEAD —muerto, sin usos— con este cuerpo.)
 */
function FactorDelScore({
  etiqueta,
  valor,
  peso,
  detalle,
}: {
  etiqueta: string;
  valor: number;
  peso?: number;
  detalle?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{etiqueta}</span>
        {peso !== undefined && (
          <span className="shrink-0 text-[11px] text-fg-subtle">
            pesa <span className="font-mono tabular-nums">{peso}%</span>
          </span>
        )}
        <span className="w-9 shrink-0 text-right font-mono text-sm font-semibold text-foreground tabular-nums">
          {valor}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn('h-full rounded-full transition-all', colorDeValor(valor))}
          style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
        />
      </div>
      {detalle}
    </div>
  );
}

/**
 * Las dos mitades del crédito, colgando de su dimensión.
 *
 * Y sobre todo: **un buró que no contestó no es un buró que dio cero.** El
 * agente marca `source: 'experian_via_fianly_unavailable'` justo para eso, y
 * la pantalla lo pintaba como un 0 que arrastra el crédito a la mitad. Un cero
 * inventado le baja el score a una persona por una falla nuestra.
 */
function DetalleDeCredito({
  detalle,
}: {
  detalle: NonNullable<PartitionedScoreBreakdown['creditDetail']>;
}) {
  const { bureau, asegurabilidad, bureauUnavailable } = detalle;
  return (
    <div className="mt-2 ml-3 space-y-1.5 border-l border-border pl-3">
      {bureau && (
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[11px] text-fg-muted">Buró de crédito</span>
          {bureauUnavailable ? (
            <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">
              Sin dato — el buró no respondió
            </span>
          ) : (
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground">
              {bureau.value}
            </span>
          )}
        </div>
      )}
      {asegurabilidad && (
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[11px] text-fg-muted">Asegurabilidad</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground">
            {asegurabilidad.value}
          </span>
        </div>
      )}
      {bureauUnavailable && (
        <p className="text-[11px] leading-snug text-warning">
          El crédito se calculó con la mitad de la información, así que este puntaje está por
          debajo de lo que le corresponde.
        </p>
      )}
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
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-muted hover:border-primary/30 dark:hover:border-primary/30 transition-colors group">
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
