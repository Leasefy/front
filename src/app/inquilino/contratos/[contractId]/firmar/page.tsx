'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Appear } from '@leasefy/cadence';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { WarningCircle, CheckCircle, Confetti, ArrowRight, Clock, XCircle, PencilSimple, ChatCircle } from '@phosphor-icons/react';
import { MonoLabel } from '@leasefy/cadence';
import { toast } from 'sonner';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { FirmaDelInventarioDelInquilino } from '@/components/inmobiliaria/inventario/FirmaDelInventarioDelInquilino';
import { AuditTrail } from '@/components/contract/AuditTrail';
import { RejectContractModal } from '@/components/contract/RejectContractModal';
import { CancelContractModal } from '@/components/contract/CancelContractModal';
import { DownloadContractPdfButton } from '@/components/contract/DownloadContractPdfButton';
import Link from 'next/link';
import { useContract, useContractActions, useContractPreview, useSignedPdfUrl, useContractRejections } from '@/lib/hooks/useContracts';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { debeReiniciarOtp } from '@/lib/contratos/otp-errors';
import type { ContractPreview as ContractPreviewResponse } from '@/lib/api/contracts.types';
import { getTemplateById } from '@/lib/constants/contract-templates';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { CONTRACT_STATUS_LABELS, getContractTypeLabel } from '@/lib/types/contract';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Contract, ContractStatus, RejectionType, ContractRejection } from '@/lib/types/contract';
import { mensajeDeLaFirmaDelInquilino } from '@/lib/contratos/firma-del-inquilino';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

// ============================================================================
// Types
// ============================================================================

interface FirmarContractPageProps {
  params: Promise<{
    contractId: string;
  }>;
}

// ============================================================================
// Success State Component
// ============================================================================

function SigningSuccess({ locale, estado }: { locale: string; estado: ContractStatus | null | undefined }) {
  const router = useRouter();
  // 🔴 QA-CONT-95: lo que se dice sale del estado que devolvió la firma
  // (antes «Ambas partes han firmado… está activo» con el propietario sin firmar).
  const mensaje = mensajeDeLaFirmaDelInquilino(estado, locale);

  return (
    // Firmar → «¡Contrato firmado!»: la confirmación llega (es un cambio).
    <Appear className="max-w-lg mx-auto text-center py-16">
      <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-6">
        <Confetti className="w-10 h-10 text-success" />
      </div>
      <h2 className="text-2xl font-semibold text-fg mb-3" data-testid="firma-exitosa-titulo">
        {mensaje.titulo}
      </h2>
      <p className="text-fg-muted mb-8 max-w-sm mx-auto" data-testid="firma-exitosa-texto">
        {mensaje.texto}
      </p>
      <Button
        size="lg"
        hideArrow
        onClick={() => router.push('/inquilino/contratos')}
      >
        {locale === 'es' ? 'Ver mis contratos' : 'View my contracts'}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </Appear>
  );
}

// ============================================================================
// Read-Only View (contract not in pending_tenant state)
// ============================================================================

/**
 * Renderiza el documento del contrato: si hay un template conocido (contratos GENERATED
 * generados desde plantilla), usa ContractPreview con las cláusulas. Si no (contratos
 * UPLOADED_PDF), usa el preview del backend que devuelve una signed URL al PDF y lo
 * muestra en iframe. Nunca queda en blanco.
 */
function ContractDocumentView({
  contract,
  preview,
  signedPdfUrl,
}: {
  contract: Contract;
  preview: ContractPreviewResponse | null;
  /** Si viene definido, gana sobre el preview — muestra el PDF con estampado firmado. */
  signedPdfUrl: string | null;
}) {
  const template = getTemplateById(contract.templateId);

  // Cuando el contrato ya tiene firma(s), priorizamos el PDF estampado via /pdf.
  if (signedPdfUrl) {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-surface">
        <iframe
          src={signedPdfUrl}
          className="w-full h-[720px] bg-surface"
          title="Contrato"
        />
      </div>
    );
  }

  if (template) {
    return <ContractPreview contract={contract} template={template} />;
  }
  if (preview?.origin === 'UPLOADED_PDF') {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-surface">
        <iframe
          src={preview.pdfUrl}
          className="w-full h-[720px] bg-surface"
          title="Contrato"
        />
      </div>
    );
  }
  if (preview?.origin === 'GENERATED') {
    return (
      <div
        className="rounded-xl border border-border bg-surface p-6 prose prose-sm max-w-none dark:prose-invert"
        {...sanitizeContractHtml(preview.html)}
      />
    );
  }
  if (preview?.origin === 'SIN_DOCUMENTO') {
    /*
      🔴 El contrato que tu inmobiliaria trajo de su sistema anterior: ya se
      firmó en papel y no tiene documento en Leasefy. Antes el back respondía
      400 y esta vista se quedaba con la ruedita girando para siempre.
    */
    return (
      <div
        className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground"
        data-testid="contrato-sin-documento"
      >
        Este contrato se firmó fuera de Leasefy y no tiene documento digital acá. Si necesitas una copia, pídesela a tu inmobiliaria.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-8 flex items-center justify-center">
      <Spinner size="md" variant="muted" />
    </div>
  );
}

type StatusBannerTone = 'emerald' | 'amber' | 'rose' | 'neutral';

function readOnlyBanner(status: Contract['status'], locale: string): { tone: StatusBannerTone; icon: typeof CheckCircle; message: string } {
  if (status === 'active' || status === 'signed') {
    return {
      tone: 'emerald',
      icon: CheckCircle,
      message: locale === 'es'
        ? (status === 'active' ? 'Contrato activo — ambas partes firmaron' : 'Firmado — pendiente activar')
        : (status === 'active' ? 'Contract active — both parties signed' : 'Signed — pending activation'),
    };
  }
  if (status === 'pending_landlord') {
    return {
      tone: 'emerald',
      icon: CheckCircle,
      message: locale === 'es'
        ? 'Ya firmaste. Esperando que el propietario firme para cerrar el contrato.'
        : 'You already signed. Waiting for the landlord to sign to close the contract.',
    };
  }
  if (status === 'rejected_pending_modifications') {
    return {
      tone: 'amber',
      icon: PencilSimple,
      message: locale === 'es'
        ? 'Esperando cambios del propietario — pediste modificaciones al contrato.'
        : 'Waiting for landlord changes — you requested contract modifications.',
    };
  }
  if (status === 'cancelled') {
    return {
      tone: 'rose',
      icon: XCircle,
      message: locale === 'es' ? 'Proceso cancelado' : 'Process cancelled',
    };
  }
  return { tone: 'neutral', icon: Clock, message: CONTRACT_STATUS_LABELS[status] };
}

const BANNER_TONES: Record<StatusBannerTone, { container: string; iconBg: string; iconColor: string; text: string }> = {
  emerald: {
    container: 'bg-success-soft border-success/30',
    iconBg: 'bg-success-soft',
    iconColor: 'text-success',
    text: 'text-success',
  },
  amber: {
    container: 'bg-warning-soft border-warning/30',
    iconBg: 'bg-warning-soft',
    iconColor: 'text-warning',
    text: 'text-warning',
  },
  rose: {
    container: 'bg-danger-soft border-danger/30',
    iconBg: 'bg-danger-soft',
    iconColor: 'text-danger',
    text: 'text-danger',
  },
  neutral: {
    container: 'bg-surface-muted border-border',
    iconBg: 'bg-surface-muted',
    iconColor: 'text-fg-muted',
    text: 'text-fg-muted',
  },
};

function ReadOnlyView({
  contract,
  locale,
  chatHref,
  canCancel,
  onCancelRequest,
  isCancelling,
  preview,
  signedPdfUrl,
  rejections,
}: {
  contract: Contract;
  locale: string;
  chatHref: string | null;
  canCancel: boolean;
  onCancelRequest: () => void;
  isCancelling: boolean;
  preview: ContractPreviewResponse | null;
  signedPdfUrl: string | null;
  rejections: ContractRejection[];
}) {
  const banner = readOnlyBanner(contract.status, locale);
  const tone = BANNER_TONES[banner.tone];
  const Icon = banner.icon;

  return (
    <div>
      <div className={cn('mb-6 rounded-xl px-5 py-4 border space-y-3', tone.container)}>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', tone.iconBg)}>
            <Icon className={cn('w-5 h-5', tone.iconColor)} />
          </div>
          <p className={cn('text-sm font-medium', tone.text)}>{banner.message}</p>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
          <DownloadContractPdfButton
            contractId={contract.id}
            contractStatus={contract.status}
            variant="ghost"
            label={locale === 'es' ? 'Descargar PDF' : 'Download PDF'}
          />
          {chatHref && (
            <Link
              href={chatHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ChatCircle className="w-3.5 h-3.5" />
              {locale === 'es' ? 'Abrir chat con el propietario' : 'Open chat with landlord'}
            </Link>
          )}
          {canCancel && (
            <Button
              type="button"
              variant="link"
              size="sm"
              hideArrow
              onClick={onCancelRequest}
              disabled={isCancelling}
              className="gap-1 px-0 text-xs text-danger hover:text-danger"
            >
              <XCircle className="w-3.5 h-3.5" />
              {locale === 'es' ? 'Cancelar contrato' : 'Cancel contract'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <ContractDocumentView contract={contract} preview={preview} signedPdfUrl={signedPdfUrl} />
        <AuditTrail contract={contract} rejections={rejections} />
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function FirmarContractPage(props: FirmarContractPageProps) {
  const params = use(props.params);
  const { contractId } = params;
  const { locale } = useI18n();
  const router = useRouter();

  const { contract, isLoading, error } = useContract(contractId);
  const { preview } = useContractPreview(contractId);
  const { rejections } = useContractRejections(contractId);
  const actions = useContractActions();

  // Si alguna de las partes ya firmó, usamos /pdf para ver el estampado actualizado.
  const hasAnySignature = !!(contract?.tenantSignature || contract?.landlordSignature);
  const { url: signedPdfUrl } = useSignedPdfUrl(contractId, { enabled: hasAnySignature });

  const [localContract, setLocalContract] = useState<Contract | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Use local contract if updated after signing, else use fetched
  const activeContract = localContract ?? contract;

  const isPendingTenant = activeContract?.status === 'pending_tenant';
  const canCancel = activeContract
    ? (['pending_tenant', 'rejected_pending_modifications'] as const).includes(activeContract.status as 'pending_tenant' | 'rejected_pending_modifications')
    : false;
  const chatHref = activeContract?.applicationId
    ? `/inquilino/mensajes?applicationId=${activeContract.applicationId}`
    : null;

  // Handle signing
  const handleSign = async ({ otpVerified, signatureData, otpVerificationToken }: { otpVerified: boolean; signatureData: string; otpVerificationToken?: string }) => {
    if (!activeContract) return;
    void otpVerified;

    setIsSigning(true);
    try {
      const updated = await actions.signAsTenant(activeContract.id, {
        acceptedTerms: true,
        consentText: 'Acepto los términos y condiciones de este contrato de arrendamiento y confirmo que la información proporcionada es verídica.',
        signatureData,
        otpVerificationToken,
      });
      setLocalContract(updated);
      setSignedSuccess(true);
      toast.success(locale === 'es' ? 'Firmaste el contrato.' : 'You signed the contract.');
    } catch (err) {
      // Las acciones relanzan el fallo del back: acá se dice su motivo.
      toast.error(locale === 'es' ? 'Error al firmar el contrato' : 'Error signing contract', {
        description: mensajeDelFallo(err, ''),
      });
      // T-0109 contract.md §3.3 — igual que en el panel de la inmobiliaria:
      // un token ya inservible se relanza para que SignatureForm lo limpie
      // y reabra el OTP.
      if (debeReiniciarOtp(err)) throw err;
    } finally {
      setIsSigning(false);
    }
  };

  const handleCancel = async (reason: string | undefined) => {
    if (!activeContract) return;
    setIsCancelling(true);
    try {
      await actions.cancel(activeContract.id, reason ? { reason } : {});
    } catch (err) {
      setIsCancelling(false);
      toast.error(locale === 'es' ? 'No se pudo cancelar el contrato.' : 'Could not cancel the contract.', {
        description: mensajeDelFallo(err, ''),
      });
      return;
    }
    setIsCancelling(false);
    toast.success(locale === 'es' ? 'Contrato cancelado.' : 'Contract cancelled.');
    setIsCancelModalOpen(false);
    router.push('/inquilino/contratos');
  };

  const handleReject = async (type: RejectionType, reason: string) => {
    if (!activeContract) return;
    setIsRejecting(true);
    let updated: Awaited<ReturnType<typeof actions.rejectAsTenant>>;
    try {
      updated = await actions.rejectAsTenant(activeContract.id, { type, reason });
    } catch (err) {
      setIsRejecting(false);
      toast.error(
        type === 'MODIFICATIONS'
          ? (locale === 'es' ? 'No se pudo enviar el pedido de cambios.' : 'Could not submit the change request.')
          : (locale === 'es' ? 'No se pudo enviar el rechazo.' : 'Could not submit the rejection.'),
        { description: mensajeDelFallo(err, '') }
      );
      return;
    }
    setIsRejecting(false);
    setLocalContract(updated);
    setIsRejectModalOpen(false);
    if (type === 'DEFINITIVE') {
      toast.success(locale === 'es' ? 'Contrato rechazado. El proceso se cerró.' : 'Contract rejected. Process closed.');
      router.push('/inquilino/contratos');
    } else {
      toast.success(locale === 'es' ? 'Pedido de cambios enviado al propietario.' : 'Change request sent to the landlord.');
    }
  };

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isLoading);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // Error or not found
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
          volverA={{ label: 'Mis contratos', href: '/inquilino/contratos' }}
        />
      </div>
    );
  }

  if (!activeContract) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <BackButton href="/inquilino/contratos" label={locale === 'es' ? 'Volver a contratos' : 'Back to contracts'} />
          <div className="mt-8 text-center py-16">
            <div className="w-16 h-16 rounded-xl bg-surface-muted flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-fg-subtle" />
            </div>
            <h2 className="text-lg font-semibold text-fg mb-2">
              {locale === 'es' ? 'Contrato no encontrado' : 'Contract not found'}
            </h2>
            <p className="text-fg-muted">
              {error || (locale === 'es'
                ? 'No pudimos encontrar este contrato.'
                : 'We couldn\'t find this contract.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state after signing
  if (signedSuccess) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <SigningSuccess locale={locale} estado={activeContract?.status} />
          {/* 🔴 Nico, 2026-09-17: al iniciar el contrato, el inquilino firma
              también el inventario con el que lo recibe. No bloquea nada. */}
          <div className="mt-8">
            <FirmaDelInventarioDelInquilino contractId={activeContract.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back */}
        <div className="mb-6">
          <BackButton href="/inquilino/contratos" label={locale === 'es' ? 'Volver a contratos' : 'Back to contracts'} />
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg">
            {isPendingTenant
              ? (locale === 'es' ? 'Firmar el contrato' : 'Sign contract')
              : (locale === 'es' ? 'Contrato de arrendamiento' : 'Rental contract')}
          </h1>
          <p className="mt-1 text-fg-muted">
            {activeContract.propertyAddress} — {activeContract.propertyCity}
          </p>
        </div>

        {/* Non-signing state — read only */}
        {!isPendingTenant && (
          <ReadOnlyView
            contract={activeContract}
            locale={locale}
            chatHref={chatHref}
            canCancel={canCancel}
            onCancelRequest={() => setIsCancelModalOpen(true)}
            isCancelling={isCancelling}
            preview={preview}
            signedPdfUrl={signedPdfUrl}
            rejections={rejections}
          />
        )}

        {/* "Pedir cambios" — modal fijado a MODIFICATIONS (sin opción de rechazo definitivo).
            Para rechazar definitivamente el tenant usa el link "Cancelar contrato" abajo. */}
        <RejectContractModal
          open={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          onConfirm={handleReject}
          isSubmitting={isRejecting}
          lockToType="MODIFICATIONS"
        />

        {/* Cancel modal — mounted once */}
        <CancelContractModal
          open={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancel}
          isSubmitting={isCancelling}
          actor="tenant"
          conPostulacion={Boolean(activeContract?.applicationId)}
        />

        {/* Signing state — two column layout */}
        {isPendingTenant && (
          <>
            {/* Status Banner */}
            <div
              className="mb-6 rounded-xl px-5 py-4 bg-primary-soft border border-primary/30 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <WarningCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">
                  {locale === 'es'
                    ? 'Revisa el contrato y firma. El propietario firmará después para cerrar el proceso.'
                    : 'Review the contract and sign. The landlord will sign next to close the process.'}
                </p>
              </div>
              {chatHref && (
                <Link
                  href={chatHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-primary/30 text-primary text-xs font-medium hover:bg-primary-soft transition-colors"
                >
                  <ChatCircle className="w-3.5 h-3.5" />
                  {locale === 'es' ? 'Abrir chat' : 'Open chat'}
                </Link>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main — Contract Preview */}
              <div className="lg:col-span-2 space-y-6">
                <ContractDocumentView contract={activeContract} preview={preview} signedPdfUrl={signedPdfUrl} />
                <AuditTrail contract={activeContract} />
              </div>

              {/* Sidebar — Signature + info */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                  {/* Signing Form */}
                  <SignatureForm
                    onSign={handleSign}
                    contractId={activeContract.id}
                    isLandlord={false}
                    isLoading={isSigning}
                    signerName={activeContract.tenantName}
                    requireOTP={true}
                  />

                  {/* Pedir cambios — no-terminal, solicita al propietario que modifique el contrato */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isSigning || isRejecting || isCancelling}
                    className="w-full border-warning/30 bg-surface text-warning hover:bg-warning-soft"
                  >
                    <PencilSimple className="w-4 h-4" />
                    {locale === 'es' ? 'Pedir cambios al propietario' : 'Request changes'}
                  </Button>

                  {/* Descargar PDF — disponible en cualquier momento para transparencia */}
                  <DownloadContractPdfButton
                    contractId={activeContract.id}
                    contractStatus={activeContract.status}
                    variant="secondary"
                    className="w-full justify-center"
                    label={locale === 'es' ? 'Descargar PDF' : 'Download PDF'}
                  />

                  {/* Cancelar proceso (terminal) — último recurso */}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    hideArrow
                    onClick={() => setIsCancelModalOpen(true)}
                    disabled={isSigning || isRejecting || isCancelling}
                    className="w-full py-1 text-xs text-danger hover:text-danger"
                  >
                    {locale === 'es' ? 'Cancelar contrato' : 'Cancel contract'}
                  </Button>

                  {/* Contract Info Card */}
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <MonoLabel className="block tracking-wider text-fg-muted">
                      {locale === 'es' ? 'Tipo de contrato' : 'Contract type'}
                    </MonoLabel>
                    <p className="mt-1 font-medium text-fg">
                      {getContractTypeLabel(activeContract, locale as 'es' | 'en')}
                    </p>
                  </div>

                  {/* Landlord signed info */}
                  {activeContract.landlordSignature && (
                    <div className="rounded-xl border border-success/30 bg-success-soft p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-xs font-medium text-success">
                          {locale === 'es' ? 'Propietario ya firmó' : 'Landlord already signed'}
                        </span>
                      </div>
                      <p className="text-sm text-success font-medium">
                        {activeContract.landlordName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
