'use client';

/**
 * «Escribir con IA» en el compositor de Mensajes (Juan, Portofino, 15-10-2026:
 * «IA que escribe por uno»; Nico: «Tú, por fases»).
 *
 * Las mismas reglas que las plantillas (`PlantillasDeMensajePopover`):
 *
 * 1. 🔴 **NO manda nada.** El borrador va al campo y ahí queda, editable: la
 *    persona lo lee y decide.
 * 2. **Nada inventado.** El micro no pone montos, fechas ni cuentas que no
 *    estén en la conversación o en lo que se sabe; lo que falta vuelve como
 *    «[completar]» y aquí se avisa, igual que una variable sin resolver.
 * 3. Si ya hay algo escrito en el campo, se MEJORA eso (no se reemplaza por
 *    otra cosa).
 *
 * Qué decir es opcional: vacío = contestar el último mensaje.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MagicWand } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePanelFlotante } from '@/components/messages/usePanelFlotante';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { redactarMensaje, type PedidoDeRedaccion } from '@/lib/api/redactar-mensaje.service';

/** El hueco que deja el micro cuando falta un dato. */
export const HUECO_DEL_BORRADOR = '[completar]';

interface Props {
  locale: string;
  agencyId: string;
  /** El contexto del hilo, leído al pedir (no al montar): siempre el de ahora. */
  contexto: () => Omit<PedidoDeRedaccion, 'instruccion' | 'borrador'>;
  /** Lo que ya hay escrito en el campo: si hay algo, se mejora. */
  borradorActual: string;
  /**
   * El borrador listo: reemplaza el campo. `nota` es sólo para quien escribe
   * (qué faltó o qué no se hizo) y nunca se envía.
   */
  onEscrito: (texto: string, nota: string | null) => void;
  className?: string;
}

export function EscribirConIaPopover({ locale, agencyId, contexto, borradorActual, onEscrito, className }: Props) {
  const panel = usePanelFlotante<HTMLDivElement>();
  const [instruccion, setInstruccion] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const es = locale === 'es';
  const hayBorrador = borradorActual.trim().length > 0;

  const abierto = panel.abierto;
  useEffect(() => {
    if (!abierto) return;
    setError(null);
    window.setTimeout(() => campoRef.current?.focus(), 0);
  }, [abierto]);

  const escribir = useCallback(async () => {
    if (escribiendo) return;
    setEscribiendo(true);
    setError(null);
    try {
      const r = await redactarMensaje(agencyId, {
        ...contexto(),
        instruccion: instruccion.trim() || null,
        borrador: hayBorrador ? borradorActual : null,
      });
      onEscrito(r.texto, r.nota ?? null);
      setInstruccion('');
      panel.cerrar();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: 'escribir el borrador' }));
    } finally {
      setEscribiendo(false);
    }
  }, [agencyId, borradorActual, contexto, escribiendo, hayBorrador, instruccion, onEscrito, panel]);

  return (
    <div ref={panel.ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={panel.alternar}
        aria-label={es ? 'Escribir con IA' : 'Write with AI'}
        title={es ? 'Escribir con IA' : 'Write with AI'}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        data-testid="abrir-escribir-con-ia"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          abierto ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        )}
      >
        <MagicWand className="h-5 w-5" aria-hidden="true" />
      </button>

      <Presence show={abierto} distance="xs">
        <div
          role="dialog"
          aria-label={es ? 'Escribir con IA' : 'Write with AI'}
          data-testid="panel-escribir-con-ia"
          className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-fg">{es ? 'Escribir con IA' : 'Write with AI'}</p>
          <p className="mt-0.5 text-caption text-fg-muted">
            {hayBorrador
              ? es
                ? 'Mejora lo que ya escribiste. Queda en el campo para que lo revises: no se manda solo.'
                : 'It improves what you wrote. It stays in the field for you to review.'
              : es
                ? 'Lee la conversación y te deja un borrador en el campo. No se manda solo.'
                : 'It reads the conversation and leaves a draft in the field. Nothing is sent on its own.'}
          </p>
          <label htmlFor="instruccion-de-la-ia" className="mt-3 block text-caption font-medium text-fg">
            {es ? '¿Qué le quieres decir? (opcional)' : 'What do you want to say? (optional)'}
          </label>
          <textarea
            id="instruccion-de-la-ia"
            ref={campoRef}
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void escribir();
              }
            }}
            rows={2}
            placeholder={es ? 'Ej.: recuérdale el pago de octubre, con amabilidad' : 'E.g.: remind them of the October payment'}
            className="mt-1 w-full resize-none rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="instruccion-de-la-ia"
          />
          <Presence show={Boolean(error)} distance="xs" initial={false}>
            <p role="alert" className="mt-2 text-caption text-danger" data-testid="error-de-la-ia">
              {error}
            </p>
          </Presence>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              hideArrow
              onClick={() => void escribir()}
              isLoading={escribiendo}
              disabled={escribiendo}
              data-testid="escribir-con-ia"
            >
              {escribiendo
                ? es
                  ? 'Escribiendo…'
                  : 'Writing…'
                : hayBorrador
                  ? es
                    ? 'Mejorar lo que escribí'
                    : 'Improve my text'
                  : es
                    ? 'Escribir el borrador'
                    : 'Write the draft'}
            </Button>
          </div>
        </div>
      </Presence>
    </div>
  );
}
