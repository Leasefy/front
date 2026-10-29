'use client';

/**
 * Lo que abre cada persona para firmar un documento de Firmas (Nico, 28-10-2026), SIN cuenta: el token de la URL abre
 * el documento y el código que le llega a su correo o a su WhatsApp es lo que deja firmar. Mismo patrón que
 * `/firmar/consignacion/[token]` y `/firmar/acta/[token]`.
 *
 * 404 `ENLACE_DE_FIRMA_INVALIDO` → «enlace no válido»; 410 `ENLACE_DE_FIRMA_VENCIDO` → «pide uno nuevo».
 *
 * Con la prueba de vida prendida (Nico, 28-10-2026: «la firma debe llevar la foto con prueba de vida»), antes del código
 * va la selfie de Didit (`PruebaDeVida`): dos pasos, «Tu foto» y «Tu código y tu firma». Didit devuelve a la persona a
 * este mismo enlace con `?vida=1` y aquí se pregunta el resultado. Ya firmado por todos, el código del documento y la
 * página que lo verifica.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, DownloadSimple, FileText, SealCheck } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AvisoDelEnlace, CargandoElEnlace, MarcoDelEnlace, PasosDelEnlace, TituloDelEnlace } from '@/components/enlace-publico/MarcoDelEnlace';
import { PruebaDeVida } from '@/components/firmas/PruebaDeVida';
import { buttonVariants } from '@/components/ui/button';
import { SignatureForm } from '@/components/contract/SignatureForm';
import type { OtpAdapter } from '@/components/contract/OTPVerification';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { firmaPublicaApi, type FirmaPublica, type PruebaDeVidaDelFirmante } from '@/lib/api/firmas.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { fechaYHora } from '@/components/firmas/textos-de-firmas';
import { cn } from '@/lib/utils';

export default function FirmarDocumentoPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<FirmaPublica | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  /** Volvió de Didit (`?vida=1`): la prueba de vida pregunta el resultado sola. Se lee una vez y se quita de la URL. */
  const [volvioDeDidit, setVolvioDeDidit] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('vida') === '1') {
      setVolvioDeDidit(true);
      url.searchParams.delete('vida');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const alCambiarLaPrueba = useCallback((pruebaDeVida: PruebaDeVidaDelFirmante) => {
    setDatos((d) => (d ? { ...d, pruebaDeVida } : d));
  }, []);

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
        <Contenido
          token={token}
          datos={datos}
          adapter={adapter}
          onFirmar={firmar}
          volvioDeDidit={volvioDeDidit}
          onCambioDeLaPrueba={alCambiarLaPrueba}
        />
      ) : null}
    </MarcoDelEnlace>
  );
}

function Contenido({
  token,
  datos,
  adapter,
  onFirmar,
  volvioDeDidit,
  onCambioDeLaPrueba,
}: {
  token: string;
  datos: FirmaPublica;
  adapter: OtpAdapter;
  onFirmar: (p: { signatureData: string; otpVerificationToken?: string }) => Promise<void>;
  volvioDeDidit: boolean;
  onCambioDeLaPrueba: (p: PruebaDeVidaDelFirmante) => void;
}) {
  const { firmante, documento, quienEnvia, firmantes } = datos;
  const otros = firmantes.filter((f) => !f.esUsted);
  // Un back anterior a la prueba de vida no manda el campo: se firma como siempre.
  const vida = datos.pruebaDeVida ?? null;
  const pideFoto = Boolean(vida?.requerida);
  const faltaLaFoto = pideFoto && vida?.estado !== 'APROBADA';
  const porFirmar = !firmante.firmado && documento.estado === 'ENVIADO';
  return (
    <>
      <TituloDelEnlace
        rotulo="Firma electrónica"
        titulo={documento.titulo}
        descripcion={
          <>
            Hola {firmante.nombre.split(' ')[0]}, {quienEnvia} te pide firmar este documento. Léelo
            {pideFoto ? ', tómate una foto para confirmar que eres tú' : ''} y fírmalo con el código que te llega
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
          <span className="space-y-1">
            <span className="block">
              {`Firmaste${firmante.firmadoAt ? ` el ${fechaYHora(firmante.firmadoAt)}` : ''}`.replace(/\.?$/, '.')}{' '}
              {documento.estado === 'FIRMADO' ? 'Ya firmaron todos: descárgalo cuando quieras.' : 'Cuando firmen todos te llega el documento firmado al correo.'}
            </span>
            {datos.verificacion ? (
              <span className="block text-fg-muted">
                Código del documento <span className="font-mono tabular-nums text-fg">{datos.verificacion.codigo}</span> ·{' '}
                <Link href={`/verificar-firma/${datos.verificacion.codigo.replace('-', '')}`} className="text-primary underline-offset-4 hover:underline">
                  verifícalo aquí
                </Link>
              </span>
            ) : null}
          </span>
        </Presence>
      ) : documento.estado === 'CANCELADO' ? (
        <p className="text-body-sm text-fg-muted" data-testid="documento-cancelado">
          {quienEnvia} canceló este documento. Si tienes dudas, escríbele.
        </p>
      ) : faltaLaFoto && vida ? (
        <>
          <PasosDelEnlace
            etiqueta="Pasos para firmar"
            pasos={[
              { titulo: 'Tu foto', estado: 'actual' },
              { titulo: 'Tu código y tu firma', estado: 'pendiente' },
            ]}
          />
          <PruebaDeVida token={token} prueba={vida} quienEnvia={quienEnvia} volvioDeDidit={volvioDeDidit} onCambio={onCambioDeLaPrueba} />
        </>
      ) : (
        <>
          {pideFoto && porFirmar ? (
            <>
              <PasosDelEnlace
                etiqueta="Pasos para firmar"
                pasos={[
                  { titulo: 'Tu foto', estado: 'hecho' },
                  { titulo: 'Tu código y tu firma', estado: 'actual' },
                ]}
              />
              <Presence show className="flex items-center gap-2 text-body-sm text-fg" data-testid="prueba-de-vida-aprobada">
                <SealCheck className="h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
                Confirmamos que eres tú. Ahora pide tu código y firma.
              </Presence>
            </>
          ) : null}
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
        </>
      )}
    </>
  );
}
