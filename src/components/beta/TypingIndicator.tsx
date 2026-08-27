'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { ChatOrb } from './ChatOrb';

/**
 * TypingIndicator — Laura pensando, antes del primer despacho.
 *
 * Orbe del MISMO tamaño que el avatar (Nico, 2026-08-27: «es demasiado grande
 * ese orbe») más una línea que dice qué está pasando. En esta fase lo único
 * cierto es que el modelo está leyendo la pregunta y decidiendo qué hacer —
 * eso es lo que se dice. En cuanto despacha agentes, `AgentTaskThread` toma
 * el relevo con las tareas reales; cuando empieza a escribir, el orbe pasa a
 * ser el avatar del mensaje. Cada fase cuenta lo suyo, ninguna inventa pasos.
 */
export function TypingIndicator({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex w-6 shrink-0 items-center justify-center">
        <ChatOrb size={24} label={null} />
      </div>
      <p
        role="status"
        className="font-body text-[14px] text-fg-muted animate-pulse [animation-duration:2.2s]"
      >
        {t('beta.tasks.thinking')}
      </p>
    </div>
  );
}
