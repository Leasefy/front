'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, WarningCircle, SealCheck, ArrowRight, Info, FileText } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract';
import { Spinner } from '@/components/ui';
import { PageGuard } from '@/components/auth/PageGuard';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { useContract, useContractPreview, useContractActions, useSignedPdfUrl, isPermissionError } from '@/lib/hooks/useContracts';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EmptyState } from '@/components/ui/empty-state';

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
          volverA={{ label: 'Contratos', href: '/panel/inmobiliaria/contratos' }}
        />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-5 flex items-start gap-3">
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
        {/* El estado va traducido: antes salía el enum crudo del back
            («pending_tenant») en la cara de la persona. */}
        <AlertaAccionable
          severidad="warning"
          titulo="Este contrato no está pendiente de tu firma"
          accion={{ label: 'Ver el contrato', href: `/panel/inmobiliaria/contratos/${contract.id}` }}
          data-testid="firmar-no-pendiente"
        >
          Está en <strong>{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}</strong>.
          {contract.status === 'pending_tenant' && ' Cuando el inquilino firme, te avisamos y volvés acá.'}
          {contract.status === 'signed' && ' Ya firmaron las dos partes.'}
        </AlertaAccionable>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-lg border border-success/30 bg-success-soft p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <SealCheck className="w-8 h-8 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-success">Contrato firmado</h2>
            {/*
              🔴 Acá decía «El inquilino ya fue notificado para que firme
              digitalmente». Es imposible: en este flujo la inmobiliaria firma
              ÚLTIMA. `signAsLandlord` (contracts.service.ts) rechaza con
              «Tenant must sign first» si el inquilino no firmó antes, y al
              pasar deja el contrato en SIGNED. O sea que cuando esta pantalla
              aparece, el inquilino YA firmó y no hay nada que notificarle:
              la pantalla anunciaba un paso que ya había ocurrido y dejaba a
              quien firmó esperando una respuesta que no iba a llegar.
            */}
            <p className="text-sm text-success mt-1" data-testid="firmado-cierre">
              Firmaron las dos partes. El contrato queda cerrado y el PDF final ya incluye
              las dos firmas con su certificado.
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
        <h1 className="text-h2 text-fg">Firmar contrato</h1>
        {/* La inmobiliaria firma ÚLTIMA (el back exige la firma del inquilino
            antes), así que firmar acá no «envía» nada: cierra el contrato. */}
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
          El inquilino ya firmó. Revisá el documento y firmá para cerrar el contrato.
        </p>
      </div>

      {/* Preview */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Documento a firmar</h3>
        </div>
        <div className="p-5 space-y-3">
          {hasTenantSignature && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
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
                className="w-full h-[600px] rounded-md border border-border bg-surface"
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
              className="w-full h-[600px] rounded-md border border-border bg-surface"
              title="Contrato"
            />
          ) : preview?.origin === 'GENERATED' ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              {...sanitizeContractHtml(preview.html)}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No hay vista previa disponible"
              description="Todavía no se puede mostrar el documento de este contrato."
            />
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
