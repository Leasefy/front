'use client';

import { MessageBubble } from '@leasefy/cadence';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { leerAdjuntosDelMensaje, pesoLegible } from '@/lib/chat/adjuntos';
import { IconoDelAdjunto } from './llegada/TiraDeAdjuntos';
import { useTr } from '@/lib/i18n/use-tr';

interface UserBubbleProps {
  message: ChatMessage;
  className?: string;
}

/**
 * UserBubble — right-aligned user message on the real Cadence MessageBubble
 * (role="user"). Content wrapped in a pre-wrap span so multi-line input keeps
 * its line breaks (MessageBubble's inner pill doesn't pre-wrap by default).
 *
 * (29-10-2026) Los archivos que la persona mandó van debajo del texto, cada
 * uno con su tipo, su nombre y su peso (el contenido no se vuelve a bajar:
 * vive en Leasefy y lo leyó el chat).
 */
export function UserBubble({ message, className }: UserBubbleProps) {
  const tr = useTr();
  const adjuntos = leerAdjuntosDelMensaje(message.adjuntos);
  return (
    <MessageBubble role="user" className={className}>
      <span className="block whitespace-pre-wrap break-words">{message.content}</span>
      {adjuntos.length > 0 ? (
        <ul aria-label={tr('Archivos que mandaste')} className="mt-2 space-y-1" data-testid="adjuntos-del-mensaje">
          {adjuntos.map((a) => (
            <li key={a.id} className="flex min-w-0 items-center gap-2 text-[13px] text-fg-muted">
              <IconoDelAdjunto familia={a.familia} className="shrink-0" />
              <span className="min-w-0 truncate text-fg" title={a.nombre}>
                {a.nombre}
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">{pesoLegible(a.tamano)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </MessageBubble>
  );
}
