'use client';

import { useState } from 'react';
import { Cards, Check, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { ChatTemplatesMenu } from './ChatTemplates';

interface ChatConversationBarProps {
  onSelectTemplate: (prompt: string) => void;
  className?: string;
}

/**
 * Barra fija arriba de una conversación en curso.
 *
 * ── Por qué existe (Nico, 2026-08-27) ──────────────────────────────────────
 *
 * Con un solo mensaje escrito, el estado-0 desaparecía y con él TODO: las
 * plantillas, el historial, cualquier forma de empezar de nuevo. La única
 * salida era recargar la página. En el chat embebido de `/panel/inmobiliaria`
 * ni siquiera hay barra lateral de conversaciones, así que la trampa era
 * total.
 *
 * Dos controles, los dos que faltaban:
 *
 *  - **Plantillas** — el mismo menú del estado-0, ahora alcanzable mientras se
 *    conversa, que era justamente el punto de mudarlas a un menú.
 *  - **Terminar** — cierra la conversación actual y abre una vacía. La que se
 *    cierra NO se borra: queda en el historial del estado-0, que es de donde
 *    se retoma. Por eso pide confirmación en vez de un diálogo: el gesto es
 *    reversible, pero perder el hilo a mitad de una respuesta no se siente
 *    así.
 */
export function ChatConversationBar({ onSelectTemplate, className }: ChatConversationBarProps) {
  const { t } = useI18n();
  const { createConversation } = useBetaChatContext();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [confirmandoFin, setConfirmandoFin] = useState(false);

  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-between gap-3',
        // Franja propia, no una fila flotando (Nico, 2026-08-27: «separar con
        // una línea o algo lo de plantillas + terminar conversación del chat»).
        //
        // Iba con `border-surface-muted`, casi del color del fondo. Pero el
        // borde solo no alcanzaba: el lienzo del chat es `--background`
        // (#FAFAF9) y el header `--bg` (#fbfaf9) — el mismo color a ojo —, así
        // que las tres zonas se leían como un bloque y el pelo de #E5E2DC del
        // header se perdía en el medio. `bg-surface` (blanco puro) le da a la
        // franja un relleno que SÍ contrasta, y entonces las dos fronteras
        // —header↕franja y franja↕chat— se leen de verdad.
        //
        // Sin borde SUPERIOR a propósito: el header ya trae el suyo
        // (`PlanHeader`, `border-b border-border`) y dos pegados dan raya doble.
        'border-b border-border bg-surface px-4 py-2 sm:px-6',
        className
      )}
    >
      {/* Plantillas */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setTemplatesOpen((v) => !v)}
          aria-expanded={templatesOpen}
          aria-haspopup="menu"
          className={cn(
            'inline-flex items-center gap-[7px] rounded-full border border-border bg-surface px-[13px] py-[6px]',
            'font-body text-[13px] font-medium text-fg',
            'transition-colors duration-150 hover:bg-bg hover:border-border-strong',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <Cards size={14} />
          {t('beta.templates.button')}
        </button>

        <ChatTemplatesMenu
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          onSelect={onSelectTemplate}
        />
      </div>

      {/* Terminar conversación */}
      {confirmandoFin ? (
        <div className="flex items-center gap-1.5">
          <span className="hidden font-body text-[12.5px] text-fg-muted sm:inline">
            {t('beta.conversation.endConfirm')}
          </span>
          <button
            type="button"
            onClick={() => {
              createConversation();
              setConfirmandoFin(false);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-[11px] py-[5px]',
              'font-body text-[12.5px] font-medium text-fg',
              'transition-colors duration-150 hover:border-border-strong',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <Check size={13} />
            {t('beta.conversation.endYes')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoFin(false)}
            aria-label={t('beta.conversation.endCancel')}
            className={cn(
              'inline-flex h-[25px] w-[25px] items-center justify-center rounded-full text-fg-subtle',
              'transition-colors duration-150 hover:bg-surface-muted hover:text-fg',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmandoFin(true)}
          className={cn(
            'font-body text-[12.5px] font-medium text-fg-muted',
            'transition-colors duration-150 hover:text-fg',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full px-2 py-1'
          )}
        >
          {t('beta.conversation.end')}
        </button>
      )}
    </div>
  );
}
