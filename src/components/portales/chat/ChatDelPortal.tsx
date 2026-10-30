'use client';

/**
 * Ori dentro del portal del inquilino y del propietario (29-10-2026).
 *
 * El trabajo de la persona: «preguntar lo de MI arriendo y dejarlo hecho sin
 * buscar la pantalla» — cuánto debo, radicar un daño, ver qué me respondieron,
 * sacar el certificado, cuándo me giran. Recorrido: abre Ori (botón abajo a la
 * derecha, en cualquier pantalla del portal) → escribe o toca una sugerencia →
 * lee la respuesta o la tarjeta → «Sí, hazlo» → el resultado queda en el hilo.
 *
 * No es el chat del panel (no ve nada de la inmobiliaria) ni usa modelo: el
 * micro reconoce el pedido con reglas (`lib/portales/chat-del-portal.ts`).
 * Todo pasa DENTRO del cajón: ningún botón navega (DESIGN.md §13.6).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp } from '@phosphor-icons/react';
import { Button } from '@leasefy/cadence';

import { ChatOrb } from '@/components/beta/ChatOrb';
import { MarkdownRenderer } from '@/components/beta/MarkdownRenderer';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  SUGERENCIAS_DEL_PORTAL,
  hacerEnElChatDelPortal,
  preguntarAlChatDelPortal,
  type PortalDelChat,
  type TarjetaDelChatDelPortal as Tarjeta,
} from '@/lib/portales/chat-del-portal';
import { abrirElPagoEnLinea } from '@/lib/portales/pago-desde-el-chat';
import { FotoDelDano } from './FotoDelDano';
import { TarjetaDelChatDelPortal, type EstadoDeLaTarjetaDelPortal } from './TarjetaDelChatDelPortal';

export type TurnoDelPortal =
  | { id: string; de: 'persona'; texto: string }
  | {
      id: string;
      de: 'ori';
      texto: string;
      tarjeta: Tarjeta | null;
      estado: EstadoDeLaTarjetaDelPortal;
      resultado: string | null;
      error?: boolean;
      /** La solicitud que quedó radicada: para agregarle la foto del daño. */
      pqrsId?: string;
    };

/** Abre la pasarela (aparte para poder probarlo sin salir de la página). */
export const navegacionDelPago = { irA: (url: string) => window.location.assign(url) };
const irA = (url: string) => navegacionDelPago.irA(url);

let siguiente = 0;
const nuevoId = () => `t-${Date.now().toString(36)}-${(siguiente++).toString(36)}`;

const ANIMACION = 'animate-in fade-in slide-in-from-bottom-1 duration-slow motion-reduce:animate-none';

/** El hilo y lo que se hace en él: separado de la vista para probarlo sin el cajón. */
export function useChatDelPortal(portal: PortalDelChat) {
  const [turnos, setTurnos] = useState<TurnoDelPortal[]>([]);
  const [pensando, setPensando] = useState(false);

  const cambiar = useCallback((id: string, cambio: Partial<Extract<TurnoDelPortal, { de: 'ori' }>>) => {
    setTurnos((ts) => ts.map((t) => (t.id === id && t.de === 'ori' ? { ...t, ...cambio } : t)));
  }, []);

  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      if (!limpio || pensando) return;
      setTurnos((ts) => [...ts, { id: nuevoId(), de: 'persona', texto: limpio }]);
      setPensando(true);
      const r = await preguntarAlChatDelPortal(limpio, portal);
      setPensando(false);
      setTurnos((ts) => [
        ...ts,
        r.ok
          ? { id: nuevoId(), de: 'ori', texto: r.respuesta.texto, tarjeta: r.respuesta.tarjeta, estado: 'pendiente', resultado: null }
          : { id: nuevoId(), de: 'ori', texto: r.texto, tarjeta: null, estado: 'pendiente', resultado: null, error: true },
      ]);
    },
    [portal, pensando],
  );

  const decirQueSi = useCallback(
    async (id: string, tarjeta: Tarjeta) => {
      cambiar(id, { estado: 'haciendo' });
      if (tarjeta.accion === 'pagar_en_linea') {
        // El pago se hace en la pasarela (PSE, tarjeta o Nequi): es la única salida del chat.
        const pago = await abrirElPagoEnLinea(tarjeta.datos, window.location.origin);
        if (pago.ok) {
          cambiar(id, { resultado: 'Te llevo a la pasarela para pagar…' });
          irA(pago.url);
        } else cambiar(id, { estado: 'fallida', resultado: pago.texto });
        return;
      }
      const r = await hacerEnElChatDelPortal(tarjeta);
      cambiar(id, { estado: r.hecho ? 'hecha' : 'fallida', resultado: r.texto, pqrsId: r.pqrsId });
    },
    [cambiar],
  );

  const decirQueNo = useCallback(
    (id: string) => cambiar(id, { estado: 'cancelada', resultado: null }),
    [cambiar],
  );

  return { turnos, pensando, enviar, decirQueSi, decirQueNo };
}

export function ChatDelPortal({ portal }: { portal: PortalDelChat }) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState('');
  const { turnos, pensando, enviar, decirQueSi, decirQueNo } = useChatDelPortal(portal);
  const ultimoDeLaPersona = useRef<HTMLDivElement | null>(null);
  const cuantos = turnos.length;

  // La pregunta nueva sube a la vista; la respuesta crece debajo (no salta al final).
  useEffect(() => {
    ultimoDeLaPersona.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [cuantos]);

  const mandar = (texto: string) => {
    if (!texto.trim() || pensando) return;
    setBorrador('');
    void enviar(texto);
  };

  const ultimaPersona = [...turnos].reverse().find((t) => t.de === 'persona')?.id;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Pregúntale a Ori"
        data-testid="abrir-chat-del-portal"
        className={cn(
          'fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-2 pr-4 text-ink-fg shadow-flotante',
          'transition-transform duration-fast ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'motion-reduce:transition-none lg:bottom-6 lg:right-6',
          abierto && 'pointer-events-none opacity-0',
        )}
      >
        <ChatOrb size={28} state="idle" />
        <span className="font-body text-body-sm">Pregúntale a Ori</span>
      </button>

      <Cajon abierto={abierto} onOpenChange={setAbierto} tamano="md" data-testid="chat-del-portal">
        <CajonCabecera
          titulo="Ori"
          descripcion="Te respondo con lo de tu arriendo y lo dejo hecho con tu sí. No veo datos de otras personas."
        />
        <CajonCuerpo className="flex flex-col gap-5">
          {cuantos === 0 && (
            <div className={cn('flex flex-col gap-4', ANIMACION)}>
              <div className="flex items-center gap-3">
                <ChatOrb size={36} state="idle" />
                <p className="font-body text-body text-fg">¿En qué te ayudo?</p>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Puedes pedirme</span>
              <div className="flex flex-wrap gap-2">
                {SUGERENCIAS_DEL_PORTAL[portal].map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => mandar(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {turnos.map((t) =>
            t.de === 'persona' ? (
              <div
                key={t.id}
                ref={t.id === ultimaPersona ? ultimoDeLaPersona : undefined}
                className={cn('flex justify-end', ANIMACION)}
              >
                <p className="max-w-[85%] whitespace-pre-wrap rounded-[18px] bg-surface-muted px-4 py-2.5 font-body text-[15px] leading-relaxed text-fg">
                  {t.texto}
                </p>
              </div>
            ) : (
              <div key={t.id} className={cn('flex flex-col gap-3', ANIMACION)} data-testid="respuesta-de-ori">
                <div
                  role={t.error ? 'alert' : undefined}
                  className={cn('chat-lectura text-[15px] leading-[1.65]', t.error ? 'text-danger' : 'text-fg')}
                >
                  <MarkdownRenderer content={t.texto} />
                </div>
                {t.tarjeta && (
                  <TarjetaDelChatDelPortal
                    tarjeta={t.tarjeta}
                    estado={t.estado}
                    resultado={t.resultado}
                    onSi={() => void decirQueSi(t.id, t.tarjeta as Tarjeta)}
                    onAhoraNo={() => decirQueNo(t.id)}
                  >
                    {t.estado === 'hecha' && t.tarjeta.accion === 'radicar_pqrs' && t.pqrsId && (
                      <FotoDelDano pqrsId={t.pqrsId} />
                    )}
                  </TarjetaDelChatDelPortal>
                )}
              </div>
            ),
          )}

          {pensando && (
            <div className="flex items-center gap-2.5 text-fg-muted" role="status">
              <ChatOrb size={22} state="thinking" />
              <span className="font-body text-body-sm">Revisando lo tuyo…</span>
            </div>
          )}
        </CajonCuerpo>
        <CajonPie>
          <form
            className="flex w-full items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              mandar(borrador);
            }}
          >
            <Textarea
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  mandar(borrador);
                }
              }}
              rows={1}
              maxLength={2000}
              aria-label="Escríbele a Ori"
              placeholder="Escríbeme qué necesitas"
              className="min-h-[44px] flex-1 resize-none"
            />
            <Button
              type="submit"
              variant="outline"
              size="md"
              aria-label="Enviar"
              disabled={!borrador.trim() || pensando}
              className="size-11 shrink-0 p-0"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </Button>
          </form>
        </CajonPie>
      </Cajon>
    </>
  );
}
