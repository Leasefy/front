'use client';

/**
 * Lo que esta persona tiene pendiente, para mandárselo desde el hilo.
 *
 * Nico: «también conectado el enviar cosas que tenga pendiente el inquilino o
 * propietario, ejemplo algún cobro, algún documento etc... algún pago».
 *
 * Son las tres cosas que el back devuelve juntas (`GET /conversations/:id/
 * pendientes`): sus cobros sin pagar, las dispersiones que se le deben y los
 * documentos de sus contratos. Elegir una **arma el mensaje y lo deja en el
 * campo** — igual que las plantillas, no se manda nada solo.
 *
 * ── Dos cosas que la pantalla distingue a propósito ─────────────────────────
 *
 * · **Vacío ≠ no pudimos preguntar.** «No tiene nada pendiente» es una noticia
 *   buena y concreta; un 404 de una ruta que todavía se está construyendo no
 *   dice nada sobre la deuda de nadie. Se muestran distinto.
 * · **En un hilo que no es directo las tres listas vienen vacías** y eso es
 *   correcto: preguntar «qué le debe esta persona» sobre la consulta de un
 *   aviso no tiene sentido. Se lee como el vacío honesto que es.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, FileText, ListChecks, Receipt, CurrencyCircleDollar } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { usePanelFlotante } from '@/components/messages/usePanelFlotante';
import { endpointNoDisponible } from '@/components/messages/endpoint-no-disponible';
import { messagesApi } from '@/lib/api/messages.service';
import type { PendientesDeLaConversacion } from '@/lib/api/messages.types';
import {
  formatearFecha,
  formatearPesos,
  mensajeDeCobro,
  mensajeDeDispersion,
  mensajeDeDocumento,
  mesEnPalabras,
} from '@/components/messages/pendientes-a-mensaje';

type Estado =
  | { fase: 'inicial' }
  | { fase: 'cargando' }
  | { fase: 'lista'; datos: PendientesDeLaConversacion }
  | { fase: 'noDisponible' }
  | { fase: 'error' };

interface Props {
  locale: string;
  conversationId: string;
  /** Cómo se llama el interlocutor: entra en la primera línea del mensaje. */
  nombre: string;
  /** El texto armado. El compositor lo inserta; nadie lo manda. */
  onElegir: (texto: string) => void;
  className?: string;
}

export function PendientesDelHiloPopover({
  locale,
  conversationId,
  nombre,
  onElegir,
  className,
}: Props) {
  const panel = usePanelFlotante<HTMLDivElement>();
  const [estado, setEstado] = useState<Estado>({ fase: 'inicial' });
  const es = locale === 'es';

  const traer = useCallback(async () => {
    setEstado({ fase: 'cargando' });
    try {
      const datos = await messagesApi.getPendientes(conversationId);
      setEstado({
        fase: 'lista',
        /* Las tres claves «viajan siempre», pero un back a medio construir
           puede mandar menos. Se normaliza acá para no reventar en el `.map`. */
        datos: {
          cobros: datos?.cobros ?? [],
          dispersiones: datos?.dispersiones ?? [],
          documentos: datos?.documentos ?? [],
        },
      });
    } catch (err) {
      setEstado({ fase: endpointNoDisponible(err) ? 'noDisponible' : 'error' });
    }
  }, [conversationId]);

  const abierto = panel.abierto;
  useEffect(() => {
    if (abierto) void traer();
  }, [abierto, traer]);

  const elegir = useCallback(
    (texto: string) => {
      onElegir(texto);
      panel.cerrar();
    },
    [onElegir, panel],
  );

  const vacio =
    estado.fase === 'lista' &&
    estado.datos.cobros.length === 0 &&
    estado.datos.dispersiones.length === 0 &&
    estado.datos.documentos.length === 0;

  return (
    <div ref={panel.ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={panel.alternar}
        aria-label={es ? 'Pendientes de esta persona' : "This person's pending items"}
        title={es ? 'Pendientes de esta persona' : "This person's pending items"}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        data-testid="abrir-pendientes"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          abierto
            ? 'bg-primary-soft text-primary'
            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        )}
      >
        <ListChecks className="h-5 w-5" aria-hidden="true" />
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label={es ? 'Pendientes' : 'Pending items'}
          data-testid="panel-pendientes"
          className="absolute bottom-full left-0 z-50 mb-2 max-h-80 w-80 overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <div className="mb-2">
            <p className="text-sm font-semibold text-fg">
              {es ? 'Pendientes' : 'Pending items'}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {es
                ? 'Se arma el mensaje y queda en el campo para que lo revises.'
                : 'The message is drafted into the field for you to review.'}
            </p>
          </div>

          {estado.fase === 'cargando' && (
            <p className="py-4 text-center text-sm text-fg-muted">
              {es ? 'Cargando…' : 'Loading…'}
            </p>
          )}

          {estado.fase === 'noDisponible' && (
            <p
              className="py-4 text-center text-sm text-fg-muted"
              data-testid="pendientes-no-disponible"
            >
              {es
                ? 'Todavía no podemos consultar los pendientes de esta conversación.'
                : "We can't look up this conversation's pending items yet."}
            </p>
          )}

          {estado.fase === 'error' && (
            <div className="py-4 text-center">
              <p className="text-sm text-fg-muted">
                {es
                  ? 'No pudimos consultar los pendientes.'
                  : "We couldn't look up the pending items."}
              </p>
              <button
                type="button"
                onClick={() => void traer()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary-soft"
              >
                <ArrowClockwise className="h-4 w-4" aria-hidden="true" />
                {es ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          )}

          {vacio && (
            <p className="py-4 text-center text-sm text-fg-muted" data-testid="pendientes-vacio">
              {es
                ? 'Esta persona no tiene cobros, giros ni documentos pendientes.'
                : 'This person has no pending charges, payouts or documents.'}
            </p>
          )}

          {estado.fase === 'lista' && !vacio && (
            <div className="space-y-3">
              {estado.datos.cobros.length > 0 && (
                <Grupo titulo={es ? 'Cobros sin pagar' : 'Unpaid charges'}>
                  {estado.datos.cobros.map((cobro) => (
                    <Fila
                      key={cobro.id}
                      testid="pendiente-cobro"
                      icono={<Receipt className="h-4 w-4 text-fg-muted" aria-hidden="true" />}
                      titulo={`${mesEnPalabras(cobro.mes)} · ${formatearPesos(cobro.pendienteCop)}`}
                      detalle={
                        cobro.diasDeMora > 0
                          ? es
                            ? `Venció el ${formatearFecha(cobro.vencimiento)} · ${cobro.diasDeMora} ${cobro.diasDeMora === 1 ? 'día' : 'días'} de mora`
                            : `Due ${formatearFecha(cobro.vencimiento)} · ${cobro.diasDeMora} days late`
                          : es
                            ? `Vence el ${formatearFecha(cobro.vencimiento)}`
                            : `Due ${formatearFecha(cobro.vencimiento)}`
                      }
                      /* La mora se marca en ámbar, no en rojo: es un dato, no
                         una acusación (Ley 2300 art. 7). */
                      acentuado={cobro.diasDeMora > 0}
                      onClick={() => elegir(mensajeDeCobro(cobro, nombre))}
                    />
                  ))}
                </Grupo>
              )}

              {estado.datos.dispersiones.length > 0 && (
                <Grupo titulo={es ? 'Giros que le debemos' : 'Payouts we owe'}>
                  {estado.datos.dispersiones.map((dispersion) => (
                    <Fila
                      key={dispersion.id}
                      testid="pendiente-dispersion"
                      icono={
                        <CurrencyCircleDollar className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                      }
                      titulo={`${mesEnPalabras(dispersion.mes)} · ${formatearPesos(dispersion.netoCop)}`}
                      detalle={dispersion.inmueble ?? dispersion.estado}
                      onClick={() => elegir(mensajeDeDispersion(dispersion, nombre))}
                    />
                  ))}
                </Grupo>
              )}

              {estado.datos.documentos.length > 0 && (
                <Grupo titulo={es ? 'Documentos' : 'Documents'}>
                  {estado.datos.documentos.map((documento) => (
                    <Fila
                      key={documento.id}
                      testid="pendiente-documento"
                      icono={<FileText className="h-4 w-4 text-fg-muted" aria-hidden="true" />}
                      titulo={documento.nombre}
                      detalle={documento.tipo.toLowerCase()}
                      onClick={() => elegir(mensajeDeDocumento(documento, nombre))}
                    />
                  ))}
                </Grupo>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-fg-muted">{titulo}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Fila({
  testid,
  icono,
  titulo,
  detalle,
  acentuado = false,
  onClick,
}: {
  testid: string;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  acentuado?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        data-testid={testid}
        className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="mt-0.5 flex-shrink-0">{icono}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{titulo}</span>
          <span
            className={cn(
              'mt-0.5 block truncate text-xs',
              acentuado ? 'text-warning' : 'text-fg-muted',
            )}
          >
            {detalle}
          </span>
        </span>
      </button>
    </li>
  );
}
