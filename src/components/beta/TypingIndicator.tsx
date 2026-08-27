'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { ChatOrb } from './ChatOrb';
import { useElapsed, useSince, formatElapsed } from './useElapsed';

/**
 * TypingIndicator — Laura pensando, antes del primer despacho.
 *
 * Nico, 2026-08-27: «que se sienta algo más real, más agéntico; deberíamos
 * mostrar algo más ahí de carga». Antes: el orbe y una frase fija.
 *
 * Lo que se muestra es lo que de verdad se sabe en esta fase, que es poco
 * pero no es nada: cuánto lleva (reloj) y en qué tramo de la espera está.
 * Las frases cambian por TIEMPO transcurrido — leer, decidir, y a partir de
 * los 8 s avisar que está tardando más de lo normal — igual que hacen Claude
 * y ChatGPT. No se inventan pasos («consultando la base…») que el backend no
 * reporta: en cuanto despacha agentes, `AgentTaskThread` muestra las tareas
 * reales, y cuando empieza a escribir el orbe pasa a ser el avatar.
 */
export function TypingIndicator({ className }: { className?: string }) {
  const { t } = useI18n();
  const desde = useSince(true);
  const ms = useElapsed(desde, true);
  const s = ms / 1000;
  const fase = s < 3 ? 'reading' : s < 8 ? 'deciding' : 'longer';

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="mt-0.5 flex w-7 shrink-0 items-center justify-center">
        <ChatOrb size={28} className="-mt-[13px] -ml-[13px]" label={null} />
      </div>
      <div className="min-w-0 flex-1 pt-[3px]">
        <div className="flex items-baseline gap-3">
          <p role="status" className="font-body text-[14px] text-fg">
            {t(`beta.tasks.phase.${fase}`)}
          </p>
          <span className="font-mono text-[11.5px] tabular-nums text-fg-subtle">
            {formatElapsed(ms)}
          </span>
        </div>
        {/* Barra de actividad: un destello que recorre la pista. Indeterminada
            a propósito — no hay porcentaje real que mostrar, y una barra que
            «llena» inventaría uno. */}
        <div className="mt-2 h-[3px] w-40 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full w-1/3 rounded-full bg-primary/70 animate-[laura-sweep_1.4s_ease-in-out_infinite]" />
        </div>
        <p className="mt-1.5 font-body text-[12.5px] text-fg-subtle">
          {t(`beta.tasks.hint.${fase}`)}
        </p>
        <style jsx global>{`
          @keyframes laura-sweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[laura-sweep_1\\.4s_ease-in-out_infinite\\] { animation: none; width: 100%; opacity: .5; }
          }
        `}</style>
      </div>
    </div>
  );
}
