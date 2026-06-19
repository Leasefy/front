'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaretLeft, User, Spinner, ArrowsClockwise, Sparkle, ArrowUpRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { propertiesApi } from '@/lib/api/properties.service';
import { PageGuard } from '@/components/auth/PageGuard';
import { CandidateDrawer } from '@/components/inmobiliaria/CandidateDrawer';
import { useContracts } from '@/lib/hooks/useContracts';
import type { LandlordCandidate, LandlordApplicationStatus } from '@/lib/api/applications.types';
import type { Property } from '@/lib/types/property';
import type { Contract } from '@/lib/types/contract';

// ─── Status display ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LandlordApplicationStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT:           { label: 'Borrador',          bg: 'bg-neutral-100 dark:bg-neutral-800',    text: 'text-neutral-600 dark:text-neutral-400' },
  SUBMITTED:       { label: 'Postulado',         bg: 'bg-blue-100 dark:bg-blue-900/30',        text: 'text-blue-700 dark:text-blue-400' },
  UNDER_REVIEW:    { label: 'En revisión',       bg: 'bg-indigo-100 dark:bg-indigo-900/30',   text: 'text-indigo-700 dark:text-indigo-400' },
  PREAPPROVED:     { label: 'Pre-aprobado',      bg: 'bg-violet-100 dark:bg-violet-900/30',   text: 'text-violet-700 dark:text-violet-400' },
  APPROVED:        { label: 'Aprobado',          bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  REJECTED:        { label: 'Rechazado',         bg: 'bg-rose-100 dark:bg-rose-900/30',       text: 'text-rose-700 dark:text-rose-400' },
  NEEDS_INFO:      { label: 'Pide info',         bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400' },
  WITHDRAWN:       { label: 'Retirado',          bg: 'bg-neutral-100 dark:bg-neutral-800',    text: 'text-neutral-500 dark:text-neutral-500' },
  CONTRACT_FAILED: { label: 'Contrato fallido',  bg: 'bg-rose-100 dark:bg-rose-900/30',       text: 'text-rose-700 dark:text-rose-400' },
};

const FALLBACK_STATUS = { label: 'Desconocido', bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-500' };

const SCORE_COLORS: Record<string, string> = {
  A: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  B: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  C: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  D: 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
};

// ─── Action modal ─────────────────────────────────────────────────────────────

type ActionType = 'preapprove' | 'approve' | 'reject' | 'request-info';

const ACTION_CONFIG: Record<
  ActionType,
  { title: string; label: string; placeholder: string; required: boolean; confirmLabel: string; confirmClass: string }
> = {
  preapprove: {
    title: 'Pre-aprobar candidato',
    label: 'Nota interna (opcional)',
    placeholder: 'Observaciones internas...',
    required: false,
    confirmLabel: 'Pre-aprobar',
    confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
  },
  approve: {
    title: 'Aprobar candidato',
    label: 'Nota interna (opcional)',
    placeholder: 'Observaciones finales...',
    required: false,
    confirmLabel: 'Aprobar',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
  reject: {
    title: 'Rechazar postulación',
    label: 'Motivo del rechazo',
    placeholder: 'Explicá el motivo del rechazo al candidato...',
    required: true,
    confirmLabel: 'Rechazar',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
  },
  'request-info': {
    title: 'Solicitar información',
    label: 'Mensaje al candidato',
    placeholder: '¿Qué información adicional necesitás?',
    required: true,
    confirmLabel: 'Enviar solicitud',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
  },
};

function ActionModal({
  type,
  candidateName,
  onConfirm,
  onClose,
}: {
  type: ActionType;
  candidateName: string;
  onConfirm: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const cfg = ACTION_CONFIG[type];
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cfg.required && !text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(text.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la acción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{cfg.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{candidateName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{cfg.label}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={cfg.placeholder}
              rows={3}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all resize-none"
            />
          </div>

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={(cfg.required && !text.trim()) || isSubmitting}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                cfg.confirmClass
              )}
            >
              {isSubmitting ? <Spinner className="w-4 h-4 animate-spin" /> : cfg.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

// Touch-only (pointer: coarse) hit-area expansion to >=44px for the
// approve/reject action chips. The visual chip stays 26px tall; an invisible
// ::after pseudo-element extends the tap target. Desktop (fine pointer) is
// untouched.
const COARSE_HIT_AREA =
  "relative [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:-inset-y-2.5 [@media(pointer:coarse)]:after:-inset-x-0.5 [@media(pointer:coarse)]:after:content-['']";

function CandidateActions({
  candidate,
  existingContract,
  onAction,
}: {
  candidate: LandlordCandidate;
  existingContract?: Contract | null;
  onAction: (type: ActionType, candidate: LandlordCandidate) => void;
}) {
  const { status } = candidate;

  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onAction('preapprove', candidate)}
          className={cn(COARSE_HIT_AREA, 'px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap')}
        >
          Pre-aprobar
        </button>
        <button
          onClick={() => onAction('request-info', candidate)}
          className={cn(COARSE_HIT_AREA, 'px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap')}
        >
          Pedir info
        </button>
        <button
          onClick={() => onAction('reject', candidate)}
          className={cn(COARSE_HIT_AREA, 'px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap')}
        >
          Rechazar
        </button>
      </div>
    );
  }

  if (status === 'PREAPPROVED') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onAction('approve', candidate)}
          className={cn(COARSE_HIT_AREA, 'px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap')}
        >
          Aprobar
        </button>
        <button
          onClick={() => onAction('reject', candidate)}
          className={cn(COARSE_HIT_AREA, 'px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap')}
        >
          Rechazar
        </button>
      </div>
    );
  }

  if (status === 'APPROVED') {
    // Si ya existe un contrato para esta aplicación, llevamos al detalle del contrato.
    // Si no, al formulario de creación.
    if (existingContract) {
      return (
        <Link
          href={`/panel/inmobiliaria/contratos/${existingContract.id}`}
          className={cn(COARSE_HIT_AREA, 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold transition-colors whitespace-nowrap')}
        >
          Ver contrato
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      );
    }
    return (
      <Link
        href={`/panel/inmobiliaria/contratos/nuevo?applicationId=${candidate.id}`}
        className={cn(COARSE_HIT_AREA, 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap')}
      >
        Crear contrato
        <ArrowUpRight className="w-3 h-3" />
      </Link>
    );
  }

  if (status === 'CONTRACT_FAILED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-medium whitespace-nowrap">
        Proceso cerrado
      </span>
    );
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function CandidatosContent() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [candidates, setCandidates] = useState<LandlordCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: ActionType;
    candidate: LandlordCandidate;
  } | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<LandlordCandidate | null>(null);

  // Cargamos contratos del landlord/agencia para saber cuáles aplicaciones ya tienen contrato.
  // Permite mostrar "Ver contrato" en vez de "Crear contrato" en la fila correspondiente.
  const { getByApplicationId: getContractByApplicationId } = useContracts();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [propertyData, candidatesData] = await Promise.all([
        propertiesApi.getById(propertyId),
        landlordApplicationsApi.getCandidates(propertyId),
      ]);
      setProperty(propertyData);
      setCandidates(candidatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = useCallback((type: ActionType, candidate: LandlordCandidate) => {
    setActionModal({ type, candidate });
  }, []);

  const handleConfirmAction = useCallback(async (text: string) => {
    if (!actionModal) return;
    const { type, candidate } = actionModal;
    const id = candidate.id;
    switch (type) {
      case 'preapprove':
        await landlordApplicationsApi.preapprove(id, text ? { notes: text } : {});
        break;
      case 'approve':
        await landlordApplicationsApi.approve(id, text ? { notes: text } : {});
        break;
      case 'reject':
        await landlordApplicationsApi.reject(id, text);
        break;
      case 'request-info':
        await landlordApplicationsApi.requestInfo(id, text);
        break;
    }
    await fetchData();
  }, [actionModal, fetchData]);

  // Stats
  const activeCount     = candidates.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const preapprovedCount = candidates.filter((c) => c.status === 'PREAPPROVED').length;
  const approvedCount   = candidates.filter((c) => c.status === 'APPROVED').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.push('/panel/inmobiliaria/propiedades')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          Volver a propiedades
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Candidatos</h1>
            {property && (
              <p className="text-muted-foreground mt-1 text-sm">
                {property.title} · {property.neighborhood}, {property.city}
              </p>
            )}
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors text-sm w-fit"
          >
            <ArrowsClockwise className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{activeCount}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">En revisión</p>
          </div>
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{preapprovedCount}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-0.5">Pre-aprobados</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Aprobados</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {candidates.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Sin candidatos</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aún no hay postulaciones para esta propiedad
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-contain">
            <table className="w-full min-w-[580px] [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Candidato
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Score
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const statusCfg = STATUS_CONFIG[candidate.status] ?? FALLBACK_STATUS;
                  const initials = candidate.tenantName
                    ? candidate.tenantName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                    : '?';

                  return (
                    <tr
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      {/* Tenant */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              {candidate.tenantName || '—'}
                              <Sparkle className="w-3 h-3 text-indigo-500" aria-label="Ver análisis IA" />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.tenantEmail || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="p-4">
                        {candidate.riskScore ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                                SCORE_COLORS[candidate.riskScore.level] ?? 'text-neutral-600 bg-neutral-100'
                              )}
                            >
                              {candidate.riskScore.level}
                            </span>
                            <span className="text-sm font-semibold text-foreground tabular-nums">
                              {candidate.riskScore.totalScore}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                            <Sparkle className="w-3 h-3" />
                            Ver resultado
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', statusCfg.bg, statusCfg.text)}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(candidate.submittedAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <CandidateActions
                          candidate={candidate}
                          existingContract={getContractByApplicationId(candidate.id)}
                          onAction={handleAction}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action modal */}
      {actionModal && (
        <ActionModal
          type={actionModal.type}
          candidateName={actionModal.candidate.tenantName || actionModal.candidate.id.slice(0, 8)}
          onConfirm={handleConfirmAction}
          onClose={() => setActionModal(null)}
        />
      )}

      {/* Candidate detail drawer (AI scoring + smart matching) */}
      <CandidateDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onAction={(type, candidate) => {
          setSelectedCandidate(null);
          setActionModal({ type, candidate });
        }}
        onReevaluated={fetchData}
      />
    </div>
  );
}

export default function CandidatosPage() {
  return (
    <PageGuard module="portafolio">
      <CandidatosContent />
    </PageGuard>
  );
}
