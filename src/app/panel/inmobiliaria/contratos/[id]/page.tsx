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
import { leerRespaldo, etiquetaDeTipo } from '@/lib/inmobiliaria/respaldo';
import Link from 'next/link';
import {
  CaretLeft,
  PaperPlaneTilt,
  PencilSimpleLine,
  CheckCircle,
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
  ShieldCheck,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { formatDate, formatCanon } from './format';
import { Button } from '@/components/ui/button';
import { Spinner, Badge } from '@/components/ui';
import { PageGuard } from '@/components/auth/PageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAgencyAccess } from '@/lib/auth/useAgencyAccess';
import { AuditTrail } from '@/components/contract/AuditTrail';
import { RejectionsHistory } from '@/components/contract/RejectionsHistory';
import { CancelContractModal } from '@/components/contract/CancelContractModal';
import { DownloadContractPdfButton } from '@/components/contract/DownloadContractPdfButton';
import { useContract, useContractPreview, useContractActions, useContractRejections, useSignedPdfUrl, isPermissionError } from '@/lib/hooks/useContracts';
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract';
import type { ContractStatus } from '@/lib/types/contract';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AdministracionDelContrato } from '@/components/contratos/AdministracionDelContrato';
import { ConceptosDelContrato } from '@/components/contratos/ConceptosDelContrato';

const PRE_SIGNED_STATES: ContractStatus[] = ['draft', 'pending_landlord', 'pending_tenant', 'rejected_pending_modifications'];

// ContractStatus → Cadence Badge tone (replaces the hand-rolled CONTRACT_STATUS_COLORS pill).
type ContractBadgeVariant = 'secondary' | 'warning' | 'default' | 'success' | 'destructive';
const CONTRACT_STATUS_BADGE: Record<ContractStatus, ContractBadgeVariant> = {
  draft: 'secondary',
  pending_landlord: 'warning',
  pending_tenant: 'default',
  rejected_pending_modifications: 'warning',
  signed: 'default',
  active: 'success',
  expired: 'secondary',
  cancelled: 'destructive',
};

// ─── Content ─────────────────────────────────────────────────────────────────

function ContratoDetalleContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { contract, isLoading, error, refetch, setContract } = useContract(id);
  // El respaldo vive en las cláusulas del contrato: es el campo real que
  // el backend persiste hoy. Ver src/lib/inmobiliaria/respaldo.ts.
  const respaldo = leerRespaldo(contract?.customClauses);
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
          ? 'No tienes permisos para esta acción.'
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
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que este contrato había sido eliminado, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <FalloDeCarga
          error={error}
          queEs="este contrato"
            onReintentar={() => void refetch()}
          volverA={{ label: 'Contratos', href: '/panel/inmobiliaria/contratos' }}
        />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-danger">No se pudo cargar el contrato</p>
            <p className="text-sm text-danger mt-1">{error ?? 'Contrato no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusVariant = CONTRACT_STATUS_BADGE[contract.status as ContractStatus] ?? 'neutral';
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
          <Button
            onClick={() => router.back()}
            variant="link"
            hideArrow
            className="mb-3 h-auto gap-1 px-0 text-muted-foreground hover:text-foreground hover:no-underline"
          >
            <CaretLeft className="w-4 h-4" /> Volver
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Contrato de arrendamiento</h1>
            <Badge variant={statusVariant}>
              {statusLabel}
            </Badge>
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
            <Button asChild variant="secondary" hideArrow className="gap-2">
              <Link href={chatHref}>
                <ChatCircle className="w-4 h-4" />
                Abrir chat
              </Link>
            </Button>
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
        <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2">
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{actionError}</p>
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
            {contract.propertyId === null && (
              <p className="text-sm text-muted-foreground">
                Sin inmueble vinculado.
              </p>
            )}
            <InfoRow label="Dirección" value={contract.propertyAddress} />
            <InfoRow label="Ciudad" value={contract.propertyCity} />
          </InfoCard>

          <InfoCard title="Términos" icon={Calendar}>
            <InfoRow label="Inicio" value={formatDate(contract.startDate)} />
            <InfoRow label="Fin" value={formatDate(contract.endDate)} />
            <InfoRow label="Canon" value={formatCanon(contract.monthlyRent)} />
            <InfoRow label="Día de pago" value={contract.paymentDueDay ? `Día ${contract.paymentDueDay}` : null} />
          </InfoCard>

          {/* Uso, periodicidad y comisión. Se guardaban desde la migración y no
              se veían en ninguna pantalla — y el uso decide si hay IVA. */}
          <AdministracionDelContrato
            contract={contract}
            puedeEditar={canEditContracts}
            onActualizado={(c) => setContract(c)}
          />

          {/* Los conceptos que este contrato cobra además del canon. Los
              recurrentes entran en el cobro de cada mes. */}
          <ConceptosDelContrato contract={contract} puedeEditar={canEditContracts} />

          {/* Paso 11: quién respalda este arriendo. Si no está, se dice — un
              contrato sin respaldo registrado no es un contrato sin respaldo,
              pero tampoco se puede afirmar que lo tiene. */}
          {respaldo ? (
            <InfoCard title="Respaldo del arriendo" icon={ShieldCheck}>
              <InfoRow label="Aseguradora" value={respaldo.aseguradora} />
              <InfoRow label="Tipo" value={etiquetaDeTipo(respaldo.tipo)} />
              <InfoRow label="Número" value={respaldo.identificador} />
              {(respaldo.vigenciaDesde || respaldo.vigenciaHasta) && (
                <InfoRow
                  label="Vigencia"
                  value={[respaldo.vigenciaDesde, respaldo.vigenciaHasta]
                    .filter(Boolean)
                    .join(' → ')}
                />
              )}
            </InfoCard>
          ) : (
            <InfoCard title="Respaldo del arriendo" icon={ShieldCheck}>
              <p className="text-sm text-muted-foreground">
                Este contrato no tiene registrada la aseguradora que aprobó ni el
                número de la póliza. Sin eso no hay a quién reclamarle si algo pasa.
              </p>
            </InfoCard>
          )}

          {contract.auditTrail && contract.auditTrail.length > 0 && (
            <InfoCard title="Historial" icon={Clock}>
              <AuditTrail contract={contract} rejections={rejections} />
            </InfoCard>
          )}
        </div>

        {/* Right — preview */}
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">Documento</h3>
            </div>
            <div className="p-5">
              {/* Cuando hay firma(s), el iframe usa la URL de /pdf (con estampado actualizado).
                  Si está cargando o no hay firmas, cae al /preview (HTML o PDF original). */}
              {hasAnySignature && (isLoadingSignedPdf || signedPdfUrl) ? (
                <div className="space-y-3">
                  {contract.tenantSignature && !contract.landlordSignature && (
                    <div className="rounded-xl border border-amber-600/30 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/15 px-4 py-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Este PDF ya incluye la <strong>firma del inquilino</strong> y un certificado parcial.
                        Firmá abajo para completar el contrato.
                      </p>
                    </div>
                  )}
                  {contract.tenantSignature && contract.landlordSignature && (
                    <div className="rounded-xl border border-emerald-600/30 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/15 px-4 py-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        PDF final con <strong>ambas firmas</strong>, certificado completo y hash SHA-256.
                      </p>
                    </div>
                  )}
                  {isLoadingSignedPdf ? (
                    <div className="py-20 flex items-center justify-center">
                      <Spinner size="default" variant="muted" />
                    </div>
                  ) : (
                    <iframe
                      src={signedPdfUrl!}
                      className="w-full h-[720px] rounded-md border border-border bg-white"
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
                  <Spinner size="sm" variant="muted" />
                </div>
              ) : preview?.origin === 'UPLOADED_PDF' ? (
                <div className="space-y-3">
                  <iframe
                    src={preview.pdfUrl}
                    className="w-full h-[720px] rounded-md border border-border bg-white"
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
    <Button
      type="button"
      variant="link"
      hideArrow
      onClick={onCancelRequest}
      className="h-auto gap-1 px-0 text-xs font-medium text-danger hover:text-danger"
    >
      <XCircle className="w-3.5 h-3.5" />
      Cancelar contrato
    </Button>
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
        subtitle={truncated ?? 'Edita los términos y vuelve a firmar para enviarlo de nuevo.'}
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
  const toneClasses: Record<typeof tone, string> = {
    indigo: 'bg-primary-soft/40 border-primary/30',
    blue: 'bg-primary-soft/40 border-primary/30',
    amber: 'bg-amber-50/60 border-amber-600/30 dark:bg-amber-900/20 dark:border-amber-500/40',
    emerald: 'bg-emerald-50/60 border-emerald-600/30 dark:bg-emerald-900/20 dark:border-emerald-500/40',
  };

  return (
    <section className={cn('rounded-xl border p-5 space-y-3', toneClasses[tone])}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryCta && (
            <Button variant="secondary" hideArrow onClick={secondaryCta.onClick} className="gap-2">
              <secondaryCta.icon className="w-4 h-4" />
              {secondaryCta.label}
            </Button>
          )}
          {cta && (
            <Button onClick={cta.onClick} disabled={cta.loading} hideArrow className="gap-2">
              {cta.loading ? <Spinner size="sm" variant="current" /> : <cta.icon className="w-4 h-4" />}
              {cta.label}
            </Button>
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
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
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

// ─── Export ──────────────────────────────────────────────────────────────────

export default function ContratoDetallePage() {
  return (
    <PageGuard module="contratos" action="view">
      <ContratoDetalleContent />
    </PageGuard>
  );
}
