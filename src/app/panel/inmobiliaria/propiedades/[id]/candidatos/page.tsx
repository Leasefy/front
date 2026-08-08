'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Sparkle, ArrowUpRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import { Button, Textarea, EmptyState, Badge, Spinner, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { ErrorState } from '@/components/ui/error-state';
import { BackButton } from '@leasefy/cadence';
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
  DRAFT:           { label: 'Borrador',          bg: 'bg-surface-muted',  text: 'text-fg-muted' },
  SUBMITTED:       { label: 'Postulado',         bg: 'bg-primary-soft',   text: 'text-primary' },
  UNDER_REVIEW:    { label: 'En revisión',       bg: 'bg-primary-soft',   text: 'text-primary' },
  // "Pre-aprobado" no significa nada para quien lo lee (ver docs/VOCABULARIO.md):
  // mientras el backend siga emitiendo PREAPPROVED, se muestra como "En revisión".
  PREAPPROVED:     { label: 'En revisión',       bg: 'bg-primary-soft',   text: 'text-primary' },
  APPROVED:        { label: 'Aprobado',          bg: 'bg-success-soft',   text: 'text-success' },
  REJECTED:        { label: 'Rechazado',         bg: 'bg-danger-soft',    text: 'text-danger' },
  NEEDS_INFO:      { label: 'Pide info',         bg: 'bg-warning-soft',   text: 'text-warning' },
  WITHDRAWN:       { label: 'Retirado',          bg: 'bg-surface-muted',  text: 'text-fg-muted' },
  CONTRACT_FAILED: { label: 'Contrato fallido',  bg: 'bg-danger-soft',    text: 'text-danger' },
};

const FALLBACK_STATUS = { label: 'Desconocido', bg: 'bg-surface-muted', text: 'text-fg-muted' };

// Status → Cadence Badge variant (mirrors STATUS_CONFIG tints).
const STATUS_VARIANT: Record<
  LandlordApplicationStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  UNDER_REVIEW: 'default',
  PREAPPROVED: 'secondary',
  APPROVED: 'success',
  REJECTED: 'destructive',
  NEEDS_INFO: 'warning',
  WITHDRAWN: 'secondary',
  CONTRACT_FAILED: 'destructive',
};

const SCORE_COLORS: Record<string, string> = {
  A: 'text-success bg-success-soft',
  B: 'text-primary bg-primary-soft',
  C: 'text-warning bg-warning-soft',
  D: 'text-danger bg-danger-soft',
};

// ─── Action modal ─────────────────────────────────────────────────────────────

type ActionType = 'preapprove' | 'approve' | 'reject' | 'request-info';

type ConfirmVariant = 'default' | 'destructive';

const ACTION_CONFIG: Record<
  ActionType,
  { title: string; label: string; placeholder: string; required: boolean; confirmLabel: string; confirmVariant: ConfirmVariant }
> = {
  preapprove: {
    title: 'Pre-aprobar candidato',
    label: 'Mensaje al candidato (opcional)',
    placeholder: 'Mensaje que verá el candidato...',
    required: false,
    confirmLabel: 'Pre-aprobar',
    confirmVariant: 'default',
  },
  approve: {
    title: 'Aprobar candidato',
    label: 'Mensaje al candidato (opcional)',
    placeholder: 'Mensaje que verá el candidato...',
    required: false,
    confirmLabel: 'Aprobar',
    confirmVariant: 'default',
  },
  reject: {
    title: 'Rechazar postulación',
    label: 'Motivo del rechazo',
    placeholder: 'Explicá el motivo del rechazo al candidato...',
    required: true,
    confirmLabel: 'Rechazar',
    confirmVariant: 'destructive',
  },
  'request-info': {
    title: 'Solicitar información',
    label: 'Mensaje al candidato',
    placeholder: '¿Qué información adicional necesitás?',
    required: true,
    confirmLabel: 'Enviar solicitud',
    confirmVariant: 'default',
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
      <div className="w-full max-w-md bg-card rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-fg">{cfg.title}</h2>
          <p className="text-sm text-fg-muted mt-0.5">{candidateName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">{cfg.label}</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={cfg.placeholder}
              rows={3}
              autoFocus
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={cfg.confirmVariant}
              hideArrow
              isLoading={isSubmitting}
              disabled={(cfg.required && !text.trim()) || isSubmitting}
              className="flex-1"
            >
              {cfg.confirmLabel}
            </Button>
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
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('preapprove', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-primary-soft text-primary hover:bg-primary-soft/80 whitespace-nowrap')}
        >
          Pre-aprobar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('request-info', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-warning-soft text-warning hover:bg-warning-soft/80 whitespace-nowrap')}
        >
          Pedir info
        </Button>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('reject', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-danger-soft text-danger hover:bg-danger-soft/80 whitespace-nowrap')}
        >
          Rechazar
        </Button>
      </div>
    );
  }

  if (status === 'PREAPPROVED') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('approve', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-success-soft text-success hover:bg-success-soft/80 whitespace-nowrap')}
        >
          Aprobar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('reject', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-danger-soft text-danger hover:bg-danger-soft/80 whitespace-nowrap')}
        >
          Rechazar
        </Button>
      </div>
    );
  }

  if (status === 'APPROVED') {
    // Si ya existe un contrato para esta aplicación, llevamos al detalle del contrato.
    // Si no, al formulario de creación.
    if (existingContract) {
      return (
        <Button
          asChild
          variant="outline"
          size="sm"
          hideArrow
          className={cn(COARSE_HIT_AREA, 'border-success/30 text-success hover:bg-success-soft whitespace-nowrap')}
        >
          <Link href={`/panel/inmobiliaria/contratos/${existingContract.id}`}>
            Ver contrato
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </Button>
      );
    }
    return (
      <Button
        asChild
        size="sm"
        hideArrow
        className={cn(COARSE_HIT_AREA, 'bg-success text-white hover:opacity-90 whitespace-nowrap')}
      >
        <Link href={`/panel/inmobiliaria/contratos/nuevo?applicationId=${candidate.id}`}>
          Crear contrato
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </Button>
    );
  }

  if (status === 'CONTRACT_FAILED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-danger-soft text-danger text-xs font-medium whitespace-nowrap">
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

  // Once content has loaded, background refresh failures must NOT swap the
  // page for the full ErrorState (silent auto-refresh contract).
  const hasLoadedRef = useRef(false);

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
      hasLoadedRef.current = true;
    } catch (err) {
      if (!hasLoadedRef.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      }
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData);

  const handleAction = useCallback((type: ActionType, candidate: LandlordCandidate) => {
    setActionModal({ type, candidate });
  }, []);

  const handleConfirmAction = useCallback(async (text: string) => {
    if (!actionModal) return;
    const { type, candidate } = actionModal;
    const id = candidate.id;
    switch (type) {
      case 'preapprove':
        await landlordApplicationsApi.preapprove(id, text ? { message: text } : {});
        break;
      case 'approve':
        await landlordApplicationsApi.approve(id, text ? { message: text } : {});
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

  // Stats — solo dos destinos posibles: en revisión o aprobado (docs/VOCABULARIO.md).
  // PREAPPROVED cuenta como "en revisión": no es un estado que el usuario deba distinguir.
  const activeCount   = candidates.filter(
    (c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW' || c.status === 'PREAPPROVED',
  ).length;
  const approvedCount = candidates.filter((c) => c.status === 'APPROVED').length;

  // Solo bloquea la vista en el primer load — los auto-refresh son silenciosos.
  if (isLoading && !property) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState description={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <BackButton
          label="Volver a propiedades"
          onClick={() => router.push('/panel/inmobiliaria/propiedades')}
        />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Candidatos</h1>
            {property && (
              <p className="text-sm text-fg-muted max-w-2xl">
                {property.title} · {property.neighborhood}, {property.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CandidateStatTile value={activeCount} label="En revisión" tone="info" />
          <CandidateStatTile value={approvedCount} label="Aprobados" tone="ok" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {candidates.length === 0 ? (
          <EmptyState
            icon={User}
            title="Sin candidatos"
            description="Aún no hay postulaciones para esta propiedad"
          />
        ) : (
          <div className="overflow-x-auto overscroll-contain">
            <Table className="w-full min-w-[580px] [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
              <TableHeader>
                <TableRow className="border-b border-border bg-surface-muted">
                  <TableHead>Candidato</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="p-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => {
                  const statusCfg = STATUS_CONFIG[candidate.status] ?? FALLBACK_STATUS;
                  const initials = candidate.tenantName
                    ? candidate.tenantName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                    : '?';

                  return (
                    <TableRow
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      {/* Tenant */}
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-surface-brand flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fg flex items-center gap-1.5">
                              {candidate.tenantName || '—'}
                              <Sparkle className="w-3 h-3 text-primary" aria-label="Ver análisis IA" />
                            </p>
                            <p className="text-xs text-fg-muted">
                              {candidate.tenantEmail || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Score */}
                      <TableCell className="p-4">
                        {candidate.riskScore ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold',
                                SCORE_COLORS[candidate.riskScore.level] ?? 'text-fg-muted bg-surface-muted'
                              )}
                            >
                              {candidate.riskScore.level}
                            </span>
                            <span className="text-sm font-semibold text-fg tabular-nums">
                              {candidate.riskScore.totalScore}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                            <Sparkle className="w-3 h-3" />
                            Ver resultado
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="p-4">
                        <Badge variant={STATUS_VARIANT[candidate.status] ?? 'secondary'}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="p-4">
                        <span className="text-sm text-fg-muted">
                          {new Date(candidate.submittedAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                        <CandidateActions
                          candidate={candidate}
                          existingContract={getContractByApplicationId(candidate.id)}
                          onAction={handleAction}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

// KPI tile — número, label e ícono parejos; tint semántico por token.
const CANDIDATE_TILE_TONES = {
  neutral: 'bg-surface-muted text-fg-muted',
  ok: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
} as const;

function CandidateStatTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: keyof typeof CANDIDATE_TILE_TONES;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', CANDIDATE_TILE_TONES[tone])}>
        <User className="w-5 h-5" weight="duotone" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-fg tabular-nums leading-none">{value}</p>
        <p className="text-xs text-fg-muted mt-1 truncate">{label}</p>
      </div>
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
