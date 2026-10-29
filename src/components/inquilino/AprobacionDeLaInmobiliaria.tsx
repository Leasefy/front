'use client';

/**
 * La aprobación que pide la inmobiliaria, en la postulación del inquilino (Nico, 28-10-2026: «el arrendatario adjunta el
 * comprobante de pago en la solicitud»). Le dice cuánto cuesta, a qué cuenta pagarla y le deja subir el comprobante;
 * después, si la inmobiliaria lo aceptó, lo rechazó (con el motivo) y qué aseguradora lo aprobó. Al inquilino se le
 * dice «aprobación» y «tope aprobado», nunca «estudio» (docs/VOCABULARIO.md).
 *
 * Nico 29-10-2026 («las dos formas»; «se la giramos con su liquidación»): si la inmobiliaria lo recibe en línea, «Pagar
 * en línea» lleva a Wompi y vuelve con `?aprobacion=pagada`; mientras la pasarela confirma, se espera aquí.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, CreditCard, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { CopyButton, Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { QrParaPagar } from '@/components/tenant/QrParaPagar';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { aprobacionDeLaInmobiliariaApi, type AprobacionDeLaInmobiliaria as Datos } from '@/lib/api/asegurabilidad-manual.service';
import { useTr } from '@/lib/i18n/use-tr';

/** Cuántas veces se pregunta, al volver de la pasarela, si ya llegó la confirmación (cada 3 s). */
const VUELTAS_ESPERANDO_LA_PASARELA = 10;

function volvioDeLaPasarela(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('aprobacion') === 'pagada';
}

function dia(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function AprobacionDeLaInmobiliaria({ applicationId }: { applicationId: string }) {
  const tr = useTr();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [abriendoLaPasarela, setAbriendoLaPasarela] = useState(false);
  // Al volver de Wompi: 'esperando' mientras llega la confirmación; 'tarde' si no llegó en ~30 s.
  const [pasarela, setPasarela] = useState<'esperando' | 'tarde' | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await aprobacionDeLaInmobiliariaApi.ver(applicationId));
    } catch {
      setDatos(null);
    }
  }, [applicationId]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const yaPagada = Boolean(datos?.pagadaHasta) || datos?.comprobante?.estado === 'ACEPTADO';
  useEffect(() => {
    if (!volvioDeLaPasarela()) return;
    if (yaPagada) {
      setPasarela(null);
      return;
    }
    setPasarela('esperando');
    let vueltas = 0;
    const reloj = setInterval(() => {
      vueltas += 1;
      if (vueltas > VUELTAS_ESPERANDO_LA_PASARELA) {
        clearInterval(reloj);
        setPasarela('tarde');
        return;
      }
      void cargar();
    }, 3000);
    return () => clearInterval(reloj);
  }, [yaPagada, cargar]);

  const pagarEnLinea = async () => {
    setAbriendoLaPasarela(true);
    try {
      const { url } = await aprobacionDeLaInmobiliariaApi.pagarEnLinea(applicationId);
      window.location.assign(url);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: tr('No pudimos abrir el pago en línea.'), accion: tr('pagar en línea') }));
      setAbriendoLaPasarela(false);
    }
  };

  const subir = async (f: File | undefined) => {
    if (!f) return;
    setSubiendo(true);
    try {
      setDatos(await aprobacionDeLaInmobiliariaApi.subirComprobante(applicationId, f));
      toast.success(tr('Listo: le llegó tu comprobante a la inmobiliaria.'));
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: tr('No pudimos subir el comprobante.'), accion: tr('subir el comprobante') }));
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  if (!datos || (!datos.pide && datos.aprobacion === null)) return null;
  const quien = datos.inmobiliaria ?? tr('la inmobiliaria');
  const c = datos.comprobante;
  const pagada = yaPagada;
  const enLinea = datos.formas.includes('WOMPI');
  const conComprobante = datos.formas.includes('COMPROBANTE');

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-6" data-testid="aprobacion-de-la-inmobiliaria">
      <h2 className="text-h3 text-fg">{tr('Tu aprobación con {quien}', { quien })}</h2>

      {datos.aprobacion === 'APROBADA' ? (
        <div className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3" data-testid="aprobacion-aprobada">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <div className="space-y-0.5 text-body-sm text-fg">
            <p>
              {tr('Estás aprobado')}
              {datos.aprobadaPor.length > 0 ? ` ${tr('por')} ${datos.aprobadaPor.join(', ')}` : ''}.
            </p>
            {datos.topeAprobadoCop ? (
              <p className="text-fg-muted">
                {tr('Tope aprobado')}: <span className="font-mono tabular-nums text-fg">{formatCurrency(datos.topeAprobadoCop)}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : datos.aprobacion === 'NO_APROBADA' ? (
        <p className="text-body-sm text-fg-muted" data-testid="aprobacion-no-aprobada">
          {tr('Las aseguradoras de {quien} no aprobaron tu postulación. Si tienes dudas, escríbele por el chat.', { quien })}
        </p>
      ) : pagada ? (
        <p className="text-body-sm text-fg-muted" data-testid="aprobacion-en-revision">
          {datos.pagadaHasta
            ? tr('Ya pagaste tu aprobación con {quien}: te sirve hasta el {fecha} en cualquiera de sus inmuebles.', { quien, fecha: dia(datos.pagadaHasta) })
            : c?.enLinea
              ? tr('Pagaste en línea. {quien} está revisando tu aprobación con sus aseguradoras.', { quien })
              : tr('{quien} recibió tu pago y está revisando tu aprobación con sus aseguradoras.', { quien })}
        </p>
      ) : datos.pide ? (
        <div className="space-y-4">
          <p className="text-body-sm text-fg-muted">
            {tr('Para estudiar tu postulación, {quien} cobra la aprobación con sus aseguradoras:', { quien })}{' '}
            <span className="font-mono tabular-nums text-fg">{datos.precioCop ? formatCurrency(datos.precioCop) : ''}</span>.{' '}
            {enLinea && conComprobante
              ? tr('Págala en línea, o a su cuenta y sube aquí el comprobante.')
              : enLinea
                ? tr('Págala en línea con tarjeta, PSE o Nequi.')
                : tr('Págala a esta cuenta y sube aquí el comprobante.')}
          </p>

          <Presence show={pasarela !== null} direction="down">
            <p className="flex items-start gap-2 rounded-md bg-surface-muted px-4 py-3 text-body-sm text-fg" role="status" data-testid="esperando-la-pasarela">
              {pasarela === 'tarde'
                ? tr('Todavía no nos llega la confirmación de la pasarela. Si ya pagaste, en unos minutos se ve aquí.')
                : tr('Estamos confirmando tu pago con la pasarela. Tarda unos segundos.')}
            </p>
          </Presence>

          {enLinea ? (
            <div>
              <Button hideArrow isLoading={abriendoLaPasarela} onClick={() => void pagarEnLinea()} data-testid="pagar-en-linea">
                <CreditCard className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {tr('Pagar en línea')}
              </Button>
              <p className="mt-1.5 text-caption text-fg-subtle">{tr('Tarjeta, PSE o Nequi. Se confirma solo.')}</p>
            </div>
          ) : null}

          {conComprobante && datos.cuenta ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-md bg-surface-muted p-4 text-body-sm sm:grid-cols-2" data-testid="cuenta-de-la-aprobacion">
              {[
                [tr('Medio'), datos.cuenta.banco ? `${datos.cuenta.tipoLegible} · ${datos.cuenta.banco}` : datos.cuenta.tipoLegible],
                [tr('Tipo de cuenta'), datos.cuenta.tipoDeCuenta],
                [tr('Titular'), datos.cuenta.titular],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-caption text-fg-muted">{k}</dt>
                    <dd className="text-fg">{v}</dd>
                  </div>
                ))}
              {datos.cuenta.numero ? (
                <div>
                  <dt className="text-caption text-fg-muted">{tr('Número')}</dt>
                  <dd className="flex items-center gap-2 text-fg">
                    <span className="font-mono tabular-nums">{datos.cuenta.numero}</span>
                    <CopyButton text={datos.cuenta.numero} label={tr('Copiar')} copiedLabel={tr('Copiado')} size="sm" variant="ghost" />
                  </dd>
                </div>
              ) : null}
              {datos.cuenta.instrucciones ? <p className="text-caption text-fg-muted sm:col-span-2">{datos.cuenta.instrucciones}</p> : null}
            </dl>
          ) : null}
          {conComprobante && datos.cuenta?.qrUrl ? <QrParaPagar url={datos.cuenta.qrUrl} nombre={quien} /> : null}

          <Presence show={c?.estado === 'RECHAZADO'} direction="down">
            <p className="flex items-start gap-2 text-body-sm text-fg" data-testid="comprobante-rechazado">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              {tr('{quien} no pudo aceptar tu comprobante: {motivo} Sube otro.', { quien, motivo: c?.motivo ?? '' })}
            </p>
          </Presence>
          {c?.estado === 'POR_REVISAR' ? (
            <p className="text-body-sm text-fg-muted" data-testid="comprobante-por-revisar">
              {tr('Recibimos tu comprobante el {fecha}. {quien} lo está revisando.', { quien, fecha: dia(c.subidoAt) })}
            </p>
          ) : null}

          {conComprobante ? (
            <div>
              <input
                ref={archivo}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void subir(e.target.files?.[0])}
                data-testid="archivo-del-comprobante"
              />
              <Button
                variant={c || enLinea ? 'outline' : 'default'}
                hideArrow
                isLoading={subiendo}
                onClick={() => archivo.current?.click()}
                data-testid="subir-comprobante"
              >
                <UploadSimple className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {c ? tr('Subir otro comprobante') : tr('Subir el comprobante')}
              </Button>
              <p className="mt-1.5 text-caption text-fg-subtle">{tr('PDF o foto, hasta 10 MB.')}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
