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
import type { Contract, ContractStatus } from '@/lib/types/contract';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AdministracionDelContrato } from '@/components/contratos/AdministracionDelContrato';
import { ConceptosDelContrato } from '@/components/contratos/ConceptosDelContrato';
import { CobrosDelContrato, type ResumenDeCobros } from '@/components/contratos/CobrosDelContrato';
import { ReglasDeMoraDelContrato } from '@/components/contratos/ReglasDeMoraDelContrato';
import { Stat, StatStrip } from '@leasefy/cadence';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { VincularInmueble } from '@/components/contratos/VincularInmueble';
import { InvitarInquilino } from '@/components/contratos/InvitarInquilino';

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
  // T-0036 §3.2.B6/Y2 — el botón de invitar al inquilino gatea con el MISMO
  // permiso que exige el back (`contratos:create`, no `contratos:edit`):
  // usar `canEditContracts` acá mostraría el botón a un rol que el back le
  // responde 403.
  const canInviteTenant = canAccess('contratos', 'create');

  const [actionError, setActionError] = useState<string | null>(null);
  const [resumenDeCobros, setResumenDeCobros] = useState<ResumenDeCobros | null>(null);
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
  const esPreFirma = PRE_SIGNED_STATES.includes(contract.status as ContractStatus);
  const chatHref = isManager && contract.applicationId
    ? `/panel/inmobiliaria/mensajes?applicationId=${contract.applicationId}`
    : null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            asChild
            variant="link"
            hideArrow
            className="mb-3 h-auto gap-1 px-0 text-muted-foreground hover:text-foreground hover:no-underline"
          >
            <Link href="/panel/inmobiliaria/contratos">
              <CaretLeft className="w-4 h-4" /> Contratos
            </Link>
          </Button>
          {/*
            T-0040 — el consecutivo es el nombre del contrato: va en el título,
            no en una línea debajo de un título genérico. El UUID vuelve tal
            cual cuando no hay código —sólo un `back` anterior a T-0040 lo
            produce—. Sin `#0` ni `#undefined`: o el número, o el id.
          */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {contract.code != null ? `Contrato #${contract.code}` : 'Contrato de arrendamiento'}
            </h1>
            <Badge variant={statusVariant}>
              {statusLabel}
            </Badge>
          </div>
          {contract.code == null ? (
            <p className="text-sm text-muted-foreground mt-1">ID: {contract.id}</p>
          ) : null}
          {/* De qué contrato se trata, sin bajar a las tarjetas: inmueble e inquilino. */}
          <p className="text-sm text-muted-foreground mt-1">
            {[
              [contract.propertyAddress, contract.propertyCity].filter(Boolean).join(', ') || null,
              contract.tenantName || null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Arrendamiento'}
          </p>
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

      {/*
        Los cuatro números del contrato, de un vistazo. Antes había que
        bajar a Términos para el canon y no había cómo saber si el
        inquilino debía plata sin ir a Cobros.
      */}
      <ResumenDelContrato contract={contract} cobros={resumenDeCobros} />

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
            <FilaDelPropietario contract={contract} />
            <InfoRow label="Inquilino" value={contract.tenantName} />
            {/* T-0036 §3.2.B6 — la salida de un contrato migrado sin
                inquilino: se muestra sólo mientras tenantId siga null. */}
            {contract.tenantId === null && (
              <div className="pt-1">
                <InvitarInquilino
                  contract={contract}
                  puedeInvitar={canInviteTenant}
                  onActualizado={(c) => setContract(c)}
                  onConflicto={() => void refetch()}
                />
              </div>
            )}
          </InfoCard>

          <InfoCard title="Inmueble" icon={Buildings}>
            {contract.propertyId === null && (
              /* Sin inmueble no hay consignación, y sin consignación no hay
                 cobros: todo lo demás de esta pantalla se queda escrito. El
                 mismo permiso que exige el back (`contratos:create`). */
              <div className="space-y-2 pb-1">
                <p className="text-sm text-muted-foreground">
                  Sin inmueble vinculado: este contrato no genera cobros.
                </p>
                <VincularInmueble
                  contract={contract}
                  puedeVincular={canInviteTenant}
                  onActualizado={(c) => {
                    setContract(c);
                    toast.success('Inmueble vinculado. Los próximos cobros salen sobre su consignación.');
                  }}
                />
              </div>
            )}
            <InfoRow label="Dirección" value={contract.propertyAddress} />
            <InfoRow label="Ciudad" value={contract.propertyCity} />
            {contract.propertyId ? (
              /* La dirección de arriba es la que dice el contrato (no se pisa
                 al vincular); la ficha del inmueble es donde se ve cuál quedó. */
              <Link
                href={`/panel/inmobiliaria/inmuebles/${contract.propertyId}`}
                className="inline-block text-sm font-medium text-primary hover:underline"
                data-testid="ver-inmueble"
              >
                Ver la ficha del inmueble →
              </Link>
            ) : null}
          </InfoCard>

          <InfoCard title="Vigencia" icon={Calendar}>
            <InfoRow label="Inicio" value={formatDate(contract.startDate)} />
            <InfoRow label="Fin" value={formatDate(contract.endDate)} />
            <Vigencia inicio={contract.startDate} fin={contract.endDate} />
          </InfoCard>

          {/* Uso, periodicidad y comisión. Se guardaban desde la migración y no
              se veían en ninguna pantalla — y el uso decide si hay IVA. */}
          <AdministracionDelContrato
            contract={contract}
            puedeEditar={canEditContracts}
            onActualizado={(c) => setContract(c)}
          />

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

        {/*
          Derecha — la cuenta del contrato. Antes esta columna era sólo el
          documento, y para un contrato activo eso es un iframe vacío ocupando
          dos tercios de la pantalla mientras lo que se cobra y lo que se
          cobró vivían abajo del pliegue en la columna angosta. El documento
          manda mientras se firma; una vez activo, manda la plata.
        */}
        <div className="lg:col-span-2 space-y-6">
          {!esPreFirma && (
            <>
              <ConceptosDelContrato contract={contract} puedeEditar={canEditContracts} />
              {/* Las reglas de mora de la inmobiliaria, y cuáles pisa este contrato. */}
              <ReglasDeMoraDelContrato contract={contract} puedeEditar={canEditContracts} />
              <CobrosDelContrato
                key={contract.propertyId ?? 'sin-inmueble'}
                contract={contract}
                onResumen={setResumenDeCobros}
              />
            </>
          )}

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
                <p className="text-sm text-muted-foreground py-2">
                  {contract.contractOrigin === 'MIGRATED'
                    ? 'Sin documento: este contrato entró por migración sin el PDF firmado.'
                    : 'No hay vista previa disponible.'}
                </p>
              )}
            </div>
          </section>

          {esPreFirma && (
            <>
              <ConceptosDelContrato contract={contract} puedeEditar={canEditContracts} />
              {/* Las reglas de mora de la inmobiliaria, y cuáles pisa este contrato. */}
              <ReglasDeMoraDelContrato contract={contract} puedeEditar={canEditContracts} />
              <CobrosDelContrato
                key={contract.propertyId ?? 'sin-inmueble'}
                contract={contract}
                onResumen={setResumenDeCobros}
              />
            </>
          )}
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

  // Activo: no hay nada que hacer, y el chip del título ya lo dice. Una
  // banda verde que repite «contrato activo» es una pantalla más larga.
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

/**
 * Los cuatro números del contrato: canon, vencimiento, día de pago y lo que
 * debe el inquilino. El saldo viene de los cobros (los carga la tarjeta de
 * abajo y los reporta acá); mientras no llegan, la celda lo dice.
 */
function ResumenDelContrato({
  contract,
  cobros,
}: {
  contract: { monthlyRent?: number | null; endDate?: string | null; paymentDueDay?: number | null; diasDePlazo?: number | null; propertyId: string | null };
  cobros: ResumenDeCobros | null;
}) {
  const dias = diasHasta(contract.endDate);
  const vence =
    dias === null
      ? { delta: undefined, dir: 'neutral' as const }
      : dias < 0
        ? { delta: `vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`, dir: 'down' as const }
        : dias <= 90
          ? { delta: `en ${dias} ${dias === 1 ? 'día' : 'días'}`, dir: 'down' as const }
          : { delta: `en ${dias} días`, dir: 'neutral' as const };

  const saldo =
    cobros === null
      ? { value: '…', delta: undefined, dir: 'neutral' as const }
      : cobros.total === 0
        ? { value: '—', delta: contract.propertyId === null ? 'sin inmueble no hay cobros' : 'sin cobros todavía', dir: 'neutral' as const }
        : cobros.saldo > 0
          ? {
              value: formatCurrency(cobros.saldo),
              delta: cobros.enMora > 0 ? `${cobros.enMora} en mora` : `${cobros.pendientes} por cobrar`,
              dir: cobros.enMora > 0 ? ('down' as const) : ('neutral' as const),
            }
          : { value: formatCurrency(0), delta: 'al día', dir: 'up' as const };

  return (
    <StatStrip className="rounded-xl border border-border bg-card px-4" data-testid="resumen-del-contrato">
      <Stat label="Canon" value={contract.monthlyRent ? formatCurrency(contract.monthlyRent) : '—'} compact />
      <Stat
        label="Vence"
        value={fechaCorta(contract.endDate)}
        delta={vence.delta}
        deltaDirection={vence.dir}
        compact
      />
      <Stat
        label="Día de pago"
        value={contract.paymentDueDay ? `Día ${contract.paymentDueDay}` : '—'}
        delta={contract.diasDePlazo != null ? `+${contract.diasDePlazo} de plazo` : undefined}
        compact
      />
      <Stat label="Saldo del inquilino" value={saldo.value} delta={saldo.delta} deltaDirection={saldo.dir} compact />
    </StatStrip>
  );
}

/** Cuánto del contrato ya pasó: una barra con «mes N de M». */
function Vigencia({ inicio, fin }: { inicio?: string | null; fin?: string | null }) {
  const a = fechaLocal(inicio);
  const b = fechaLocal(fin);
  if (!a || !b || b <= a) return null;
  const hoy = new Date();
  const total = b.getTime() - a.getTime();
  const avance = Math.min(1, Math.max(0, (hoy.getTime() - a.getTime()) / total));
  const meses = Math.max(1, Math.round(total / (30.44 * 86_400_000)));
  const mesActual = Math.min(meses, Math.max(1, Math.ceil(avance * meses)));
  const terminado = hoy > b;
  return (
    <div className="space-y-1.5 pt-1" data-testid="vigencia">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', terminado ? 'bg-muted-foreground/60' : 'bg-primary')}
          style={{ width: `${Math.round(avance * 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {terminado ? `Terminó: ${meses} ${meses === 1 ? 'mes' : 'meses'}` : `Mes ${mesActual} de ${meses}`}
      </p>
    </div>
  );
}

/** Lee la parte YYYY-MM-DD como fecha LOCAL: un DATE en UTC es el día anterior en Bogotá. */
function fechaLocal(iso?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function diasHasta(iso?: string | null): number | null {
  const d = fechaLocal(iso);
  if (!d) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
}

function fechaCorta(iso?: string | null): string {
  const d = fechaLocal(iso);
  if (!d) return '—';
  return d
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/ de /g, ' ')
    .replace(/\.$/, '');
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

/**
 * El propietario es el de la consignación del inmueble — la ficha que la
 * inmobiliaria administra y a la que le dispersa. `landlordName` es otra
 * cosa: en un contrato migrado es el usuario que corrió la migración, y en
 * QA los 99 contratos decían «Propietario: victor ortiz». Sin consignación
 * no hay a quién mostrar: se dice, en vez de caer al nombre equivocado.
 */
function FilaDelPropietario({ contract }: { contract: Contract }) {
  const p = contract.propietarioDeLaConsignacion;
  if (p) {
    return (
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Propietario</span>
        <span className="text-right">
          <Link
            href={`/panel/inmobiliaria/propietarios/${p.id}`}
            className="font-medium text-foreground hover:underline"
            data-testid="propietario-ficha"
          >
            {p.name}
          </Link>
          <span className="block text-xs text-muted-foreground">{p.documentNumber}</span>
        </span>
      </div>
    );
  }
  if (contract.contractOrigin === 'MIGRATED') {
    return (
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Propietario</span>
        <span className="text-right text-xs text-muted-foreground" data-testid="propietario-sin-consignacion">
          {contract.propertyId
            ? 'El inmueble no está consignado: registrá al propietario en Inmuebles.'
            : 'Se vincula con el inmueble.'}
        </span>
      </div>
    );
  }
  return <InfoRow label="Propietario" value={contract.landlordName} />;
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
