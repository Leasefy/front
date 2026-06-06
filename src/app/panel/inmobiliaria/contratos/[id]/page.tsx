'use client';

// TODO(landlord-tradicional): este flujo de rechazo/edición/cancelación sólo vive bajo
// /panel/inmobiliaria/contratos/[id]/*. El panel landlord tradicional (route group `(landlord)`)
// usa rutas viejas tipo /panel/[propertyId]/contract/[candidateId] y no tiene estas features.
// Cuando se retome el panel landlord tradicional hay que portar: detail, editar, banner de
// modificaciones, historial de rechazos, botón cancelar, link al chat.
//
// TODO(mensajes-modulo): el botón "Abrir chat" sigue gateado por rol (useAgencyAccess.isManager)
// porque 'mensajes' aún no es módulo del backend. Cuando el backend lo agregue, migrar a
// canAccess('mensajes', 'view').

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CaretLeft,
  PaperPlaneTilt,
  PencilSimpleLine,
  CheckCircle,
  Spinner,
  WarningCircle,
  FileText,
  User,
  Buildings,
  Calendar,
  Clock,
  Info,
  Bell,
  ChatCircle,
  XCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { formatCurrency } from '@/lib/format';
import { PageGuard } from '@/components/auth/PageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAgencyAccess } from '@/lib/auth/useAgencyAccess';
import { AuditTrail } from '@/components/contract/AuditTrail';
import { RejectionsHistory } from '@/components/contract/RejectionsHistory';
import { CancelContractModal } from '@/components/contract/CancelContractModal';
import { DownloadContractPdfButton } from '@/components/contract/DownloadContractPdfButton';
import { useContract, useContractPreview, useContractActions, useContractRejections, useSignedPdfUrl, isPermissionError } from '@/lib/hooks/useContracts';
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/lib/types/contract';
import type { ContractStatus } from '@/lib/types/contract';

const PRE_SIGNED_STATES: ContractStatus[] = ['draft', 'pending_landlord', 'pending_tenant', 'rejected_pending_modifications'];

// ─── Content ─────────────────────────────────────────────────────────────────

function ContratoDetalleContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { contract, isLoading, error, refetch, setContract } = useContract(id);
  const { preview, isLoading: isLoadingPreview } = useContractPreview(id);
  const { rejections } = useContractRejections(id);
  const actions = useContractActions();

  // Cuando el contrato tiene al menos una firma, usamos /pdf para que el iframe muestre
  // el estampado actualizado (parcial o final). En DRAFT / PENDING_TENANT caemos al /preview
  // (original, más barato).
  const hasAnySignature = !!(contract?.tenantSignature || contract?.landlordSignature);
  const { url: signedPdfUrl, isLoading: isLoadingSignedPdf } = useSignedPdfUrl(id, {
    enabled: hasAnySignature,
  });
  const { canAccess } = usePermissions();
  // Chat todavía se gate por rol porque 'mensajes' aún no es módulo del backend.
  const { isManager } = useAgencyAccess();
  const canEditContracts = canAccess('contratos', 'edit');

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const runAction = useCallback(
    async (key: string, op: () => Promise<unknown>, successMessage?: string) => {
      setActionError(null);
      setPendingAction(key);
      try {
        const result = await op();
        if (result) {
          await refetch();
        } else {
          setActionError('La operación falló. Intentá de nuevo.');
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        setPendingAction(null);
      }
      void successMessage;
    },
    [refetch]
  );

  const handleSend = () => contract && runAction('send', () => actions.send(contract.id));
  const handleActivate = () => contract && runAction('activate', () => actions.activate(contract.id));
  const handleCancel = async (reason: string | undefined) => {
    if (!contract) return;
    setIsCancelling(true);
    const updated = await actions.cancel(contract.id, reason ? { reason } : {});
    setIsCancelling(false);
    if (!updated) {
      toast.error(
        isPermissionError(actions.lastError)
          ? 'No tenés permisos para esta acción.'
          : 'No se pudo cancelar el contrato.'
      );
      return;
    }
    toast.success('Contrato cancelado.');
    setIsCancelModalOpen(false);
    router.push('/panel/inmobiliaria/contratos');
  };
  const handleRemind = async () => {
    if (!contract) return;
    setActionError(null);
    setPendingAction('remind');
    try {
      const result = await actions.remind(contract.id);
      if (result) {
        setActionError(null);
      } else {
        setActionError('Ya enviaste un recordatorio recientemente. Intentá de nuevo más tarde.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      if (/429|too\s*many|24h/i.test(msg)) {
        setActionError('Ya enviaste un recordatorio en las últimas 24 horas.');
      } else {
        setActionError(msg);
      }
    } finally {
      setPendingAction(null);
    }
  };
  void setContract;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-700">No se pudo cargar el contrato</p>
            <p className="text-sm text-rose-600 mt-1">{error ?? 'Contrato no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusClass = CONTRACT_STATUS_COLORS[contract.status as ContractStatus] ?? '';
  const statusLabel = CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status;
  // Gate por permisos: contratos usa canAccess ('contratos' ya es módulo del backend).
  // Chat todavía usa el fallback por rol porque 'mensajes' no existe como módulo aún.
  const canCancel = canEditContracts && PRE_SIGNED_STATES.includes(contract.status as ContractStatus);
  const chatHref = isManager && contract.applicationId
    ? `/panel/inmobiliaria/mensajes?applicationId=${contract.applicationId}`
    : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <CaretLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">Contrato de arrendamiento</h1>
            <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusClass)}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">ID: {contract.id}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <DownloadContractPdfButton
            contractId={contract.id}
            contractStatus={contract.status}
            variant="secondary"
          />
          {chatHref && (
            <Link
              href={chatHref}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <ChatCircle className="w-4 h-4" />
              Abrir chat
            </Link>
          )}
        </div>
      </div>

      {/* Action panel — only shown for users with contratos:edit */}
      {canEditContracts && (
        <>
          <ActionPanel
            contract={contract}
            isSubmitting={actions.isSubmitting}
            pendingAction={pendingAction}
            latestRejectionReason={rejections[0]?.reason}
            canCancel={canCancel}
            onSend={handleSend}
            onActivate={handleActivate}
            onRemind={handleRemind}
            onSign={() => router.push(`/panel/inmobiliaria/contratos/${contract.id}/firmar`)}
            onEdit={() => router.push(`/panel/inmobiliaria/contratos/${contract.id}/editar`)}
            onCancelRequest={() => setIsCancelModalOpen(true)}
          />

          <CancelContractModal
            open={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleCancel}
            isSubmitting={isCancelling}
            actor="landlord"
          />
        </>
      )}

      {/* Rejection history — visible whenever there have been rejections */}
      {rejections.length > 0 && (
        <RejectionsHistory rejections={rejections} />
      )}

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-2">
          <WarningCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{actionError}</p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — info cards */}
        <div className="lg:col-span-1 space-y-4">
          <InfoCard title="Partes" icon={User}>
            <InfoRow label="Propietario" value={contract.landlordName} />
            <InfoRow label="Inquilino" value={contract.tenantName} />
          </InfoCard>

          <InfoCard title="Propiedad" icon={Buildings}>
            <InfoRow label="Dirección" value={contract.propertyAddress} />
            <InfoRow label="Ciudad" value={contract.propertyCity} />
          </InfoCard>

          <InfoCard title="Términos" icon={Calendar}>
            <InfoRow label="Inicio" value={formatDate(contract.startDate)} />
            <InfoRow label="Fin" value={formatDate(contract.endDate)} />
            <InfoRow label="Canon" value={formatCurrency(contract.monthlyRent)} />
            <InfoRow label="Día de pago" value={contract.paymentDueDay ? `Día ${contract.paymentDueDay}` : null} />
          </InfoCard>

          {contract.auditTrail && contract.auditTrail.length > 0 && (
            <InfoCard title="Historial" icon={Clock}>
              <AuditTrail contract={contract} rejections={rejections} />
            </InfoCard>
          )}
        </div>

        {/* Right — preview */}
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-foreground">Documento</h3>
            </div>
            <div className="p-5">
              {/* Cuando hay firma(s), el iframe usa la URL de /pdf (con estampado actualizado).
                  Si está cargando o no hay firmas, cae al /preview (HTML o PDF original). */}
              {hasAnySignature && (isLoadingSignedPdf || signedPdfUrl) ? (
                <div className="space-y-3">
                  {contract.tenantSignature && !contract.landlordSignature && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        Este PDF ya incluye la <strong>firma del inquilino</strong> y un certificado parcial.
                        Firmá abajo para completar el contrato.
                      </p>
                    </div>
                  )}
                  {contract.tenantSignature && contract.landlordSignature && (
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-800 dark:text-emerald-200">
                        PDF final con <strong>ambas firmas</strong>, certificado completo y hash SHA-256.
                      </p>
                    </div>
                  )}
                  {isLoadingSignedPdf ? (
                    <div className="py-20 flex items-center justify-center">
                      <Spinner className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <iframe
                      src={signedPdfUrl!}
                      className="w-full h-[720px] rounded-lg border border-border bg-white"
                      title="Contrato"
                    />
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Enlace válido por tiempo limitado. Si caduca, recargá la página.
                  </p>
                </div>
              ) : isLoadingPreview ? (
                <div className="py-20 flex items-center justify-center">
                  <Spinner className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : preview?.origin === 'UPLOADED_PDF' ? (
                <div className="space-y-3">
                  <iframe
                    src={preview.pdfUrl}
                    className="w-full h-[720px] rounded-lg border border-border bg-white"
                    title="Contrato"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Enlace válido por tiempo limitado. Si caduca, recargá la página.
                  </p>
                </div>
              ) : preview?.origin === 'GENERATED' ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  {...sanitizeContractHtml(preview.html)}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No hay vista previa disponible.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ActionPanel({
  contract,
  isSubmitting,
  pendingAction,
  latestRejectionReason,
  canCancel,
  onSend,
  onSign,
  onActivate,
  onRemind,
  onEdit,
  onCancelRequest,
}: {
  contract: { id: string; status: string };
  isSubmitting: boolean;
  pendingAction: string | null;
  latestRejectionReason?: string;
  canCancel: boolean;
  onSend: () => void;
  onSign: () => void;
  onActivate: () => void;
  onRemind: () => void;
  onEdit: () => void;
  onCancelRequest: () => void;
}) {
  const status = contract.status as ContractStatus;
  const cancelButton = canCancel ? (
    <button
      type="button"
      onClick={onCancelRequest}
      className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1"
    >
      <XCircle className="w-3.5 h-3.5" />
      Cancelar contrato
    </button>
  ) : null;

  if (status === 'draft') {
    return (
      <ActionBar
        title="Contrato en borrador"
        subtitle="Cuando lo envíes para firma, el inquilino firmará primero. Después te toca firmar a vos para cerrar."
        cta={{
          label: 'Enviar al inquilino',
          icon: PaperPlaneTilt,
          onClick: onSend,
          loading: isSubmitting && pendingAction === 'send',
        }}
        secondaryCta={{
          label: 'Editar',
          icon: PencilSimpleLine,
          onClick: onEdit,
        }}
        tone="indigo"
        footer={cancelButton}
      />
    );
  }

  if (status === 'pending_tenant') {
    return (
      <ActionBar
        title="Esperando firma del inquilino"
        subtitle="El inquilino recibió el contrato y tiene que firmar primero. Podés reenviarle un recordatorio si no lo hizo."
        cta={{
          label: 'Recordar firma',
          icon: Bell,
          onClick: onRemind,
          loading: isSubmitting && pendingAction === 'remind',
        }}
        secondaryCta={{
          label: 'Editar',
          icon: PencilSimpleLine,
          onClick: onEdit,
        }}
        tone="blue"
        footer={cancelButton}
      />
    );
  }

  if (status === 'pending_landlord') {
    return (
      <ActionBar
        title="El inquilino ya firmó — firmá para cerrar"
        subtitle="Es tu turno. Firmá y el contrato queda listo para activar en la fecha pactada."
        cta={{
          label: 'Firmar como propietario',
          icon: PencilSimpleLine,
          onClick: onSign,
        }}
        secondaryCta={{
          label: 'Editar',
          icon: PencilSimpleLine,
          onClick: onEdit,
        }}
        tone="amber"
        footer={cancelButton}
      />
    );
  }

  if (status === 'rejected_pending_modifications') {
    const truncated = latestRejectionReason && latestRejectionReason.length > 180
      ? latestRejectionReason.slice(0, 180).trimEnd() + '…'
      : latestRejectionReason;
    return (
      <ActionBar
        title="El inquilino solicitó cambios"
        subtitle={truncated ?? 'Editá los términos y volvé a firmar para enviarlo de nuevo.'}
        cta={{
          label: 'Corregir contrato',
          icon: PencilSimpleLine,
          onClick: onEdit,
        }}
        tone="amber"
        footer={cancelButton}
      />
    );
  }

  if (status === 'signed') {
    return (
      <ActionBar
        title="Contrato firmado"
        subtitle="Ambas partes firmaron. Activalo para iniciar el arrendamiento."
        cta={{
          label: 'Activar contrato',
          icon: CheckCircle,
          onClick: onActivate,
          loading: isSubmitting && pendingAction === 'activate',
        }}
        tone="emerald"
      />
    );
  }

  if (status === 'active') {
    return (
      <ActionBar
        title="Contrato activo"
        subtitle="El arrendamiento está en curso. Los pagos se registran automáticamente."
        tone="emerald"
      />
    );
  }

  return null;
}

function ActionBar({
  title,
  subtitle,
  cta,
  secondaryCta,
  tone,
  footer,
}: {
  title: string;
  subtitle: string;
  cta?: { label: string; icon: React.ElementType; onClick: () => void; loading?: boolean };
  secondaryCta?: { label: string; icon: React.ElementType; onClick: () => void };
  tone: 'indigo' | 'amber' | 'blue' | 'emerald';
  footer?: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, { bg: string; border: string; button: string }> = {
    indigo: {
      bg: 'bg-indigo-50/60 dark:bg-indigo-950/20',
      border: 'border-indigo-200 dark:border-indigo-800',
      button: 'bg-indigo-600 hover:bg-indigo-700',
    },
    amber: {
      bg: 'bg-amber-50/60 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    blue: {
      bg: 'bg-blue-50/60 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    emerald: {
      bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      button: 'bg-emerald-600 hover:bg-emerald-700',
    },
  };
  const c = toneClasses[tone];

  return (
    <section className={cn('rounded-2xl border p-5 space-y-3', c.bg, c.border)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <secondaryCta.icon className="w-4 h-4" />
              {secondaryCta.label}
            </button>
          )}
          {cta && (
            <button
              onClick={cta.onClick}
              disabled={cta.loading}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50',
                c.button
              )}
            >
              {cta.loading ? <Spinner className="w-4 h-4 animate-spin" /> : <cta.icon className="w-4 h-4" />}
              {cta.label}
            </button>
          )}
        </div>
      </div>
      {footer && (
        <div className="flex justify-end pt-2 border-t border-border/40">
          {footer}
        </div>
      )}
    </section>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{display}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function ContratoDetallePage() {
  return (
    <PageGuard module="contratos" action="view">
      <ContratoDetalleContent />
    </PageGuard>
  );
}
