'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatCircleDots } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { toast } from '@/components/ui/toast';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { recargasDePreguntasApi, type VistaDeLasRecargas } from '@/lib/api/recargas-de-preguntas.service';
import { precioDelMes } from '@/lib/conversion/acceso';
import { cn } from '@/lib/utils';

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' });
const numero = (n: number) => n.toLocaleString('es-CO');
const SONDEO_MS = 5_000;
const SONDEO_TOPE_MS = 10 * 60_000;
/** La que se destaca: la de 200, para el equipo que pregunta todos los días. */
const DESTACADA = 200;

/**
 * Preguntas al chat (MODELO-DE-NEGOCIO.md §3.2–3.4; Nico, 27-10-2026). El plan trae 50 al mes para toda la
 * inmobiliaria; la cuenta gratis, 5 de una vez (30-10-2026). Lo demás se compra en recargas (50, 200 o 500, + IVA,
 * duran 12 meses). Comprar abre Wompi en otra pestaña y esta sección espera la confirmación sola. Comprar: quien paga
 * el plan. Los botones van en arena: el voltaje de la pantalla es «Pagar y abrir todo».
 */
export function RecargasDePreguntas() {
  const permisos = usePermissionsContextSafe();
  const puedeComprar = Boolean(permisos?.isAdmin || permisos?.canAccess('subscription', 'edit'));
  const raiz = useRef<HTMLElement>(null);
  const [vista, setVista] = useState<VistaDeLasRecargas | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [comprando, setComprando] = useState<number | null>(null);
  const [esperando, setEsperando] = useState<string | null>(null);
  // La cuenta gratis: 5 de una vez (el back lo dice; un back anterior no trae `bolsa`).
  const gratis = vista?.bolsa?.periodo === 'siempre';

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const v = await recargasDePreguntasApi.ver();
      setVista(v);
      return v;
    } catch (e) {
      setError(e);
      return null;
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Desde el chat o el aviso («Recargar»), la sección se trae a la vista.
  const hayVista = vista !== null;
  useEffect(() => {
    if (!hayVista) return;
    const seccion = new URLSearchParams(window.location.search).get('seccion');
    if (seccion === 'preguntas') raiz.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hayVista]);

  useEffect(() => {
    if (!esperando) return;
    const inicio = Date.now();
    const t = window.setInterval(async () => {
      const v = await cargar();
      const pagada = v?.compras.find((c) => c.id === esperando)?.estado === 'PAGADO';
      if (pagada || Date.now() - inicio > SONDEO_TOPE_MS) {
        window.clearInterval(t);
        setEsperando(null);
        if (pagada) toast.success('Listo: tu equipo ya puede seguir preguntando');
      }
    }, SONDEO_MS);
    return () => window.clearInterval(t);
  }, [esperando, cargar]);

  const comprar = async (preguntas: number) => {
    // La pestaña se abre YA (el navegador bloquea un window.open después de un await).
    const pestana = window.open('', '_blank');
    setComprando(preguntas);
    try {
      const r = await recargasDePreguntasApi.comprar(preguntas);
      if (pestana) pestana.location.href = r.paymentUrl;
      else window.location.assign(r.paymentUrl);
      setEsperando(r.recargaId);
    } catch (e) {
      pestana?.close();
      toast.error('No pudimos abrir el pago', { description: mensajeParaLaPersona(e, { accion: 'comprar la recarga' }) });
    } finally {
      setComprando(null);
    }
  };

  return (
    <section ref={raiz} id="preguntas" className="scroll-mt-6 rounded-lg border border-border bg-surface p-6 sm:p-8" data-testid="recargas-de-preguntas">
      <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
        <ChatCircleDots size={14} weight="bold" aria-hidden="true" />
        Preguntas del chat
      </p>
      <h2 className="mt-3 text-h3 text-fg">
        {!vista
          ? 'Preguntas al chat'
          : gratis
            ? `${numero(vista.bolsa!.incluidas)} preguntas gratis, una sola vez`
            : `${numero(vista.incluidasAlMes)} preguntas al mes incluidas`}
        {vista && vista.vigentes > 0 ? ` + ${numero(vista.vigentes)} de tus recargas` : ''}
      </h2>
      <p className="mt-1 max-w-[62ch] text-sm text-fg-muted">
        {gratis
          ? `Tu cuenta gratis trae ${numero(vista!.bolsa!.incluidas)} preguntas al chat para probarlo, y no se reinician. Cuando se acaben, recarga aquí o abre todo Leasefy, que trae ${numero(vista!.incluidasAlMes)} cada mes.`
          : 'Son para todo tu equipo y se reinician cada mes. Si usan el chat todos los días, recarga: entre más grande la recarga, más barata cada pregunta.'}{' '}
        Los agentes, el piloto y aprobar lo que el chat propone no gastan preguntas.
        {vista?.venceLaPrimera ? ` Tu primera recarga vence el ${fecha.format(new Date(vista.venceLaPrimera))}.` : ''}
      </p>

      {error ? (
        <div className="mt-4">
          <FalloDeCarga error={error} queEs="tus recargas de preguntas" onReintentar={cargar} />
        </div>
      ) : !vista ? (
        <div className="mt-5 h-40 animate-pulse rounded-lg bg-surface-muted" aria-busy="true" />
      ) : (
        <>
          {!vista.disponible && (
            <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
              La compra de recargas se está terminando de activar. Escríbenos y te ayudamos mientras tanto.
            </p>
          )}
          {esperando && (
            <p className="mt-4 rounded-md bg-primary-soft px-3 py-2 text-sm text-fg" data-testid="esperando-la-recarga">
              Esperando la confirmación de Wompi. Termina el pago en la otra pestaña; aquí se actualiza solo.
            </p>
          )}
          <Stagger className="mt-5 grid gap-3 sm:grid-cols-3">
            {vista.aLaVenta.map((r) => {
              const destacada = r.preguntas === DESTACADA;
              return (
                <StaggerItem
                  key={r.preguntas}
                  className={cn('relative flex flex-col rounded-lg border bg-surface p-5', destacada ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border')}
                  data-testid={`recarga-${r.preguntas}`}
                >
                  {destacada && (
                    <span className="absolute -top-2.5 left-5 inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-primary">
                      Para el uso diario
                    </span>
                  )}
                  <p className="text-[22px] font-[420] tracking-[-0.02em] text-fg tabular-nums">{numero(r.preguntas)} preguntas</p>
                  <p className="mt-1 text-[15px] font-medium text-fg tabular-nums">
                    {precioDelMes(r.precio)} <span className="text-sm font-normal text-fg-muted">+ IVA</span>
                  </p>
                  <p className="mt-1 text-sm text-fg-muted tabular-nums">{precioDelMes(r.porPregunta)} cada una · duran 12 meses</p>
                  <div className="mt-5 flex-1" />
                  {puedeComprar ? (
                    <Button
                      variant="secondary"
                      className="h-10 rounded-full"
                      onClick={() => void comprar(r.preguntas)}
                      isLoading={comprando === r.preguntas}
                      disabled={!vista.disponible || comprando !== null || esperando !== null}
                      data-testid={`comprar-recarga-${r.preguntas}`}
                    >
                      Recargar
                    </Button>
                  ) : (
                    <p className="text-caption text-fg-subtle">La compra el administrador.</p>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        </>
      )}
    </section>
  );
}
