'use client';

/**
 * Las terminaciones que la inmobiliaria le pide decidir al PROPIETARIO
 * (reunión con Portofino, 22-10-2026). Nico: «que le aparezca al propietario
 * para que decida, sí o no, con el motivo». Sí → el contrato se termina con la
 * fecha pedida. No → con su motivo; el contrato sigue igual. Sin ninguna, no
 * se pinta nada.
 */
import { useCallback, useEffect, useState } from 'react';
import { CalendarX, CheckCircle, XCircle } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { cicloDeVidaApi, type TerminacionEnElPortal } from '@/lib/api/ciclo-de-vida.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaLegible } from '@/lib/mandato/textos';
import { formatCurrency } from '@/lib/types/inmobiliaria';

function UnaTerminacion({ t, onCambio }: { t: TerminacionEnElPortal; onCambio: () => void }) {
  const [diciendoQueNo, setDiciendoQueNo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const responder = async (acepta: boolean) => {
    if (enviando) return;
    setEnviando(true);
    try {
      await cicloDeVidaApi.responderTerminacion(t.id, acepta, acepta ? undefined : motivo.trim());
      toast.success(acepta ? 'Listo: el arriendo queda terminado en esa fecha' : 'Le contamos a tu inmobiliaria que no', {
        description: acepta ? 'Tu inmobiliaria ya lo sabe.' : 'El contrato sigue igual.',
      });
      onCambio();
    } catch (e) {
      toast.error('No pudimos guardar tu respuesta', { description: mensajeParaLaPersona(e, { accion: 'responder la terminación' }) });
      setEnviando(false);
    }
  };

  const pendiente = t.estado === 'PENDIENTE';
  return (
    <Card className="space-y-3 p-5" data-testid={`terminacion-${t.estado.toLowerCase()}`}>
      <div className="space-y-1">
        <p className="text-xs text-fg-muted">
          {t.inmobiliaria} · {t.inmueble}
          {t.contrato ? ` · contrato ${t.contrato}` : ''}
        </p>
        <h3 className="text-base font-semibold text-fg">
          Terminar el arriendo el {diaLegible(t.terminadoEn)}
        </h3>
        <p className="text-sm text-fg-muted">
          Motivo: {t.nombreDelMotivo}
          {t.inquilino ? ` · inquilino ${t.inquilino}` : ''}
          {t.penalidadDicha && t.penalidadCop ? ` · penalidad ${formatCurrency(t.penalidadCop)}` : ''}
        </p>
        {t.nota ? <p className="text-sm text-fg">«{t.nota}»</p> : null}
      </div>
      {pendiente ? (
        <>
          <Presence show={diciendoQueNo} direction="down">
            <label htmlFor={`motivo-${t.id}`} className="text-sm font-medium text-fg">
              ¿Por qué no? <span className="font-normal text-fg-muted">(tu inmobiliaria lo verá)</span>
            </label>
            <textarea
              id={`motivo-${t.id}`}
              className="mt-1.5 w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
              rows={2}
              maxLength={1000}
              placeholder="Ej.: Prefiero que se cumpla el contrato hasta el final."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              data-testid="terminacion-motivo-del-no"
            />
          </Presence>
          <div className="flex flex-wrap gap-2">
            {diciendoQueNo ? (
              <>
                <Button hideArrow variant="destructive" disabled={enviando || !motivo.trim()} onClick={() => void responder(false)} data-testid="terminacion-confirmar-no">
                  <XCircle className="h-4 w-4" />
                  {enviando ? 'Enviando…' : 'Confirmar: no'}
                </Button>
                <Button hideArrow variant="outline" disabled={enviando} onClick={() => setDiciendoQueNo(false)}>
                  Volver
                </Button>
              </>
            ) : (
              <>
                <Button hideArrow disabled={enviando} onClick={() => void responder(true)} data-testid="terminacion-si">
                  <CheckCircle className="h-4 w-4" />
                  {enviando ? 'Enviando…' : 'Sí, terminar'}
                </Button>
                <Button hideArrow variant="outline" disabled={enviando} onClick={() => setDiciendoQueNo(true)} data-testid="terminacion-no">
                  No
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-fg-muted">
          {t.estado === 'APROBADA' ? 'Dijiste que sí: el arriendo quedó terminado.' : `Dijiste que no: «${t.motivoDeLaRespuesta ?? ''}».`}
        </p>
      )}
    </Card>
  );
}

export function TerminacionesPorDecidir() {
  const [lista, setLista] = useState<TerminacionEnElPortal[]>([]);
  const cargar = useCallback(() => {
    cicloDeVidaApi
      .terminacionesDelPortal()
      .then((l) => setLista(Array.isArray(l) ? l : []))
      .catch(() => setLista([]));
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);
  if (lista.length === 0) return null;
  const pendientes = lista.filter((t) => t.estado === 'PENDIENTE');
  return (
    <section className="space-y-3" aria-label="Terminaciones por decidir" data-testid="terminaciones-por-decidir">
      <div className="space-y-0.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <CalendarX className="h-4 w-4" aria-hidden="true" />
          {pendientes.length > 0 ? 'Terminaciones por decidir' : 'Terminaciones que decidiste'}
        </h2>
        <p className="text-xs text-fg-muted">Tu inmobiliaria te pide decidir si el arriendo se termina antes de tiempo.</p>
      </div>
      {lista.map((t) => (
        <UnaTerminacion key={t.id} t={t} onCambio={cargar} />
      ))}
    </section>
  );
}
