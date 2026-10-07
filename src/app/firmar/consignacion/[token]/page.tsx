'use client';

/**
 * T-0109 contract.md §3.1.D — lo que abre el COPROPIETARIO desde el correo de
 * invitación para firmar electrónicamente el contrato de consignación, SIN
 * sesión: el token de la URL es la credencial (mismo patrón que
 * `/confirmar-cuenta/[token]`).
 *
 * Estados fijos del contrato: 404 `ENLACE_DE_FIRMA_INVALIDO` → "enlace no
 * válido"; 410 `ENLACE_DE_FIRMA_VENCIDO` → "pide un enlace nuevo". Cualquier
 * otro fallo es un error real, no un estado del enlace.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, WarningCircle } from '@phosphor-icons/react';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SignatureForm } from '@/components/contract/SignatureForm';
import type { OtpAdapter } from '@/components/contract/OTPVerification';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { firmaPublicaDeConsignacionApi } from '@/lib/api/consignacion-firma.service';
import type { FirmaPublicaResponse } from '@/lib/api/consignacion-firma.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

export default function FirmarConsignacionPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<FirmaPublicaResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await firmaPublicaDeConsignacionApi.obtener(token));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enlaceInvalido = error instanceof ApiError && error.status === 404;
  const enlaceVencido = error instanceof ApiError && error.status === 410;

  const adapter: OtpAdapter = {
    send: async () => {
      const r = await firmaPublicaDeConsignacionApi.otpSend(token);
      return { sentTo: r.sentTo, cooldownSeconds: r.cooldownSeconds ?? 60, channels: r.channels };
    },
    verify: async (code: string) => {
      const r = await firmaPublicaDeConsignacionApi.otpVerify(token, code);
      return { verificationToken: r.verificationToken };
    },
  };

  const firmar = async ({ signatureData, otpVerificationToken }: { signatureData: string; otpVerificationToken?: string }) => {
    if (!otpVerificationToken) return;
    try {
      const actualizado = await firmaPublicaDeConsignacionApi.firmar(token, {
        acceptedTerms: true,
        consentText: 'Firmo el contrato de consignación como copropietario del inmueble.',
        signatureData,
        otpVerificationToken,
      });
      setDatos(actualizado);
      toast.success('Firmaste el contrato de consignación.');
    } catch (err) {
      // 02-10-2026: con un `porDefecto` de verdad (antes `''`: un fallo sin
      // texto legible dejaba el toast sin descripción).
      toast.error('No se pudo firmar.', {
        description: mensajeDelFallo(err, 'Prueba de nuevo en un momento.'),
      });
      // T-0109 contract.md §3.3 — relanzado para que SignatureForm reabra el
      // OTP en TOKEN_DE_FIRMA_INVALIDO/CODIGO_DE_FIRMA_REQUERIDO.
      throw err;
    }
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-8 space-y-5 shadow-sm">
        <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>

        {cargando ? (
          <p className="text-body-sm text-fg-muted">Cargando…</p>
        ) : enlaceInvalido ? (
          <div className="space-y-2" data-testid="enlace-invalido">
            <h1 className="text-h2">Enlace no válido</h1>
            <p className="text-body-sm text-fg-muted flex items-start gap-2">
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              Este enlace de firma no es válido. Pide a la inmobiliaria que te envíe uno nuevo.
            </p>
          </div>
        ) : enlaceVencido ? (
          <div className="space-y-2" data-testid="enlace-vencido">
            <h1 className="text-h2">Este enlace venció</h1>
            <p className="text-body-sm text-warning flex items-start gap-2">
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              Pide a la inmobiliaria que te envíe un enlace nuevo para firmar.
            </p>
          </div>
        ) : error && !datos ? (
          <FalloDeCarga error={error} queEs="el proceso de firma" onReintentar={cargar} enmarcado={false} />
        ) : datos ? (
          <ContenidoFirmaPublica datos={datos} adapter={adapter} onFirmar={firmar} />
        ) : null}
      </section>
    </main>
  );
}

function ContenidoFirmaPublica({
  datos,
  adapter,
  onFirmar,
}: {
  datos: FirmaPublicaResponse;
  adapter: OtpAdapter;
  onFirmar: (p: { signatureData: string; otpVerificationToken?: string }) => Promise<void>;
}) {
  const { firmante, proceso, consignacion, agencia, documento } = datos;

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-h2">Firma el contrato de consignación</h1>
        <p className="text-body-sm text-fg-muted">
          Hola {firmante.nombre}, {agencia.nombre} te invitó a firmar el contrato de consignación de{' '}
          <strong>{consignacion.propertyTitle}</strong> — {consignacion.propertyAddress}, {consignacion.propertyCity}.
        </p>
      </div>

      <a
        href={documento.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-body-sm text-primary hover:underline"
        data-testid="ver-documento-publico"
      >
        <FileText className="w-4 h-4" />
        Ver el documento
      </a>

      {firmante.firmado ? (
        <p className="text-body-sm text-success" data-testid="ya-firmaste">
          Ya firmaste este contrato{firmante.firmadoAt ? ` el ${new Date(firmante.firmadoAt).toLocaleDateString('es-CO')}` : ''}.
        </p>
      ) : proceso.estado === 'CANCELADO' ? (
        <p className="text-body-sm text-fg-muted" data-testid="proceso-cancelado">
          Este proceso de firma fue cancelado. Si tienes dudas, comunícate con {agencia.nombre}.
        </p>
      ) : proceso.estado === 'FIRMADO' ? (
        <p className="text-body-sm text-success" data-testid="proceso-cerrado">
          Este contrato ya quedó firmado por todas las partes.
        </p>
      ) : (
        <SignatureForm
          onSign={onFirmar}
          adapter={adapter}
          isLandlord={false}
          rolLabel="Copropietario"
          textos={{
            firmado: 'Contrato de consignación firmado',
            aceptacion: 'Acepto los términos del contrato de consignación.',
            boton: 'Firmar el contrato',
          }}
        />
      )}
    </>
  );
}
