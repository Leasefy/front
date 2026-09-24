'use client';

/**
 * 🔴 Lo que abre el PROPIETARIO desde el correo para firmar el mandato de su
 * inmueble, SIN sesión (auditoría de lógica, 23-09-2026).
 *
 * Antes esta página no existía: la inmobiliaria recibía el token y lo
 * «reenviaba», y el enlace daba 404 — pero con ese token solo se podía firmar
 * por la API, así que quien lo pidió podía firmar por el propietario. Ahora el
 * enlace le llega por correo desde el servidor, y firmar exige además un
 * código de 6 dígitos que le llega a ESE correo (el enmascarado que se ve
 * acá). Tres pasos: reconocer el mandato → pedir el código → firmar.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, FileText, WarningCircle } from '@phosphor-icons/react';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import {
  firmaDelMandatoApi,
  type CodigoEnviado,
  type ContextoDeLaFirma,
} from '@/lib/api/firma-del-mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

/** Los códigos con los que el código de 6 dígitos ya no sirve y hay que pedir otro. */
const HAY_QUE_PEDIR_OTRO = new Set(['CODIGO_VENCIDO', 'DEMASIADOS_INTENTOS']);

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FirmaDelMandatoPage() {
  const { token } = useParams<{ token: string }>();
  const [contexto, setContexto] = useState<ContextoDeLaFirma | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);
  const [noVigente, setNoVigente] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [enviado, setEnviado] = useState<CodigoEnviado | null>(null);
  const [codigo, setCodigo] = useState('');
  const [pidiendo, setPidiendo] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [firmadaEl, setFirmadaEl] = useState<string | null>(null);
  const [leyoElDocumento, setLeyoElDocumento] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setContexto(await firmaDelMandatoApi.contexto(token));
      setErrorDeCarga(null);
      setNoVigente(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNoVigente(true);
      else setErrorDeCarga(e);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // 🔴 El documento que firma (decisión de Nico, 23-09-2026): el PDF del
  // mandato con su huella. Se abre antes de poder aceptar; la firma manda esa
  // huella y el back rechaza si el documento cambió.
  async function verDocumento() {
    setAbriendo(true);
    setAviso(null);
    try {
      const blob = await firmaDelMandatoApi.pdf(token);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setLeyoElDocumento(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNoVigente(true);
      else setAviso(mensajeDelFallo(e, 'No pudimos abrir el documento. Intenta de nuevo.'));
    } finally {
      setAbriendo(false);
    }
  }

  async function pedirCodigo() {
    setPidiendo(true);
    setAviso(null);
    try {
      setEnviado(await firmaDelMandatoApi.pedirCodigo(token));
      setCodigo('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNoVigente(true);
      else setAviso(mensajeDelFallo(e, 'No pudimos mandarte el código. Intenta de nuevo.'));
    } finally {
      setPidiendo(false);
    }
  }

  async function firmar() {
    setFirmando(true);
    setAviso(null);
    try {
      const r = await firmaDelMandatoApi.firmar(token, codigo, contexto?.documento?.sha256 ?? '');
      setFirmadaEl(r.firmadaEl);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNoVigente(true);
      } else {
        if (e instanceof ApiError && e.code && HAY_QUE_PEDIR_OTRO.has(e.code)) {
          setEnviado(null);
        }
        // El documento cambió desde que lo abrió: se recarga y se vuelve a revisar.
        if (e instanceof ApiError && e.code === 'PDF_DEL_MANDATO_DISTINTO') {
          setEnviado(null);
          setAcepto(false);
          setLeyoElDocumento(false);
          void cargar();
        }
        setAviso(mensajeDelFallo(e, 'No pudimos firmar. Intenta de nuevo.'));
      }
    } finally {
      setFirmando(false);
    }
  }

  const codigoCompleto = /^\d{6}$/.test(codigo);

  return (
    <main className="min-h-screen bg-bg flex items-start sm:items-center justify-center px-4 py-8 sm:p-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>

        {firmadaEl ? (
          <div className="space-y-2" data-testid="mandato-firmado">
            <h1 className="text-h4">Listo, firmaste el mandato</h1>
            <p className="text-body-sm text-success flex gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              Quedó firmado el {fechaLarga(firmadaEl)}.
            </p>
            <p className="text-body-sm text-fg-muted">
              {contexto?.inmobiliaria ?? 'La inmobiliaria'} ya puede ver tu firma. Puedes cerrar esta página.
            </p>
          </div>
        ) : noVigente ? (
          <div className="space-y-2" data-testid="enlace-no-vigente">
            <h1 className="text-h4">Este enlace ya no sirve</h1>
            <p className="text-body-sm text-fg-muted">
              Venció, se anuló o el mandato ya está firmado. Si todavía tienes que firmarlo, pídele un enlace nuevo a
              la inmobiliaria.
            </p>
          </div>
        ) : errorDeCarga ? (
          <FalloDeCarga error={errorDeCarga} queEs="el mandato" onReintentar={cargar} />
        ) : !contexto ? (
          <p className="text-body-sm text-fg-muted">Cargando…</p>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-h4">Firma el mandato de tu inmueble</h1>
              <p className="text-body-sm text-fg-muted">
                Hola {contexto.firmante}, {contexto.inmobiliaria ?? 'tu inmobiliaria'} te pide firmar el mandato para
                administrar tu inmueble.
              </p>
            </div>

            <dl className="rounded-md bg-surface-muted px-4 py-3 space-y-2 text-body-sm" data-testid="datos-del-mandato">
              <div>
                <dt className="text-fg-muted">Inmueble</dt>
                <dd className="font-medium">
                  {contexto.inmueble.titulo ?? 'Tu inmueble'}
                  {contexto.inmueble.sector ? ` · ${contexto.inmueble.sector}` : ''}
                </dd>
              </div>
              {contexto.comisionPct !== null ? (
                <div>
                  <dt className="text-fg-muted">Comisión de administración</dt>
                  <dd className="font-mono">{contexto.comisionPct} %</dd>
                </div>
              ) : null}
              {contexto.venceEl ? (
                <div>
                  <dt className="text-fg-muted">El enlace vence</dt>
                  <dd>{fechaLarga(contexto.venceEl)}</dd>
                </div>
              ) : null}
            </dl>

            {!contexto.documento ? (
              <p className="text-body-sm text-fg-muted" data-testid="sin-documento">
                Este enlace no trae el documento del mandato, así que no se puede firmar. Pídele a{' '}
                {contexto.inmobiliaria ?? 'la inmobiliaria'} un enlace nuevo.
              </p>
            ) : !enviado ? (
              <div className="space-y-4">
                <div className="rounded-md border border-border px-4 py-3 space-y-2">
                  <p className="text-body-sm">
                    Lee el mandato completo antes de firmar. Tu firma queda atada a este documento.
                  </p>
                  <p className="text-body-sm text-fg-muted">
                    Huella del documento:{' '}
                    <span className="font-mono break-all" data-testid="huella-del-documento">
                      {contexto.documento.sha256.slice(0, 16)}…
                    </span>
                  </p>
                  <Button
                    variant="outline"
                    onClick={verDocumento}
                    isLoading={abriendo}
                    className="w-full"
                    data-testid="ver-el-mandato"
                  >
                    {leyoElDocumento ? 'Volver a ver el mandato (PDF)' : 'Ver el mandato (PDF)'}
                  </Button>
                </div>
                <label
                  className={`flex gap-3 text-body-sm ${leyoElDocumento ? 'cursor-pointer' : 'text-fg-subtle'}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 flex-shrink-0 accent-primary"
                    checked={acepto}
                    disabled={!leyoElDocumento}
                    onChange={(e) => setAcepto(e.target.checked)}
                    data-testid="acepto-el-mandato"
                  />
                  <span>
                    Leí el mandato y autorizo a {contexto.inmobiliaria ?? 'la inmobiliaria'} a administrar mi
                    inmueble en esas condiciones.
                    {!leyoElDocumento ? ' (Primero abre el documento.)' : ''}
                  </span>
                </label>
                <p className="text-body-sm text-fg-muted">
                  Para firmar te mandamos un código de 6 dígitos
                  {contexto.codigoA ? (
                    <>
                      {' '}a <span className="font-mono">{contexto.codigoA}</span>
                    </>
                  ) : null}
                  . No se lo compartas a nadie, tampoco a la inmobiliaria.
                </p>
                {aviso ? <Aviso texto={aviso} /> : null}
                <Button
                  onClick={pedirCodigo}
                  isLoading={pidiendo}
                  disabled={!acepto}
                  className="w-full"
                  data-testid="pedir-codigo"
                >
                  Mandarme el código
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-sm text-fg-muted" data-testid="codigo-enviado">
                  Te mandamos el código a <span className="font-mono">{enviado.enviadoA}</span>. Vence a las{' '}
                  {new Date(enviado.venceEl).toLocaleTimeString('es-CO', {
                    timeZone: 'America/Bogota',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  .
                </p>
                <label className="block space-y-1.5">
                  <span className="text-body-sm font-medium">Código de 6 dígitos</span>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-md border border-border bg-surface px-4 py-3 font-mono text-2xl tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="codigo"
                  />
                </label>
                {aviso ? <Aviso texto={aviso} /> : null}
                <Button
                  onClick={firmar}
                  isLoading={firmando}
                  disabled={!codigoCompleto}
                  className="w-full"
                  data-testid="firmar-mandato"
                >
                  Firmar el mandato
                </Button>
                <button
                  type="button"
                  onClick={pedirCodigo}
                  disabled={pidiendo}
                  className="w-full text-body-sm text-primary underline-offset-4 hover:underline disabled:text-fg-subtle"
                >
                  No me llegó: mandarme otro
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="text-body-sm text-danger flex gap-2" role="alert">
      <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      {texto}
    </p>
  );
}
