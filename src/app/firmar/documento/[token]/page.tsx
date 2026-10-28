'use client';

/**
 * Lo que abre cada persona para firmar un documento de Firmas (Nico, 28-10-2026), SIN cuenta: el token de la URL abre
 * el documento y el código que le llega a su correo o a su WhatsApp es lo que deja firmar. Mismo patrón que
 * `/firmar/consignacion/[token]` y `/firmar/acta/[token]`.
 *
 * 404 `ENLACE_DE_FIRMA_INVALIDO` → «enlace no válido»; 410 `ENLACE_DE_FIRMA_VENCIDO` → «pide uno nuevo».
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, DownloadSimple, FileText } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AvisoDelEnlace, CargandoElEnlace, MarcoDelEnlace, TituloDelEnlace } from '@/components/enlace-publico/MarcoDelEnlace';
import { buttonVariants } from '@/components/ui/button';
import { SignatureForm } from '@/components/contract/SignatureForm';
import type { OtpAdapter } from '@/components/contract/OTPVerification';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { firmaPublicaApi, type FirmaPublica } from '@/lib/api/firmas.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { fechaYHora } from '@/components/firmas/textos-de-firmas';
import { cn } from '@/lib/utils';

export default function FirmarDocumentoPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<FirmaPublica | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await firmaPublicaApi.obtener(token));
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

  const invalido = error instanceof ApiError && error.status === 404;
  const vencido = error instanceof ApiError && error.status === 410;
  const noDisponible = error instanceof ApiError && error.status === 503;

  const adapter: OtpAdapter = {
    send: async () => {
      const r = await firmaPublicaApi.otpSend(token);
      return { sentTo: r.sentTo, cooldownSeconds: r.cooldownSeconds ?? 60, channels: r.channels };
    },
    verify: async (code: string) => {
      const r = await firmaPublicaApi.otpVerify(token, code);
      return { verificationToken: r.verificationToken };
    },
  };

  const firmar = async ({ signatureData, otpVerificationToken }: { signatureData: string; otpVerificationToken?: string }) => {
    if (!otpVerificationToken) return;
    try {
      setDatos(await firmaPublicaApi.firmar(token, { signatureData, acceptedTerms: true, otpVerificationToken }));
      toast.success('¡Listo, firmaste!');
    } catch (err) {
      toast.error('No se pudo firmar.', { description: mensajeDelFallo(err, 'Prueba de nuevo en un momento.') });
      throw err;
    }
  };

  return (
    <MarcoDelEnlace
      ancho="lg"
      de={datos?.quienEnvia}
      vista={cargando ? 'cargando' : invalido ? 'invalido' : vencido ? 'vencido' : error && !datos ? 'error' : 'firma'}
    >
      {cargando ? (
        <CargandoElEnlace texto="Abriendo el documento…" />
      ) : invalido ? (
        <AvisoDelEnlace tono="invalido" titulo="Enlace no válido" data-testid="enlace-invalido">
          <p>Este enlace para firmar no es válido. Pide a quien te lo envió uno nuevo.</p>
        </AvisoDelEnlace>
      ) : vencido ? (
        <AvisoDelEnlace tono="vencido" titulo="Este enlace venció" data-testid="enlace-vencido">
          <p>Pide a quien te lo envió que te mande un enlace nuevo para firmar.</p>
        </AvisoDelEnlace>
      ) : noDisponible && !datos ? (
        <AvisoDelEnlace tono="vencido" titulo="Volvemos en un momento" data-testid="firmas-no-disponible">
          <p>La firma de documentos no está disponible ahora mismo. Intenta de nuevo en un rato.</p>
        </AvisoDelEnlace>
      ) : error && !datos ? (
        <FalloDeCarga error={error} queEs="el documento" onReintentar={cargar} enmarcado={false} />
      ) : datos ? (
        <Contenido datos={datos} adapter={adapter} onFirmar={firmar} />
      ) : null}
    </MarcoDelEnlace>
  );
}

function Contenido({
  datos,
  adapter,
  onFirmar,
}: {
  datos: FirmaPublica;
  adapter: OtpAdapter;
  onFirmar: (p: { signatureData: string; otpVerificationToken?: string }) => Promise<void>;
}) {
  const { firmante, documento, quienEnvia, firmantes } = datos;
  const otros = firmantes.filter((f) => !f.esUsted);
  return (
    <>
      <TituloDelEnlace
        rotulo="Firma electrónica"
        titulo={documento.titulo}
        descripcion={
          <>
            Hola {firmante.nombre.split(' ')[0]}, {quienEnvia} te pide firmar este documento. Léelo y fírmalo con el código que te llega
            {datos.canales.whatsapp ? ' a tu correo o tu WhatsApp' : ' a tu correo'}. No necesitas crear una cuenta.
          </>
        }
      />

      {documento.mensaje ? <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-fg-muted">«{documento.mensaje}»</p> : null}

      <div className="flex flex-col gap-3 rounded-md border border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-body-sm text-fg">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span>
            {documento.firmado ? 'El documento firmado, con la hoja de firmas al final.' : `Lee el documento completo antes de firmar (${documento.paginas} ${documento.paginas === 1 ? 'página' : 'páginas'}).`}
          </span>
        </p>
        <a
          href={documento.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: documento.firmado ? 'default' : 'outline', size: 'sm' }), 'shrink-0')}
          data-testid="ver-documento-publico"
        >
          {documento.firmado ? (
            <>
              <DownloadSimple className="mr-1.5 h-4 w-4" /> Descargar firmado
            </>
          ) : (
            'Ver el documento'
          )}
        </a>
      </div>

      {otros.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Quiénes firman">
          {firmantes.map((f) => (
            <li key={f.nombre + String(f.esUsted)} className="flex items-center gap-2 text-body-sm">
              {f.firmado ? <CheckCircle className="h-4 w-4 text-success" weight="fill" aria-hidden="true" /> : <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />}
              <span className="text-fg">{f.esUsted ? `${f.nombre} (tú)` : f.nombre}</span>
              <span className="text-fg-subtle">{f.firmado ? 'firmó' : 'falta'}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {firmante.firmado ? (
        <Presence show className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3 text-body-sm text-fg" data-testid="ya-firmaste">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <span>
            Firmaste{firmante.firmadoAt ? ` el ${fechaYHora(firmante.firmadoAt)}` : ''}.{' '}
            {documento.estado === 'FIRMADO' ? 'Ya firmaron todos: descárgalo cuando quieras.' : 'Cuando firmen todos te llega el documento firmado al correo.'}
          </span>
        </Presence>
      ) : documento.estado === 'CANCELADO' ? (
        <p className="text-body-sm text-fg-muted" data-testid="documento-cancelado">
          {quienEnvia} canceló este documento. Si tienes dudas, escríbele.
        </p>
      ) : (
        <SignatureForm
          onSign={onFirmar}
          adapter={adapter}
          isLandlord={false}
          rolLabel="Firmante"
          textos={{
            firmado: 'Documento firmado',
            aceptacion: 'Leí el documento y lo firmo electrónicamente.',
            boton: 'Firmar el documento',
            queSeFirma: 'este documento',
          }}
        />
      )}
    </>
  );
}
