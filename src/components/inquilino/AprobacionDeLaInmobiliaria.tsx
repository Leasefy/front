'use client';

/**
 * La aprobación que pide la inmobiliaria, en la postulación del inquilino (Nico, 28-10-2026: «el arrendatario adjunta el
 * comprobante de pago en la solicitud»). Le dice cuánto cuesta, a qué cuenta pagarla y le deja subir el comprobante;
 * después, si la inmobiliaria lo aceptó, lo rechazó (con el motivo) y qué aseguradora lo aprobó. Al inquilino se le
 * dice «aprobación» y «tope aprobado», nunca «estudio» (docs/VOCABULARIO.md).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { CopyButton, Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { aprobacionDeLaInmobiliariaApi, type AprobacionDeLaInmobiliaria as Datos } from '@/lib/api/asegurabilidad-manual.service';
import { useTr } from '@/lib/i18n/use-tr';

function dia(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function AprobacionDeLaInmobiliaria({ applicationId }: { applicationId: string }) {
  const tr = useTr();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [subiendo, setSubiendo] = useState(false);
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
  const pagada = Boolean(datos.pagadaHasta) || c?.estado === 'ACEPTADO';

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
            : tr('{quien} recibió tu pago y está revisando tu aprobación con sus aseguradoras.', { quien })}
        </p>
      ) : datos.pide ? (
        <div className="space-y-4">
          <p className="text-body-sm text-fg-muted">
            {tr('Para estudiar tu postulación, {quien} cobra la aprobación con sus aseguradoras:', { quien })}{' '}
            <span className="font-mono tabular-nums text-fg">{datos.precioCop ? formatCurrency(datos.precioCop) : ''}</span>.{' '}
            {tr('Págala a esta cuenta y sube aquí el comprobante.')}
          </p>
          {datos.cuenta ? (
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

          {datos.formas.includes('COMPROBANTE') ? (
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
                variant={c ? 'outline' : 'default'}
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
