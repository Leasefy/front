'use client';

import { useState } from 'react';
import { Check, X, ArrowUUpLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { BotonDelEquipo } from '@/components/agentes/BotonDelEquipo';

interface ChatConversationBarProps {
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
 * Lo que lleva:
 *
 *  - **El equipo** (02-10-2026) — los orbes de quienes responden; abre el
 *    modal «El equipo» (`BotonDelEquipo`).
 *  - **Terminar** — cierra la conversación actual y abre una vacía. La que se
 *    cierra NO se borra: queda en el historial del estado-0, que es de donde
 *    se retoma. Por eso pide confirmación en vez de un diálogo: el gesto es
 *    reversible, pero perder el hilo a mitad de una respuesta no se siente
 *    así.
 *
 * «Plantillas» se mudó al compositor (02-10): sale desde su botón, como en la
 * llegada, y sigue alcanzable mientras se conversa.
 */
export function ChatConversationBar({ className }: ChatConversationBarProps) {
  const { t } = useI18n();
  const { createConversation } = useBetaChatContext();
  const [confirmandoFin, setConfirmandoFin] = useState(false);

  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-end gap-2',
        // Franja separada por la LÍNEA, no por el relleno (Nico, 2026-08-27:
        // «¿por qué fondo blanco? manejala con el mismo fondo de todo»).
        //
        // Probé `bg-surface` (blanco puro) para ganar contraste, y era ganar lo
        // que no había que ganar: una banda blanca dentro de una interfaz
        // crema se lee como otro componente pegado encima. Hereda el fondo y
        // que separe el borde, que es lo que hace el header.
        //
        // Sin borde SUPERIOR a propósito: el header ya trae el suyo
        // (`PlanHeader`, `border-b border-border`) y dos pegados dan raya doble.
        'border-b border-border px-4 py-2 sm:px-6',
        className
      )}
    >
      {/* El equipo: los orbes de quienes responden (abre «El equipo»). */}
      <BotonDelEquipo conTexto={false} />

      {/* Terminar conversación */}
      {confirmandoFin ? (
        /* La confirmación es UNA pieza, no tres cosas sueltas.
         *
         * Antes eran texto + pastilla + equis flotando cada uno por su lado, y
         * se leía como un accidente (Nico, 2026-08-27: «esto hazlo más bonito
         * también»). Ahora van dentro de una cápsula con borde: se entiende que
         * la pregunta y las dos salidas son el mismo momento, y de paso el
         * bloque ocupa el lugar exacto que dejó el botón. */
        <div
          className={cn(
            'flex items-center gap-1 rounded-full border border-border bg-surface py-[3px] pl-3 pr-[3px]',
            'shadow-[0_1px_3px_rgba(20,19,15,0.05)]',
            'animate-in fade-in slide-in-from-right-1 duration-150'
          )}
        >
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
              'inline-flex items-center gap-1.5 rounded-full bg-fg px-3 py-[5px]',
              'font-body text-[12.5px] font-medium text-bg',
              'transition-opacity duration-150 hover:opacity-85',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <Check size={12} weight="bold" />
            {t('beta.conversation.endYes')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoFin(false)}
            aria-label={t('beta.conversation.endCancel')}
            className={cn(
              'inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-fg-subtle',
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
            // Pastilla como la de Plantillas, pero en reposo sin borde: es la
            // acción secundaria de la franja y no debe pesar lo mismo. El borde
            // aparece al acercarse, que es cuando importa que se vea tocable —
            // antes era texto suelto y ni parecía un control.
            'group inline-flex items-center gap-[7px] rounded-full border border-transparent px-[11px] py-[6px]',
            'font-body text-[12.5px] font-medium text-fg-muted',
            'transition-colors duration-150 hover:border-border hover:bg-surface hover:text-fg',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <ArrowUUpLeft size={13} className="text-fg-subtle transition-colors group-hover:text-fg-muted" />
          {t('beta.conversation.end')}
        </button>
      )}
    </div>
  );
}
