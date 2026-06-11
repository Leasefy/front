'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SpinnerGap, WarningCircle, CheckCircle, Confetti, ArrowRight, Clock, XCircle, PencilSimple, ChatCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { BackButton } from '@/components/ui/back-button';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { AuditTrail } from '@/components/contract/AuditTrail';
import { RejectContractModal } from '@/components/contract/RejectContractModal';
import { CancelContractModal } from '@/components/contract/CancelContractModal';
import { DownloadContractPdfButton } from '@/components/contract/DownloadContractPdfButton';
import Link from 'next/link';
import { useContract, useContractActions, useContractPreview, useSignedPdfUrl, useContractRejections } from '@/lib/hooks/useContracts';
import type { ContractPreview as ContractPreviewResponse } from '@/lib/api/contracts.types';
import { getTemplateById } from '@/lib/constants/contract-templates';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { CONTRACT_STATUS_LABELS, getContractTypeLabel } from '@/lib/types/contract';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Contract, RejectionType, ContractRejection } from '@/lib/types/contract';

// ============================================================================
// Types
// ============================================================================

interface FirmarContractPageProps {
  params: {
    contractId: string;
  };
}

// ============================================================================
// Success State Component
// ============================================================================

function SigningSuccess({ locale }: { locale: string }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center py-16"
    >
      <div className="w-20 h-20 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center mx-auto mb-6">
        <Confetti className="w-10 h-10 text-[#2C7A53] dark:text-[#3EAE70]" />
      </div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-3">
        {locale === 'es' ? '¡Contrato firmado exitosamente!' : 'Contract signed successfully!'}
      </h2>
      <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto">
        {locale === 'es'
          ? 'Ambas partes han firmado. Tu contrato está activo y puedes descargarlo en cualquier momento.'
          : 'Both parties have signed. Your contract is active and you can download it anytime.'}
      </p>
      <button
        onClick={() => router.push('/inquilino/contratos')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A40FF] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {locale === 'es' ? 'Ver mis contratos' : 'View my contracts'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
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
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white">
        <iframe
          src={signedPdfUrl}
          className="w-full h-[720px] bg-white"
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
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white">
        <iframe
          src={preview.pdfUrl}
          className="w-full h-[720px] bg-white"
          title="Contrato"
        />
      </div>
    );
  }
  if (preview?.origin === 'GENERATED') {
    return (
      <div
        className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white p-6 prose prose-sm max-w-none dark:prose-invert"
        {...sanitizeContractHtml(preview.html)}
      />
    );
  }
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-8 flex items-center justify-center">
      <SpinnerGap className="w-6 h-6 animate-spin text-muted-foreground" />
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
    container: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
    iconBg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    iconColor: 'text-[#2C7A53] dark:text-[#3EAE70]',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
  },
  amber: {
    container: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15 border-[#B7791F]/30 dark:border-[#B7791F]/40',
    iconBg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    iconColor: 'text-[#B7791F] dark:text-[#D2992F]',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
  },
  rose: {
    container: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 border-[#C4503B]/30 dark:border-[#C4503B]/40',
    iconBg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    iconColor: 'text-[#C4503B] dark:text-[#E0664D]',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
  },
  neutral: {
    container: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700',
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-500',
    text: 'text-neutral-700 dark:text-neutral-300',
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

        <div className="flex items-center gap-3 pt-2 border-t border-current/10 flex-wrap">
          <DownloadContractPdfButton
            contractId={contract.id}
            contractStatus={contract.status}
            variant="ghost"
            label={locale === 'es' ? 'Descargar PDF' : 'Download PDF'}
          />
          {chatHref && (
            <Link
              href={chatHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A40FF] dark:text-[#5570FF] hover:underline"
            >
              <ChatCircle className="w-3.5 h-3.5" />
              {locale === 'es' ? 'Abrir chat con el propietario' : 'Open chat with landlord'}
            </Link>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={onCancelRequest}
              disabled={isCancelling}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#C4503B] hover:text-[#C4503B] hover:underline disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              {locale === 'es' ? 'Cancelar contrato' : 'Cancel contract'}
            </button>
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

export default function FirmarContractPage({ params }: FirmarContractPageProps) {
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
    const updated = await actions.signAsTenant(activeContract.id, {
      acceptedTerms: true,
      consentText: 'Acepto los términos y condiciones de este contrato de arrendamiento y confirmo que la información proporcionada es verídica.',
      signatureData,
      otpVerificationToken,
    });
    if (updated) {
      setLocalContract(updated);
      setSignedSuccess(true);
      toast.success(locale === 'es' ? 'Contrato firmado exitosamente' : 'Contract signed successfully');
    } else {
      toast.error(locale === 'es' ? 'Error al firmar el contrato' : 'Error signing contract');
    }
    setIsSigning(false);
  };

  const handleCancel = async (reason: string | undefined) => {
    if (!activeContract) return;
    setIsCancelling(true);
    const updated = await actions.cancel(activeContract.id, reason ? { reason } : {});
    setIsCancelling(false);
    if (!updated) {
      toast.error(locale === 'es' ? 'No se pudo cancelar el contrato.' : 'Could not cancel the contract.');
      return;
    }
    toast.success(locale === 'es' ? 'Contrato cancelado.' : 'Contract cancelled.');
    setIsCancelModalOpen(false);
    router.push('/inquilino/contratos');
  };

  const handleReject = async (type: RejectionType, reason: string) => {
    if (!activeContract) return;
    setIsRejecting(true);
    const updated = await actions.rejectAsTenant(activeContract.id, { type, reason });
    setIsRejecting(false);
    if (!updated) {
      toast.error(
        type === 'MODIFICATIONS'
          ? (locale === 'es' ? 'No se pudo enviar el pedido de cambios.' : 'Could not submit the change request.')
          : (locale === 'es' ? 'No se pudo enviar el rechazo.' : 'Could not submit the rejection.')
      );
      return;
    }
    setLocalContract(updated);
    setIsRejectModalOpen(false);
    if (type === 'DEFINITIVE') {
      toast.success(locale === 'es' ? 'Contrato rechazado. El proceso se cerró.' : 'Contract rejected. Process closed.');
      router.push('/inquilino/contratos');
    } else {
      toast.success(locale === 'es' ? 'Pedido de cambios enviado al propietario.' : 'Change request sent to the landlord.');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Error or not found
  if (error || !activeContract) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <BackButton href="/inquilino/contratos" label={locale === 'es' ? 'Volver a contratos' : 'Back to contracts'} />
          <div className="mt-8 text-center py-16">
            <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {locale === 'es' ? 'Contrato no encontrado' : 'Contract not found'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
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
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <SigningSuccess locale={locale} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <BackButton href="/inquilino/contratos" label={locale === 'es' ? 'Volver a contratos' : 'Back to contracts'} />
        </motion.div>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {isPendingTenant
              ? (locale === 'es' ? 'Firmar Contrato' : 'Sign Contract')
              : (locale === 'es' ? 'Contrato de Arrendamiento' : 'Rental Contract')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {activeContract.propertyAddress} — {activeContract.propertyCity}
          </p>
        </motion.div>

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
        />

        {/* Signing state — two column layout */}
        {isPendingTenant && (
          <>
            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6 rounded-xl px-5 py-4 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center flex-shrink-0">
                  <WarningCircle className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                </div>
                <p className="text-sm font-medium text-[#1A40FF] dark:text-[#5570FF]">
                  {locale === 'es'
                    ? 'Revisá el contrato y firmá. El propietario firmará después para cerrar el proceso.'
                    : 'Review the contract and sign. The landlord will sign next to close the process.'}
                </p>
              </div>
              {chatHref && (
                <Link
                  href={chatHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 text-[#1A40FF] dark:text-[#5570FF] text-xs font-medium hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/40 transition-colors"
                >
                  <ChatCircle className="w-3.5 h-3.5" />
                  {locale === 'es' ? 'Abrir chat' : 'Open chat'}
                </Link>
              )}
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main — Contract Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 space-y-6"
              >
                <ContractDocumentView contract={activeContract} preview={preview} signedPdfUrl={signedPdfUrl} />
                <AuditTrail contract={activeContract} />
              </motion.div>

              {/* Sidebar — Signature + info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="lg:col-span-1"
              >
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
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isSigning || isRejecting || isCancelling}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-white dark:bg-[#1a1a1c] text-[#B7791F] dark:text-[#D2992F] hover:bg-[#F8F0E0] dark:hover:bg-[#B7791F]/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PencilSimple className="w-4 h-4" />
                    {locale === 'es' ? 'Pedir cambios al propietario' : 'Request changes'}
                  </button>

                  {/* Descargar PDF — disponible en cualquier momento para transparencia */}
                  <DownloadContractPdfButton
                    contractId={activeContract.id}
                    contractStatus={activeContract.status}
                    variant="secondary"
                    className="w-full justify-center"
                    label={locale === 'es' ? 'Descargar PDF' : 'Download PDF'}
                  />

                  {/* Cancelar proceso (terminal) — último recurso */}
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    disabled={isSigning || isRejecting || isCancelling}
                    className="w-full text-xs font-medium text-[#C4503B] hover:text-[#C4503B] hover:underline inline-flex items-center justify-center gap-1 py-1 disabled:opacity-50"
                  >
                    {locale === 'es' ? 'Cancelar contrato' : 'Cancel contract'}
                  </button>

                  {/* Contract Info Card */}
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-4">
                    <h4 className="text-xs font-medium font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {locale === 'es' ? 'Tipo de contrato' : 'Contract type'}
                    </h4>
                    <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                      {getContractTypeLabel(activeContract, locale as 'es' | 'en')}
                    </p>
                  </div>

                  {/* Landlord signed info */}
                  {activeContract.landlordSignature && (
                    <div className="rounded-xl border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                        <span className="text-xs font-medium text-[#2C7A53] dark:text-[#3EAE70]">
                          {locale === 'es' ? 'Propietario ya firmó' : 'Landlord already signed'}
                        </span>
                      </div>
                      <p className="text-sm text-[#2C7A53] dark:text-[#3EAE70] font-medium">
                        {activeContract.landlordName}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
