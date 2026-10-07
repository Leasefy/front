'use client';

import type { ReactNode } from 'react';
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { RespuestaConForma } from './RespuestaConForma';
import { AccionesEnElHilo } from './AccionesEnElHilo';
import { sinTablasDeMarkdown, tieneTabla } from '@/lib/chat/bloques';

interface AssistantBubbleProps {
  message: ChatMessage;
  /** Partial content during streaming (overrides message.content) */
  streamingContent?: string;
  /**
   * Lo que va después del texto y antes de las acciones (02-10: «Cómo lo
   * pensó», `RazonamientoDelTurno`).
   */
  antesDeLasAcciones?: ReactNode;
  /** Copiar, rehacer y los pulgares a la vista sin pasar el cursor (la última respuesta). */
  accionesSiempreVisibles?: boolean;
  className?: string;
}

/**
 * AssistantBubble — el texto de una respuesta del asistente, sin burbuja.
 *
 * Desde el 02-10-2026 la identidad (el orbe del orquestador y su nombre) va
 * en la cabecera del turno (`CabeceraDeLaRespuesta`), arriba de esto: acá ya
 * no hay avatar a la izquierda y el texto ocupa todo el ancho de lectura.
 *
 * Las cuatro acciones de abajo (copiar · rehacer · pulgares) viven en
 * `MessageActions`, compartidas con la tarjeta (`ResponseCard`): antes una
 * respuesta con cifras se pintaba como tarjeta y se quedaba SIN pulgares, que
 * son justo las que hay que poder corregir (Nico, 2026-08-27 y 13-09).
 */
export function AssistantBubble({
  message,
  streamingContent,
  antesDeLasAcciones,
  accionesSiempreVisibles = false,
  className,
}: AssistantBubbleProps) {
  const { t } = useI18n();
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
   * B1 — el turno que falló. «Reintentar» va DENTRO del aviso (Nico, 02-10:
   * «integrado al mensaje cuando la respuesta fue un fallo, no suelto
   * abajo»): rehace ESE turno con el mismo texto (`regenerateResponse` recorta
   * desde la pregunta y la reenvía). Sin pulgares: no hay respuesta que juzgar.
   */
  if (message.status === 'error') {
    const ocupado = isThinking || isStreaming || isAgentsRunning;
    return (
      <div className={cn('min-w-0', className)} data-testid="burbuja-con-error">
        <div className="chat-aviso-de-fallo flex flex-col gap-3 rounded-[18px] border border-danger/20 bg-danger-soft px-4 py-3 sm:flex-row sm:items-center">
          <div role="alert" className="flex min-w-0 flex-1 items-start gap-2.5 text-[15px] leading-relaxed text-fg">
            <WarningCircle className="mt-[3px] size-[18px] shrink-0 text-danger" weight="fill" aria-hidden="true" />
            <span className="min-w-0">{message.content}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            className="shrink-0 gap-1.5 self-start bg-surface sm:self-auto"
            disabled={ocupado}
            onClick={() => regenerateResponse(message.id)}
          >
            <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
            {t('beta.actions.reintentar')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      {isSending ? (
        <span className="sr-only">{t('beta.chat.generando')}</span>
      ) : (
        <>
          {/* El texto, sin burbuja ni recuadro: tipografía de lectura. */}
          <div className="chat-lectura text-[16px] leading-[1.65] text-fg">
            <MarkdownRenderer content={displayContent} isStreaming={isStreamingThis} />
          </div>

          {/* Lo que tiene FORMA (tabla, cifra, aviso, entidad) aparece cuando
              el texto terminó de escribirse, con un fundido: el texto
              presenta, la tarjeta muestra. */}
          {conForma && (
            <>
              <RespuestaConForma
                bloques={message.bloques}
                entidades={message.entidades}
                turnoId={message.turnoId}
                conAcciones={(message.acciones?.length ?? 0) > 0}
                className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-slow motion-reduce:animate-none"
              />
              {/* Lo que ACTÚA en el hilo (23-09, «todo en el chat»): lo que se
                  puede hacer, «¿Lo hago?», el resultado y los datos que faltan. */}
              <AccionesEnElHilo
                message={message}
                className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-slow motion-reduce:animate-none"
              />
            </>
          )}

          {conForma && antesDeLasAcciones}

          <MessageActions message={message} siempreVisibles={accionesSiempreVisibles} />
        </>
      )}
    </div>
  );
}
