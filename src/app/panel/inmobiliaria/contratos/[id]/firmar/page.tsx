'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, Spinner, WarningCircle, SealCheck, ArrowRight, Info } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { PageGuard } from '@/components/auth/PageGuard';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { useContract, useContractPreview, useContractActions, useSignedPdfUrl, isPermissionError } from '@/lib/hooks/useContracts';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';

// ─── Content ─────────────────────────────────────────────────────────────────

function FirmarContratoContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { contract, isLoading, error, setContract } = useContract(id);
  const { preview, isLoading: isLoadingPreview } = useContractPreview(id);
  const actions = useContractActions();

  // Si el tenant ya firmó, cargamos el PDF con el estampado parcial para que el landlord
  // lo revise antes de firmar.
  const hasTenantSignature = !!contract?.tenantSignature;
  const { url: signedPdfUrl, isLoading: isLoadingSignedPdf } = useSignedPdfUrl(id, {
    enabled: hasTenantSignature,
  });

  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleSign = async ({ signatureData, otpVerificationToken }: { otpVerified: boolean; signatureData: string; otpVerificationToken?: string }) => {
    if (!contract) return;
    setIsSigning(true);

    const consent = contract.uploadedPdfPath
      ? 'Confirmo digitalmente que el PDF adjunto contiene mi firma manuscrita/presencial y acepto todos sus términos.'
      : 'Acepto los términos y condiciones de este contrato de arrendamiento y confirmo que la información proporcionada es verídica.';

    const updated = await actions.signAsLandlord(contract.id, {
      acceptedTerms: true,
      consentText: consent,
      signatureData,
      otpVerificationToken,
    });

    if (updated) {
      setContract(updated);
      setSigned(true);
      toast.success('Contrato firmado. Proceso completado.');
    } else {
      // Backend rechaza con 400 "Tenant must sign first" si el landlord intenta firmar antes.
      const msg = actions.lastError?.message ?? '';
      if (msg === 'Tenant must sign first' || /tenant.*sign first/i.test(msg)) {
        toast.error('El inquilino todavía no firmó. No podés firmar hasta que lo haga.');
      } else if (isPermissionError(actions.lastError)) {
        toast.error('No tenés permisos para esta acción.');
      } else {
        toast.error('No se pudo firmar el contrato. Intentá de nuevo.');
      }
    }

    setIsSigning(false);
  };

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
        <div className="rounded-xl border border-[#C4503B]/30 bg-[#F8EAE7] p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-[#C4503B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#C4503B]">No se pudo cargar el contrato</p>
            <p className="text-sm text-[#C4503B] mt-1">{error ?? 'Contrato no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (contract.status !== 'pending_landlord') {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <div className="rounded-xl border border-[#B7791F]/30 bg-[#F8F0E0] p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-[#B7791F] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#B7791F]">Este contrato no está pendiente de tu firma</p>
            <p className="text-sm text-[#B7791F] mt-1">
              Estado actual: <strong>{contract.status}</strong>.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/panel/inmobiliaria/contratos/${contract.id}`)}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#1A40FF] hover:text-[#1A40FF]"
        >
          Ver detalle del contrato
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-[#2C7A53]/30 bg-[#E8F3EC] p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#E8F3EC] flex items-center justify-center mx-auto">
            <SealCheck className="w-8 h-8 text-[#2C7A53]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#2C7A53]">Contrato firmado</h2>
            <p className="text-sm text-[#2C7A53] mt-1">
              El inquilino ya fue notificado para que firme digitalmente.
            </p>
          </div>
          <button
            onClick={() => router.push(`/panel/inmobiliaria/contratos/${contract.id}`)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2C7A53] hover:bg-[#2C7A53] text-white text-sm font-semibold transition-colors"
          >
            Ver detalle del contrato
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <CaretLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-2xl font-semibold text-foreground">Firmar contrato</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisá el documento y firmá digitalmente para enviarlo al inquilino.
        </p>
      </div>

      {/* Preview */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Documento a firmar</h3>
        </div>
        <div className="p-5 space-y-3">
          {hasTenantSignature && (
            <div className="rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15 px-4 py-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#B7791F] dark:text-[#D2992F] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">
                Este PDF ya incluye la <strong>firma del inquilino</strong> y un certificado parcial.
                Revisalo antes de firmar.
              </p>
            </div>
          )}

          {hasTenantSignature && (isLoadingSignedPdf || signedPdfUrl) ? (
            isLoadingSignedPdf ? (
              <div className="py-20 flex items-center justify-center">
                <Spinner className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <iframe
                src={signedPdfUrl!}
                className="w-full h-[600px] rounded-md border border-border bg-white"
                title="Contrato"
              />
            )
          ) : isLoadingPreview ? (
            <div className="py-20 flex items-center justify-center">
              <Spinner className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : preview?.origin === 'UPLOADED_PDF' ? (
            <iframe
              src={preview.pdfUrl}
              className="w-full h-[600px] rounded-md border border-border bg-white"
              title="Contrato"
            />
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

      {/* Signature form */}
      <SignatureForm
        onSign={handleSign}
        contractId={contract.id}
        isLandlord
        isLoading={isSigning}
        signerName={contract.landlordName}
        requireOTP={false}
      />
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function FirmarContratoPage() {
  return (
    <PageGuard module="contratos" action="edit">
      <FirmarContratoContent />
    </PageGuard>
  );
}
