'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, WarningCircle, SealCheck, ArrowRight, Info, FileText, HourglassMedium } from '@phosphor-icons/react';
import { Appear, CrossFade } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract';
import { Spinner } from '@/components/ui';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { PageGuard } from '@/components/auth/PageGuard';
import { SignatureForm } from '@/components/contract/SignatureForm';
import { useContract, useContractPreview, useContractActions, useSignedPdfUrl } from '@/lib/hooks/useContracts';
import { isPermissionError } from '@/lib/contratos/fallo-de-accion';
import { motivoDelFalloDelContrato } from '@/lib/contratos/errores-del-contrato';
import { debeReiniciarOtp } from '@/lib/contratos/otp-errors';
import { leerFallo } from '@/lib/errores/traductor-de-errores';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * El 400 de `signAsLandlord` cuando el inquilino todavía no firmó (el espejo de
 * `CODIGO_INQUILINO_NO_HA_FIRMADO` en `back/src/contracts/contracts.service.ts`).
 */
const CODIGO_INQUILINO_NO_HA_FIRMADO = 'INQUILINO_NO_HA_FIRMADO';

/**
 * 🔴 Nico (02-10-2026): si el inquilino todavía no firmó, el botón de firmar
 * como arrendador sale APAGADO y la pantalla lo explica ANTES de intentar, no
 * después del 400. El botón apagado lleva su motivo a la vista (no en un
 * `title`): un botón muerto sin explicación es una trampa.
 */
function InquilinoSinFirmar() {
  return (
    <Appear className="space-y-3" data-testid="firma-bloqueada">
      <AlertaAccionable
        id="firma-bloqueada-motivo"
        severidad="info"
        titulo="El inquilino todavía no ha firmado"
        icon={<HourglassMedium className="h-5 w-5" weight="duotone" />}
      >
        Primero firma el inquilino y después tú, como arrendador: tu firma es la que cierra el
        contrato. Cuando él firme, podrás firmar desde acá.
      </AlertaAccionable>
      <Button
        disabled
        aria-describedby="firma-bloqueada-motivo"
        hideArrow
        className="w-full gap-2"
        data-testid="firmar-como-arrendador-apagado"
      >
        <FileText className="h-4 w-4" />
        Firmar como arrendador
      </Button>
    </Appear>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function FirmarContratoContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { contract, isLoading, error, setContract, refetch } = useContract(id);
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
  /**
   * El back respondió 400 `INQUILINO_NO_HA_FIRMADO` aunque el contrato que
   * teníamos decía otra cosa (lo cargamos antes de un cambio): la pantalla
   * pasa a decir lo mismo que diría de entrada.
   */
  const [elBackDijoQueFalta, setElBackDijoQueFalta] = useState(false);
  const inquilinoYaFirmo = hasTenantSignature && !elBackDijoQueFalta;

  const handleSign = async ({ signatureData, otpVerificationToken }: { otpVerified: boolean; signatureData: string; otpVerificationToken?: string }) => {
    if (!contract) return;
    setIsSigning(true);

    const consent = contract.uploadedPdfPath
      ? 'Confirmo digitalmente que el PDF adjunto contiene mi firma manuscrita/presencial y acepto todos sus términos.'
      : 'Acepto los términos y condiciones de este contrato de arrendamiento y confirmo que la información proporcionada es verídica.';

    try {
      const updated = await actions.signAsLandlord(contract.id, {
        acceptedTerms: true,
        consentText: consent,
        signatureData,
        otpVerificationToken,
      });
      setContract(updated);
      setSigned(true);
      // CR-28 · QA-CONT-95: sin «Proceso completado» cuando falta activarlo.
      toast.success(updated.status === 'active' ? 'Contrato firmado y activo.' : 'Contrato firmado.');
    } catch (err) {
      // El back rechaza con 400 `INQUILINO_NO_HA_FIRMADO` si el arrendador
      // intenta firmar antes que el inquilino. Se decide con el CÓDIGO, nunca
      // con el texto (antes era «Tenant must sign first» y se reconocía con una
      // expresión regular). Lo demás pasa por el traductor (02-10-2026): un 5xx
      // dice que fue nuestro, con la referencia; sólo la red habla de conexión.
      const msg = motivoDelFalloDelContrato(err, {
        porDefecto: 'Prueba de nuevo en un momento.',
        accion: 'firmar el contrato',
      });
      if (leerFallo(err).code === CODIGO_INQUILINO_NO_HA_FIRMADO) {
        // Lo mismo que se ve de entrada: el aviso en la pantalla y el botón
        // apagado, no un toast que se va.
        setElBackDijoQueFalta(true);
      } else if (isPermissionError(err)) {
        toast.error('No tienes permisos para esta acción.');
      } else {
        toast.error('No se pudo firmar el contrato.', { description: msg });
      }
      // T-0109 contract.md §3.3 — TOKEN_DE_FIRMA_INVALIDO/CODIGO_DE_FIRMA_REQUERIDO
      // dejan el token guardado inservible: se relanza para que SignatureForm
      // (dueño del token) lo limpie y reabra el OTP en vez de reintentar en bucle.
      if (debeReiniciarOtp(err)) throw err;
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      // Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»).
      <EsqueletoDePagina variante="detail" className="mx-auto max-w-4xl" />
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
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 20-09 · El camino de vuelta va ARRIBA, no sólo dentro de la
            tarjeta: un fallo a pantalla completa sin encabezado no dice en qué
            parte del panel estás (Nico: «ni se entiende y no tiene navegación
            para recuperarse»). Ver `el-fallo-de-una-ficha-tiene-salida`. */}
        <BackButton href="/panel/inmobiliaria/contratos" label="Contratos" />
        <h1 className="text-h2 text-fg">Firmar el contrato</h1>
        {/*
          🔴 C27 (auditoría 2026-09-13): sin `onReintentar`, un corte de red
          dejaba «Volver» como única salida — se perdía el camino y había que
          entrar de nuevo por el listado. `refetch` vuelve a pedir el contrato
          sin moverse de la pantalla.
        */}
        <FalloDeCarga
          error={error}
          queEs="este contrato"
          onReintentar={refetch}
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

  // `pending_tenant` también es «el inquilino todavía no ha firmado»: se ve el
  // documento y el botón apagado con su motivo, no «no está pendiente».
  const esperaAlInquilino =
    contract.status === 'pending_tenant' || (contract.status === 'pending_landlord' && !inquilinoYaFirmo);

  // 🔴 QA-CONT-95: el éxito va ANTES que «no está pendiente de tu firma»:
  // recién firmado, el contrato ya no está pendiente y se pintaba el aviso.
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
              400 `INQUILINO_NO_HA_FIRMADO` si el inquilino no firmó antes, y al
              pasar deja el contrato en SIGNED. O sea que cuando esta pantalla
              aparece, el inquilino YA firmó y no hay nada que notificarle:
              la pantalla anunciaba un paso que ya había ocurrido y dejaba a
              quien firmó esperando una respuesta que no iba a llegar.
            */}
            <p className="text-sm text-success mt-1" data-testid="firmado-cierre">
              {contract.status === 'active'
                ? 'Firmaron las dos partes y el contrato ya está activo: nacieron sus cuotas. El PDF final incluye las dos firmas con su certificado.'
                : 'Firmaron las dos partes. El contrato se activa en su fecha de inicio. El PDF final incluye las dos firmas con su certificado.'}
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

  if (contract.status !== 'pending_landlord' && !esperaAlInquilino) {
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
          {contract.status === 'signed' && ' Ya firmaron las dos partes.'}
        </AlertaAccionable>
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
          {esperaAlInquilino
            ? 'Puedes revisar el documento mientras el inquilino firma.'
            : 'El inquilino ya firmó. Revisa el documento y firma para cerrar el contrato.'}
        </p>
      </div>

      {/* Preview */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Documento a firmar</h3>
        </div>
        <div className="p-5 space-y-3">
          {inquilinoYaFirmo && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                Este PDF ya incluye la <strong>firma del inquilino</strong> y un certificado parcial.
                Revísalo antes de firmar.
              </p>
            </div>
          )}

          {/* Cargando → el documento: se cruzan (`popLayout`: el documento
              entra YA y el spinner se va por encima). */}
          <CrossFade
            swapKey={
              hasTenantSignature && (isLoadingSignedPdf || signedPdfUrl)
                ? isLoadingSignedPdf
                  ? 'pdf-cargando'
                  : 'pdf-firmado'
                : isLoadingPreview
                  ? 'cargando'
                  : (preview?.origin ?? 'vacio')
            }
            mode="popLayout"
          >
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
            ) : preview?.origin === 'SIN_DOCUMENTO' ? (
              <p className="text-sm text-muted-foreground py-2" data-testid="contrato-sin-documento">
                Este contrato se cargó desde tu sistema anterior y no tiene documento generado en Leasefy.
              </p>
            ) : (
              <EmptyState
                icon={FileText}
                title="No hay vista previa disponible"
                description="Todavía no se puede mostrar el documento de este contrato."
              />
            )}
          </CrossFade>
        </div>
      </section>

      {/* Signature form */}
      {esperaAlInquilino ? (
        <InquilinoSinFirmar />
      ) : (
        <SignatureForm
          onSign={handleSign}
          contractId={contract.id}
          isLandlord
          isLoading={isSigning}
          signerName={contract.landlordName}
          // T-0109 contract.md §3.1.A3/§7 — SIGNING_OTP_LANDLORD_REQUIRED
          // default true en el back; el deploy debe ir front primero (este
          // cambio) para que el back nunca reciba una firma de arrendador sin
          // `otpVerificationToken` mientras hace el corte.
          requireOTP={true}
        />
      )}
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
