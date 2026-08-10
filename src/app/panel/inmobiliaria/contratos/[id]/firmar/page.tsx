'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, WarningCircle, SealCheck, ArrowRight, Info } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
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
        toast.error('El inquilino todavía no firmó. No puedes firmar hasta que lo haga.');
      } else if (isPermissionError(actions.lastError)) {
        toast.error('No tienes permisos para esta acción.');
      } else {
        toast.error('No se pudo firmar el contrato. Intentá de nuevo.');
      }
    }

    setIsSigning(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

  if (error || !contract) {
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

  if (contract.status !== 'pending_landlord') {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <div className="rounded-xl border border-amber-600/30 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/15 p-5 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">Este contrato no está pendiente de tu firma</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Estado actual: <strong>{contract.status}</strong>.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/panel/inmobiliaria/contratos/${contract.id}`)}
          variant="link"
          className="h-auto gap-1 px-0"
        >
          Ver detalle del contrato
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-900/15 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
            <SealCheck className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">Contrato firmado</h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              El inquilino ya fue notificado para que firme digitalmente.
            </p>
          </div>
          <Button
            onClick={() => router.push(`/panel/inmobiliaria/contratos/${contract.id}`)}
            hideArrow
            className="gap-1.5"
          >
            Ver detalle del contrato
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <Button
          onClick={() => router.back()}
          variant="link"
          hideArrow
          className="mb-3 h-auto gap-1 px-0 text-muted-foreground hover:text-foreground hover:no-underline"
        >
          <CaretLeft className="w-4 h-4" /> Volver
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Firmar contrato</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa el documento y firma digitalmente para enviarlo al inquilino.
        </p>
      </div>

      {/* Preview */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Documento a firmar</h3>
        </div>
        <div className="p-5 space-y-3">
          {hasTenantSignature && (
            <div className="rounded-xl border border-amber-600/30 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/15 px-4 py-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Este PDF ya incluye la <strong>firma del inquilino</strong> y un certificado parcial.
                Revisalo antes de firmar.
              </p>
            </div>
          )}

          {hasTenantSignature && (isLoadingSignedPdf || signedPdfUrl) ? (
            isLoadingSignedPdf ? (
              <div className="py-20 flex items-center justify-center">
                <Spinner size="default" variant="muted" />
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
              <Spinner size="sm" variant="muted" />
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
