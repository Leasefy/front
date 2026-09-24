'use client';

import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { LeasefyMark } from './LeasefyMark';
import { ChatOrb } from './ChatOrb';
import { RespuestaConForma } from './RespuestaConForma';
import { sinTablasDeMarkdown, tieneTabla } from '@/lib/chat/bloques';

interface AssistantBubbleProps {
  message: ChatMessage;
  /** Partial content during streaming (overrides message.content) */
  streamingContent?: string;
  className?: string;
}

/**
 * AssistantBubble - Clean left-aligned assistant message.
 * Small icon + flowing text (no bubble container).
 *
 * Las cuatro acciones de abajo (copiar · rehacer · pulgares) existían dibujadas
 * desde el rediseño, con `aria-label` y SIN un solo `onClick` (Nico,
 * 2026-08-27: «nada de esas acciones funciona, no tienen tooltips, toasts,
 * función real»). Viven ahora en `MessageActions`, compartidas con la tarjeta
 * (`ResponseCard`): antes una respuesta con cifras se pintaba como tarjeta y se
 * quedaba SIN pulgares, que son justo las que hay que poder corregir.
 */
export function AssistantBubble({ message, streamingContent, className }: AssistantBubbleProps) {
  const { regenerateResponse, isThinking, isStreaming, isAgentsRunning } = useBetaChatContext();
  const isStreamingThis = message.status === 'streaming';
  const isSending = message.status === 'sending';
  const textoCrudo = isStreamingThis && streamingContent ? streamingContent : message.content;
  // Si la respuesta trae su tabla como DATOS, la pinta Cadence debajo; la que
  // el modelo copió a mano en el texto sería decirlo dos veces (y teclear una
  // tabla letra por letra se ve roto). Ver `sinTablasDeMarkdown`.
  const displayContent = tieneTabla(message.bloques)
    ? sinTablasDeMarkdown(textoCrudo, { parcial: isStreamingThis })
    : textoCrudo;
  const conForma = message.status === 'complete';

  /*
   * B1 — el turno que falló. Antes quedaba `complete`: el aviso se pintaba con
   * la cara de una respuesta, con pulgares, y no había forma de volver a
   * preguntar sin reescribir. «Reintentar» rehace ESE turno con el mismo
   * texto (`regenerateResponse` recorta desde la pregunta y la reenvía).
   */
  if (message.status === 'error') {
    const ocupado = isThinking || isStreaming || isAgentsRunning;
    return (
      <div className={cn('flex gap-3', className)} data-testid="burbuja-con-error">
        <div className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-danger-soft flex items-center justify-center">
          <WarningCircle className="w-4 h-4 text-danger" weight="bold" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-relaxed text-danger"
          >
            {message.content}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            disabled={ocupado}
            onClick={() => regenerateResponse(message.id)}
          >
            <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', className)}>
      {/* Avatar. Mientras la respuesta se está generando ES el orbe: hace de
          identidad y de indicador de carga a la vez, y evita tener la marca
          chica y un segundo indicador compitiendo por decir lo mismo. */}
      {isSending || isStreamingThis ? (
        <div className="flex-shrink-0 w-7 mt-0.5 flex items-start justify-center">
          <ChatOrb size={28} className="-mt-[13px] -ml-[13px]" label="Generando respuesta" />
        </div>
      ) : (
        /* Avatar final = el monograma de marca tal como viene en
           «Leasefy Monogram White on Blue.svg»: círculo azul #1A40FF con el
           trazo blanco. Antes era un cuadrado gris con el trazo azul, más
           chico (Nico, 2026-08-27: «un poquito más grande, círculo y no
           cuadrado, con el nuevo logo»). 28px, el mismo diámetro que el orbe
           mientras escribe, para que el cambio orbe→marca no salte. */
        <div className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-[#1A40FF] flex items-center justify-center">
          <LeasefyMark className="w-4 h-auto text-white" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {isSending ? (
          <span className="sr-only">Generando respuesta</span>
        ) : (
          <>
            {/* Content — no bubble, just flowing text */}
            <div className="text-[16px] leading-[1.6] text-foreground">
              <MarkdownRenderer content={displayContent} isStreaming={isStreamingThis} />
            </div>

            {/* Lo que tiene FORMA (tabla, cifra, aviso, entidad) aparece cuando
                el texto terminó de escribirse, con un fundido: el texto
                presenta, la tarjeta muestra. */}
            {conForma && (
              <RespuestaConForma
                bloques={message.bloques}
                entidades={message.entidades}
                className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
              />
            )}

            <MessageActions message={message} />
          </>
        )}
      </div>
    </div>
  );
}
