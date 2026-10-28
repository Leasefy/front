'use client';

/**
 * El cajón de un documento de Firmas: quién ya firmó y quién falta, su enlace por WhatsApp (sale del celular de quien
 * envía, con el texto listo), reenviar el correo, descargar el PDF (el firmado y sellado, o el original mientras
 * tanto) y cancelar (si nadie ha firmado, la firma vuelve a la bolsa).
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, DownloadSimple, EnvelopeSimple, WhatsappLogo, XCircle } from '@phosphor-icons/react';
import { CopyButton, StatusBadge } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { confirmar } from '@/components/ui/confirmar';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { firmasApi, type ComoPaga, type DetalleDelDocumento, type DondeFirma } from '@/lib/api/firmas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { COLORES_DE_FIRMANTE } from '@/lib/firmas/reglas-de-firmas';
import { ESTADO_DEL_DOCUMENTO, fechaYHora, FORMA_DE_PAGO } from './textos-de-firmas';

interface Props {
  id: string | null;
  donde: DondeFirma;
  alCerrar: () => void;
  alCambiar: () => void;
  /** Para enviar un borrador: lo que queda en la bolsa y si puede ir a la factura. */
  pago?: { bolsa: number; factura: boolean };
}

export function DetalleDeFirma({ id, donde, alCerrar, alCambiar, pago }: Props) {
  const [doc, setDoc] = useState<DetalleDelDocumento | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);

  const leer = useCallback(async () => {
    if (!id) return;
    try {
      setDoc(await firmasApi(donde).detalle(id));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [id, donde]);

  useEffect(() => {
    setDoc(null);
    void leer();
  }, [leer]);

  const accion = async (clave: string, hacer: () => Promise<unknown>, exito: string) => {
    setHaciendo(clave);
    try {
      await hacer();
      toast.success(exito);
      await leer();
      alCambiar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo. Intenta de nuevo.', accion: 'hacer el cambio' }));
    } finally {
      setHaciendo(null);
    }
  };

  const descargar = async () => {
    if (!doc) return;
    setHaciendo('descargar');
    try {
      const r = await firmasApi(donde).descargar(doc.id);
      window.open(r.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos abrir el PDF.', accion: 'abrir el PDF' }));
    } finally {
      setHaciendo(null);
    }
  };

  const cancelar = async () => {
    if (!doc) return;
    const ok = await confirmar({
      tipo: 'destructivo',
      titulo: '¿Cancelamos este documento?',
      descripcion:
        doc.firmaron === 0
          ? 'Los enlaces dejan de servir. Como nadie ha firmado, la firma vuelve a tu bolsa.'
          : 'Los enlaces dejan de servir. Ya firmó alguien, así que la firma no se devuelve.',
      accion: 'Cancelar el documento',
    });
    if (ok) await accion('cancelar', () => firmasApi(donde).cancelar(doc.id), 'Documento cancelado');
  };

  /** Un borrador (o uno que quedó esperando el pago) sale con la bolsa, a la factura o pagándolo ahora. */
  const enviarBorrador = async () => {
    if (!doc) return;
    const como: ComoPaga = (pago?.bolsa ?? 0) > 0 ? 'BOLSA' : pago?.factura ? 'FACTURA' : 'PAGO_UNICO';
    setHaciendo('enviar');
    try {
      const r = await firmasApi(donde).enviar(doc.id, como);
      if (r.paymentUrl) {
        window.location.assign(r.paymentUrl);
        return;
      }
      toast.success('Listo: a cada persona le llegó su enlace para firmar.');
      await leer();
      alCambiar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos enviarlo. Intenta de nuevo.', accion: 'enviar el documento' }));
    } finally {
      setHaciendo(null);
    }
  };
  const comoSaleElBorrador = (pago?.bolsa ?? 0) > 0 ? 'Enviar con una de tus firmas' : pago?.factura ? 'Enviar a mi factura' : 'Pagar y enviar';

  const estado = doc ? ESTADO_DEL_DOCUMENTO[doc.estado] : null;
  const enlaceDe = (firmanteId: string) => doc?.enlaces.find((e) => e.firmanteId === firmanteId) ?? null;

  return (
    <Cajon abierto={Boolean(id)} onOpenChange={(v) => !v && alCerrar()} tamano="md" data-testid="detalle-de-firma">
      <CajonCabecera titulo={doc?.titulo ?? 'Documento'} descripcion={doc ? `Enviado ${doc.enviadoAt ? fechaYHora(doc.enviadoAt) : '—'} · ${doc.paginas} ${doc.paginas === 1 ? 'página' : 'páginas'}` : undefined}>
        {doc && estado ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone={estado.tono}>{estado.texto}</StatusBadge>
            <span className="text-[13px] text-fg-muted">
              {doc.firmaron} de {doc.total} {doc.total === 1 ? 'firma' : 'firmas'}
            </span>
            {doc.formaDePago ? <span className="text-[13px] text-fg-subtle">· {FORMA_DE_PAGO[doc.formaDePago]}</span> : null}
          </div>
        ) : null}
      </CajonCabecera>
      <CajonCuerpo className="space-y-5">
        {error ? <FalloDeCarga error={error} onReintentar={leer} queEs="el documento" /> : null}
        {doc ? (
          <>
            {doc.mensaje ? <p className="rounded-xl bg-surface-muted px-4 py-3 text-body-sm text-fg-muted">«{doc.mensaje}»</p> : null}
            <ul className="space-y-2" data-testid="firmantes-del-detalle">
              {doc.firmantes.map((f, i) => {
                const enlace = enlaceDe(f.id);
                return (
                  <li key={f.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORES_DE_FIRMANTE[i % COLORES_DE_FIRMANTE.length] }} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-fg">{f.nombre}</p>
                        <p className="truncate text-[13px] text-fg-muted">{[f.email, f.telefono].filter(Boolean).join(' · ')}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[13px]">
                          {f.firmado ? (
                            <>
                              <CheckCircle size={15} weight="fill" className="text-success" aria-hidden="true" />
                              <span className="text-fg">Firmó {f.firmadoAt ? fechaYHora(f.firmadoAt) : ''}</span>
                            </>
                          ) : doc.estado === 'ENVIADO' ? (
                            <>
                              <Clock size={15} className="text-warning" aria-hidden="true" />
                              <span className="text-fg-muted">
                                Falta su firma
                                {f.invitacion === 'FALLO' ? ' · el correo no salió' : f.invitacion === 'SIN_CORREO' ? ' · sin correo: mándale el enlace por WhatsApp' : ''}
                              </span>
                            </>
                          ) : (
                            <span className="text-fg-subtle">No firmó</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {!f.firmado && doc.estado === 'ENVIADO' && enlace ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-5">
                        {enlace.tieneCelular ? (
                          <Button size="sm" variant="secondary" hideArrow asChild>
                            <a href={enlace.whatsapp} target="_blank" rel="noopener noreferrer" data-testid={`whatsapp-${i + 1}`}>
                              <WhatsappLogo className="h-4 w-4" weight="fill" /> Por WhatsApp
                            </a>
                          </Button>
                        ) : null}
                        {f.email ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            hideArrow
                            isLoading={haciendo === `reenviar-${f.id}`}
                            disabled={haciendo !== null}
                            onClick={() => void accion(`reenviar-${f.id}`, () => firmasApi(donde).reenviar(doc.id, f.id), `Le volvimos a mandar el correo a ${f.nombre}`)}
                            data-testid={`reenviar-${i + 1}`}
                          >
                            <EnvelopeSimple className="h-4 w-4" /> Reenviar correo
                          </Button>
                        ) : null}
                        <CopyButton text={enlace.enlace} label="Copiar enlace" copiedLabel="Copiado" size="sm" variant="ghost" />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {doc.estado === 'POR_PAGAR' ? (
              <p className="rounded-xl bg-warning-soft px-4 py-3 text-body-sm text-fg">Estamos esperando que se apruebe el pago. Apenas Wompi lo confirme, sale a firmar.</p>
            ) : null}
            {doc.estado === 'BORRADOR' ? (
              <p className="rounded-xl bg-surface-muted px-4 py-3 text-body-sm text-fg-muted">Quedó guardado sin enviar. Envíalo con el botón de abajo.</p>
            ) : null}
            {doc.estado === 'FIRMADO' ? (
              <p className="rounded-xl bg-success-soft px-4 py-3 text-body-sm text-fg">
                Firmaron todos. El PDF lleva las firmas y, al final, la hoja de firmas con la evidencia de cada una.
              </p>
            ) : null}
            {doc.estado === 'CANCELADO' ? (
              <p className="rounded-xl bg-surface-muted px-4 py-3 text-body-sm text-fg-muted">
                Cancelado{doc.canceladoAt ? ` ${fechaYHora(doc.canceladoAt)}` : ''}. {doc.devuelto ? 'La firma volvió a tu bolsa.' : ''}
              </p>
            ) : null}
          </>
        ) : null}
      </CajonCuerpo>
      <CajonPie
        izquierda={
          doc && (doc.estado === 'ENVIADO' || doc.estado === 'BORRADOR' || doc.estado === 'POR_PAGAR') ? (
            <Button variant="ghost" hideArrow isLoading={haciendo === 'cancelar'} disabled={haciendo !== null} onClick={() => void cancelar()} data-testid="cancelar-documento">
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
          ) : undefined
        }
      >
        {doc && (doc.estado === 'BORRADOR' || doc.estado === 'POR_PAGAR') ? (
          <Button hideArrow isLoading={haciendo === 'enviar'} disabled={haciendo !== null} onClick={() => void enviarBorrador()} data-testid="enviar-borrador">
            {comoSaleElBorrador}
          </Button>
        ) : null}
        <Button hideArrow variant={doc?.estado === 'FIRMADO' ? 'default' : 'secondary'} isLoading={haciendo === 'descargar'} disabled={!doc || haciendo !== null} onClick={() => void descargar()} data-testid="descargar-documento">
          <DownloadSimple className="h-4 w-4" /> {doc?.estado === 'FIRMADO' ? 'Descargar firmado' : 'Ver el documento'}
        </Button>
      </CajonPie>
    </Cajon>
  );
}
