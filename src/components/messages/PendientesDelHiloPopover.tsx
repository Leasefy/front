'use client';

/**
 * Lo que esta persona tiene pendiente, para mandárselo desde el hilo.
 *
 * Nico: «también conectado el enviar cosas que tenga pendiente el inquilino o
 * propietario, ejemplo algún cobro, algún documento etc... algún pago».
 *
 * Es lo que el back devuelve junto (`GET /conversations/:id/pendientes`): las
 * cuotas que debe de sus contratos, lo que se le debe girar como propietario y
 * los documentos que se le pueden mandar. Elegir una **arma el mensaje y lo
 * deja en el campo** — igual que las plantillas, no se manda nada solo.
 *
 * ── 🔴 La plata sale de las CUOTAS, no de los cobros (2026-09-16) ────────────
 *
 * La deuda nace con el contrato; el cobro es el documento con que se reclama y
 * puede no existir. Hasta ese día esto listaba «cobros sin pagar» y, sin
 * cobros, decía «Esta persona no tiene cobros, giros ni documentos
 * pendientes» —a alguien que debía $3 millones en la inmobiliaria migrada, que
 * tiene cero cobros—. Ahora lista sus cuotas con el cajón de Pagos y Cartera
 * (por vencer · vencida, en plazo · cartera) y dice los totales, que no se
 * cortan con la lista.
 *
 * ── Tres cosas que la pantalla distingue a propósito ────────────────────────
 *
 * · **Vacío ≠ no pudimos preguntar.** «No debe nada ni se le debe nada» es una
 *   noticia buena y concreta; un 404 de una ruta que todavía se está
 *   construyendo no dice nada sobre la deuda de nadie. Se muestran distinto.
 * · **Un back anterior al cambio** responde `{ cobros, dispersiones }` sin
 *   `cuotas` ni `totales`. Eso NO se lee como «no debe nada»: se lee como que
 *   todavía no podemos consultar lo que debe.
 * · **En un hilo que no es directo todo viene vacío y en cero** y eso es
 *   correcto: preguntar «qué le debe esta persona» sobre la consulta de un
 *   aviso no tiene sentido. Se lee como el vacío honesto que es.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, FileText, ListChecks, Receipt, CurrencyCircleDollar } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { usePanelFlotante } from '@/components/messages/usePanelFlotante';
import { endpointNoDisponible } from '@/components/messages/endpoint-no-disponible';
import { messagesApi } from '@/lib/api/messages.service';
import type {
  CuotaPendienteDelHilo,
  PendientesDeLaConversacion,
} from '@/lib/api/messages.types';
import {
  formatearFecha,
  formatearPesos,
  mensajeDeCuota,
  mensajeDeDocumento,
  mensajeDeGiro,
  mesEnPalabras,
} from '@/components/messages/pendientes-a-mensaje';

type Estado =
  | { fase: 'inicial' }
  | { fase: 'cargando' }
  | { fase: 'lista'; datos: PendientesDeLaConversacion }
  | { fase: 'noDisponible' }
  | { fase: 'error' };

/**
 * La respuesta, si tiene la forma de hoy. Un back anterior al 2026-09-16 manda
 * `{ cobros, dispersiones, documentos }`: sin `cuotas`, `giros` y `totales` no
 * se sabe qué debe la persona, y devolver listas vacías diría «no debe nada».
 * Por eso ahí se devuelve `null` y la pantalla dice que no puede consultar.
 */
export function normalizarPendientes(datos: unknown): PendientesDeLaConversacion | null {
  const d = datos as Partial<PendientesDeLaConversacion> | null | undefined;
  if (!d || !Array.isArray(d.cuotas) || !Array.isArray(d.giros) || !d.totales) return null;
  return {
    cuotas: d.cuotas,
    giros: d.giros,
    documentos: Array.isArray(d.documentos) ? d.documentos : [],
    totales: d.totales,
  };
}

/** El detalle de una cuota, con el verbo y la mora que corresponden a su cajón. */
export function detalleDeCuota(cuota: CuotaPendienteDelHilo, es: boolean): string {
  const fecha = formatearFecha(cuota.vencimiento);
  if (cuota.cajon === 'CARTERA') {
    const dias = cuota.diasDeMora;
    return es
      ? `Venció el ${fecha} · en cartera, ${dias} ${dias === 1 ? 'día' : 'días'} de mora`
      : `Due ${fecha} · in collections, ${dias} ${dias === 1 ? 'day' : 'days'} late`;
  }
  if (cuota.cajon === 'VENCIDA_EN_PLAZO') {
    // Vencido no es mora: el plazo del contrato sigue corriendo.
    return es ? `Venció el ${fecha} · dentro del plazo` : `Due ${fecha} · within grace period`;
  }
  return es ? `Vence el ${fecha}` : `Due ${fecha}`;
}

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
      const normalizados = normalizarPendientes(await messagesApi.getPendientes(conversationId));
      setEstado(normalizados ? { fase: 'lista', datos: normalizados } : { fase: 'noDisponible' });
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

  /*
   * Sin plata en ningún sentido. Se mira en los TOTALES, no sólo en las
   * listas: una lista se corta y los totales no, así que «no debe nada» sólo se
   * afirma cuando la suma de todo lo que falta es cero.
   */
  const sinPlata =
    estado.fase === 'lista' &&
    estado.datos.totales.debeCop === 0 &&
    estado.datos.totales.porGirarCop === 0 &&
    estado.datos.cuotas.length === 0 &&
    estado.datos.giros.length === 0;
  const vacio = sinPlata && estado.fase === 'lista' && estado.datos.documentos.length === 0;

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
                ? 'No debe nada ni se le debe nada, y no hay documentos para mandarle.'
                : 'They owe nothing, we owe them nothing, and there are no documents to send.'}
            </p>
          )}

          {estado.fase === 'lista' && !vacio && (
            <div className="space-y-3">
              {/* Los totales van primero y sin cortar: la lista de abajo se
                  recorta, y sin la suma se lee que debe menos. */}
              {sinPlata ? (
                <p className="text-xs text-fg-muted" data-testid="pendientes-sin-plata">
                  {es ? 'No debe nada ni se le debe nada.' : 'They owe nothing and we owe them nothing.'}
                </p>
              ) : (
                <div className="space-y-0.5 text-xs text-fg-muted" data-testid="pendientes-totales">
                  {estado.datos.totales.debeCop > 0 && (
                    <p>
                      {es
                        ? `Debe ${formatearPesos(estado.datos.totales.debeCop)} en total`
                        : `Owes ${formatearPesos(estado.datos.totales.debeCop)} in total`}
                      {estado.datos.totales.vencidoCop > 0 &&
                        (es
                          ? ` · ${formatearPesos(estado.datos.totales.vencidoCop)} vencido`
                          : ` · ${formatearPesos(estado.datos.totales.vencidoCop)} overdue`)}
                      {estado.datos.totales.enCarteraCop > 0 &&
                        (es
                          ? ` · ${formatearPesos(estado.datos.totales.enCarteraCop)} en cartera`
                          : ` · ${formatearPesos(estado.datos.totales.enCarteraCop)} in collections`)}
                    </p>
                  )}
                  {estado.datos.totales.porGirarCop > 0 && (
                    <p>
                      {es
                        ? `Le debemos ${formatearPesos(estado.datos.totales.porGirarCop)} en giros`
                        : `We owe them ${formatearPesos(estado.datos.totales.porGirarCop)} in payouts`}
                    </p>
                  )}
                </div>
              )}

              {estado.datos.cuotas.length > 0 && (
                <Grupo titulo={es ? 'Lo que debe' : 'What they owe'}>
                  {estado.datos.cuotas.map((cuota) => (
                    <Fila
                      key={cuota.id}
                      testid="pendiente-cuota"
                      icono={<Receipt className="h-4 w-4 text-fg-muted" aria-hidden="true" />}
                      titulo={`${mesEnPalabras(cuota.mes)} · ${formatearPesos(cuota.pendienteCop)}`}
                      detalle={detalleDeCuota(cuota, es)}
                      /* Sólo la cartera se marca, y en ámbar, no en rojo: es un
                         dato, no una acusación (Ley 2300 art. 7). Lo vencido
                         dentro del plazo no es mora. */
                      acentuado={cuota.cajon === 'CARTERA'}
                      onClick={() => elegir(mensajeDeCuota(cuota, nombre))}
                    />
                  ))}
                </Grupo>
              )}

              {estado.datos.giros.length > 0 && (
                <Grupo titulo={es ? 'Giros que le debemos' : 'Payouts we owe'}>
                  {estado.datos.giros.map((giro) => (
                    <Fila
                      key={giro.id}
                      testid="pendiente-giro"
                      icono={
                        <CurrencyCircleDollar className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                      }
                      titulo={`${mesEnPalabras(giro.mes)} · ${formatearPesos(giro.pendienteCop)}`}
                      detalle={
                        giro.inmueble ??
                        (es
                          ? `Cuota del ${formatearFecha(giro.vencimiento)}`
                          : `Installment of ${formatearFecha(giro.vencimiento)}`)
                      }
                      onClick={() => elegir(mensajeDeGiro(giro, nombre))}
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
