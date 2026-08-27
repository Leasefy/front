'use client';

import { useState } from 'react';
import { Copy, Check, ArrowsClockwise, ThumbsUp, ThumbsDown } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@leasefy/cadence';
import { toast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { LeasefyMark } from './LeasefyMark';
import { ChatOrb } from './ChatOrb';

interface AssistantBubbleProps {
  message: ChatMessage;
  /** Partial content during streaming (overrides message.content) */
  streamingContent?: string;
  className?: string;
}

/**
 * Copia al portapapeles con respaldo.
 *
 * `navigator.clipboard` no existe fuera de un contexto seguro (http:// que no
 * sea localhost) ni en navegadores viejos, y ahí lanzaba una promesa
 * rechazada que nadie atrapaba: el botón "funcionaba" sin copiar nada.
 */
async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* cae al respaldo */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * AssistantBubble - Clean left-aligned assistant message.
 * Small icon + flowing text (no bubble container).
 *
 * Las cuatro acciones de abajo (copiar · rehacer · pulgares) existían dibujadas
 * desde el rediseño, con `aria-label` y SIN un solo `onClick` (Nico,
 * 2026-08-27: «nada de esas acciones funciona, no tienen tooltips, toasts,
 * función real»). Cada una hace ahora lo que dice, avisa que lo hizo, y se
 * explica al pasar el mouse.
 */
export function AssistantBubble({ message, streamingContent, className }: AssistantBubbleProps) {
  const { t } = useI18n();
  const { regenerateResponse, rateMessage, isThinking, isStreaming, isAgentsRunning } =
    useBetaChatContext();
  const [copiado, setCopiado] = useState(false);

  const isStreamingThis = message.status === 'streaming';
  const isSending = message.status === 'sending';
  const displayContent = isStreamingThis && streamingContent ? streamingContent : message.content;
  const ocupado = isThinking || isStreaming || isAgentsRunning;

  const handleCopiar = async () => {
    const ok = await copiarAlPortapapeles(message.content);
    if (!ok) {
      toast.error(t('beta.actions.copyError'));
      return;
    }
    setCopiado(true);
    toast.success(t('beta.actions.copied'));
    window.setTimeout(() => setCopiado(false), 1800);
  };

  const handleRehacer = () => {
    // El guard también vive en el hook; acá evita además el toast alegre
    // mientras hay un turno corriendo.
    if (ocupado) {
      toast.info(t('beta.actions.busy'));
      return;
    }
    regenerateResponse(message.id);
    toast.info(t('beta.actions.regenerating'));
  };

  const handlePulgar = (rating: 'up' | 'down') => {
    const quitando = message.feedback === rating;
    rateMessage(message.id, rating);
    toast.success(
      quitando
        ? t('beta.actions.feedbackRemoved')
        : rating === 'up'
          ? t('beta.actions.feedbackUp')
          : t('beta.actions.feedbackDown')
    );
  };

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
            <div className="text-[14px] leading-relaxed text-foreground">
              <MarkdownRenderer content={displayContent} isStreaming={isStreamingThis} />
            </div>

            {/* Action icons — only when complete */}
            {message.status === 'complete' && (
              <div className="flex items-center gap-0.5 mt-2">
                <Tooltip content={copiado ? t('beta.actions.copied') : t('beta.actions.copy')}>
                  <IconButton
                    type="button"
                    icon={
                      copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />
                    }
                    variant="ghost"
                    onClick={() => void handleCopiar()}
                    className={cn(
                      'p-1.5 rounded-sm hover:bg-surface-muted',
                      copiado ? 'text-primary' : 'text-fg-subtle hover:text-fg-muted'
                    )}
                    aria-label={t('beta.actions.copy')}
                  />
                </Tooltip>

                <Tooltip content={t('beta.actions.regenerate')}>
                  <IconButton
                    type="button"
                    icon={<ArrowsClockwise className="w-3.5 h-3.5" />}
                    variant="ghost"
                    onClick={handleRehacer}
                    disabled={ocupado}
                    className="p-1.5 rounded-sm text-fg-subtle hover:text-fg-muted hover:bg-surface-muted disabled:opacity-40"
                    aria-label={t('beta.actions.regenerate')}
                  />
                </Tooltip>

                <Tooltip content={t('beta.actions.like')}>
                  <IconButton
                    type="button"
                    icon={
                      <ThumbsUp
                        className="w-3.5 h-3.5"
                        weight={message.feedback === 'up' ? 'fill' : 'regular'}
                      />
                    }
                    variant="ghost"
                    onClick={() => handlePulgar('up')}
                    aria-pressed={message.feedback === 'up'}
                    className={cn(
                      'p-1.5 rounded-sm hover:bg-surface-muted',
                      message.feedback === 'up'
                        ? 'text-primary'
                        : 'text-fg-subtle hover:text-fg-muted'
                    )}
                    aria-label={t('beta.actions.like')}
                  />
                </Tooltip>

                <Tooltip content={t('beta.actions.dislike')}>
                  <IconButton
                    type="button"
                    icon={
                      <ThumbsDown
                        className="w-3.5 h-3.5"
                        weight={message.feedback === 'down' ? 'fill' : 'regular'}
                      />
                    }
                    variant="ghost"
                    onClick={() => handlePulgar('down')}
                    aria-pressed={message.feedback === 'down'}
                    className={cn(
                      'p-1.5 rounded-sm hover:bg-surface-muted',
                      message.feedback === 'down'
                        ? 'text-danger'
                        : 'text-fg-subtle hover:text-fg-muted'
                    )}
                    aria-label={t('beta.actions.dislike')}
                  />
                </Tooltip>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
