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
import { CheckCircle, FileText } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  AvisoDelEnlace,
  CargandoElEnlace,
  MarcoDelEnlace,
  TituloDelEnlace,
} from '@/components/enlace-publico/MarcoDelEnlace';
import { buttonVariants } from '@/components/ui/button';
import { SignatureForm } from '@/components/contract/SignatureForm';
import type { OtpAdapter } from '@/components/contract/OTPVerification';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { firmaPublicaDeConsignacionApi } from '@/lib/api/consignacion-firma.service';
import type { FirmaPublicaResponse } from '@/lib/api/consignacion-firma.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { fechaCorta, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { cn } from '@/lib/utils';

/** El día de la firma, en Colombia: «17 oct 2026». */
function diaDeLaFirma(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fechaCorta(hoyEnColombia(d));
}

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
    <MarcoDelEnlace
      ancho="lg"
      de={datos?.agencia.nombre}
      vista={cargando ? 'cargando' : enlaceInvalido ? 'invalido' : enlaceVencido ? 'vencido' : error && !datos ? 'error' : 'firma'}
    >
      {cargando ? (
        <CargandoElEnlace texto="Cargando el contrato…" />
      ) : enlaceInvalido ? (
        <AvisoDelEnlace tono="invalido" titulo="Enlace no válido" data-testid="enlace-invalido">
          <p>Este enlace de firma no es válido. Pide a la inmobiliaria que te envíe uno nuevo.</p>
        </AvisoDelEnlace>
      ) : enlaceVencido ? (
        <AvisoDelEnlace tono="vencido" titulo="Este enlace venció" data-testid="enlace-vencido">
          <p>Pide a la inmobiliaria que te envíe un enlace nuevo para firmar.</p>
        </AvisoDelEnlace>
      ) : error && !datos ? (
        <FalloDeCarga error={error} queEs="el proceso de firma" onReintentar={cargar} enmarcado={false} />
      ) : datos ? (
        <ContenidoFirmaPublica datos={datos} adapter={adapter} onFirmar={firmar} />
      ) : null}
    </MarcoDelEnlace>
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
      <TituloDelEnlace
        rotulo="Contrato de consignación"
        titulo="Firma el contrato de consignación"
        descripcion={
          <>
            Hola {firmante.nombre}, {agencia.nombre} te invitó a firmar el contrato de consignación de{' '}
            <strong className="font-medium text-fg">{consignacion.propertyTitle}</strong> — {consignacion.propertyAddress},{' '}
            {consignacion.propertyCity}.
          </>
        }
      />

      {/* Lo que se firma, primero y a la vista: el documento entero en otra pestaña. */}
      <div className="flex flex-col gap-3 rounded-md border border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-body-sm text-fg">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span>Lee el contrato completo antes de firmar.</span>
        </p>
        <a
          href={documento.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
          data-testid="ver-documento-publico"
        >
          Ver el documento
        </a>
      </div>

      {firmante.firmado ? (
        <Presence show className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3 text-body-sm text-fg" data-testid="ya-firmaste">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <span>Ya firmaste este contrato{firmante.firmadoAt ? ` el ${diaDeLaFirma(firmante.firmadoAt)}` : ''}.</span>
        </Presence>
      ) : proceso.estado === 'CANCELADO' ? (
        <p className="text-body-sm text-fg-muted" data-testid="proceso-cancelado">
          Este proceso de firma fue cancelado. Si tienes dudas, comunícate con {agencia.nombre}.
        </p>
      ) : proceso.estado === 'FIRMADO' ? (
        <Presence show className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3 text-body-sm text-fg" data-testid="proceso-cerrado">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <span>Este contrato ya quedó firmado por todas las partes.</span>
        </Presence>
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
