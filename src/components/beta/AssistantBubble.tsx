'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { LeasefyMark } from './LeasefyMark';
import { ChatOrb } from './ChatOrb';

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
  const isStreamingThis = message.status === 'streaming';
  const isSending = message.status === 'sending';
  const displayContent = isStreamingThis && streamingContent ? streamingContent : message.content;

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

            <MessageActions message={message} />
          </>
        )}
      </div>
    </div>
  );
}
