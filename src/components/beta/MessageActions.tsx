'use client';

import { useRef, useState } from 'react';
import { Copy, Check, ArrowsClockwise, ThumbsUp, ThumbsDown } from '@phosphor-icons/react';
import { IconButton, Tooltip } from '@leasefy/cadence';
import { toast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { ChatMessage } from '@/lib/types/beta-chat';

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
 * Las acciones de UNA respuesta del asistente: copiar · rehacer · pulgar arriba ·
 * pulgar abajo, y el «¿Qué esperabas?» que abre el pulgar abajo.
 *
 * Vivía dentro de `AssistantBubble`, y por eso las respuestas que el chat pinta
 * como TARJETA (`ResponseCard`, cuando el backend manda `responseMeta`) no
 * tenían ni un pulgar: justo las respuestas con cifras, que son las que hay que
 * poder corregir. Nico, 2026-09-13: «un pulgar arriba o abajo en CADA
 * respuesta». Extraído acá para que las dos formas usen lo mismo.
 *
 * El pulgar ya no es memoria local: va a `POST /ai-hub/chat/feedback`, se guarda
 * por inmobiliaria y —con comentario— se convierte en una lección que el chat
 * usa en la siguiente pregunta (ver `rateMessage` en `useBetaChat`).
 */
export function MessageActions({
  message,
  className,
}: {
  message: ChatMessage;
  className?: string;
}) {
  const { t } = useI18n();
  const { regenerateResponse, rateMessage, isThinking, isStreaming, isAgentsRunning } =
    useBetaChatContext();
  const [copiado, setCopiado] = useState(false);
  // «¿Qué esperabas?» — sólo se abre con el pulgar abajo.
  const [abrirComentario, setAbrirComentario] = useState(false);
  const [comentario, setComentario] = useState('');
  const [cifraMal, setCifraMal] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const comentarioRef = useRef<HTMLTextAreaElement>(null);

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

  /**
   * El pulgar.
   *
   * Arriba: se manda de una (no hay nada que preguntar) y la pregunta queda
   * PROPUESTA para el banco de preguntas.
   * Abajo: se manda igual —el hecho vale por sí solo— y además se abre
   * «¿Qué esperabas?». Ese comentario es lo único que puede convertirse en una
   * lección, así que se pide, pero nunca se obliga: quien sólo quiere decir
   * «esto está mal» ya dijo algo útil.
   * Volver a tocar el mismo pulgar lo QUITA en pantalla.
   */
  const handlePulgar = async (rating: 'up' | 'down') => {
    const quitando = message.feedback === rating && !abrirComentario;
    if (quitando) {
      setAbrirComentario(false);
      await rateMessage(message.id, rating);
      toast.success(t('beta.actions.feedbackRemoved'));
      return;
    }
    if (rating === 'down') {
      setComentario(message.feedbackComentario ?? '');
      setCifraMal(message.feedbackCifraMal ?? false);
      setAbrirComentario(true);
      // Se manda el pulgar ya; el comentario es un segundo envío sobre el
      // MISMO turno (el backend hace upsert por turno, no duplica).
      const ok = await rateMessage(message.id, 'down');
      toast[ok ? 'success' : 'error'](
        ok ? t('beta.actions.feedbackDown') : t('beta.actions.feedbackError')
      );
      window.setTimeout(() => comentarioRef.current?.focus(), 0);
      return;
    }
    setAbrirComentario(false);
    const ok = await rateMessage(message.id, 'up');
    toast[ok ? 'success' : 'error'](
      ok ? t('beta.actions.feedbackUp') : t('beta.actions.feedbackError')
    );
  };

  const handleEnviarComentario = async () => {
    setEnviandoComentario(true);
    const ok = await rateMessage(message.id, 'down', {
      comentario: comentario.trim(),
      cifraMal,
    });
    setEnviandoComentario(false);
    if (!ok) {
      toast.error(t('beta.actions.feedbackError'));
      return;
    }
    setAbrirComentario(false);
    toast.success(t('beta.actions.feedbackSaved'));
  };

  if (message.status !== 'complete') return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-0.5 mt-2">
        <Tooltip content={copiado ? t('beta.actions.copied') : t('beta.actions.copy')}>
          <IconButton
            type="button"
            icon={copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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
            onClick={() => void handlePulgar('up')}
            aria-pressed={message.feedback === 'up'}
            className={cn(
              'p-1.5 rounded-sm hover:bg-surface-muted',
              message.feedback === 'up' ? 'text-primary' : 'text-fg-subtle hover:text-fg-muted'
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
            onClick={() => void handlePulgar('down')}
            aria-pressed={message.feedback === 'down'}
            className={cn(
              'p-1.5 rounded-sm hover:bg-surface-muted',
              message.feedback === 'down' ? 'text-danger' : 'text-fg-subtle hover:text-fg-muted'
            )}
            aria-label={t('beta.actions.dislike')}
          />
        </Tooltip>

        {/* Confirmación de que la valoración LLEGÓ. El pulgar marcado y el
            pulgar guardado son dos cosas distintas: la red falla. */}
        {message.feedbackEnviado && !abrirComentario && (
          <span role="status" className="ml-1 text-[11px] text-fg-subtle" data-testid="feedback-guardado">
            {message.feedbackLeccion
              ? t('beta.actions.feedbackLearned')
              : t('beta.actions.feedbackSaved')}
          </span>
        )}
      </div>

      {/* «¿Qué esperabas?» — el comentario es lo ÚNICO que se convierte en una
          lección para el chat, así que se pide; pero nunca se obliga: el pulgar
          abajo ya quedó guardado sin él. */}
      {abrirComentario && (
        <div className="mt-2 rounded-lg border border-border bg-surface-muted/40 p-3">
          <label
            htmlFor={`feedback-comentario-${message.id}`}
            className="block text-[13px] font-medium text-foreground"
          >
            {t('beta.actions.feedbackWhatTitle')}
          </label>
          <Textarea
            id={`feedback-comentario-${message.id}`}
            ref={comentarioRef}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAbrirComentario(false);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleEnviarComentario();
              }
            }}
            placeholder={t('beta.actions.feedbackWhatPlaceholder')}
            maxLength={1000}
            rows={1}
            className="mt-1.5 min-h-[40px]"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg-muted">
              <Checkbox
                checked={cifraMal}
                onCheckedChange={(v) => setCifraMal(v === true)}
                aria-label={t('beta.actions.feedbackWrongNumber')}
              />
              {t('beta.actions.feedbackWrongNumber')}
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAbrirComentario(false)}
              >
                {t('beta.actions.feedbackSkip')}
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={enviandoComentario}
                disabled={enviandoComentario || comentario.trim().length === 0}
                onClick={() => void handleEnviarComentario()}
              >
                {enviandoComentario
                  ? t('beta.actions.feedbackSending')
                  : t('beta.actions.feedbackSend')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
