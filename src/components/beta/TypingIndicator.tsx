'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ChatSnapshot } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { ChatOrb } from './ChatOrb';
import { useElapsed, useSince } from './useElapsed';

interface TypingIndicatorProps {
  /** Mensajes previos que el asistente está leyendo como contexto. */
  historyCount?: number;
  /** El «estado de hoy» llega por el stream ANTES de la respuesta. */
  snapshot?: ChatSnapshot | null;
  className?: string;
}

/**
 * TypingIndicator — Laura pensando, antes del primer despacho.
 *
 * Sin barra (Nico, 2026-08-27: «quítale esa barra, para eso es el orbe»). La
 * bajada rota por HECHOS que de verdad llegan en esta fase — no por frases de
 * relleno: cuántos mensajes de contexto está leyendo, el estado de hoy en
 * cuanto el stream lo entrega (viene antes que la respuesta), qué agentes
 * tiene a mano, y en qué tramo de la espera va. En cuanto despacha agentes,
 * `AgentTaskThread` toma el relevo con las tareas reales.
 */
export function TypingIndicator({ historyCount = 0, snapshot, className }: TypingIndicatorProps) {
  const { t } = useI18n();
  const desde = useSince(true);
  const ms = useElapsed(desde, true);
  const s = ms / 1000;
  const fase = s < 3 ? 'reading' : s < 8 ? 'deciding' : 'longer';

  const lineas = useMemo(() => {
    const out: string[] = [];
    if (historyCount > 0) out.push(t('beta.tasks.fact.history', { n: historyCount }));
    if (snapshot) {
      out.push(
        t('beta.tasks.fact.snapshot', {
          deudores: snapshot.deudoresActivos,
          escalaciones: snapshot.escalacionesPendientes,
        })
      );
    }
    const agentes = ['cobranza', 'pagos', 'cotizador', 'conciliacion']
      .map((k) => AGENT_METADATA[k as keyof typeof AGENT_METADATA]?.label)
      .filter(Boolean)
      .join(', ');
    out.push(t('beta.tasks.fact.agents', { agentes }));
    out.push(t(`beta.tasks.hint.${fase}`));
    return out;
  }, [historyCount, snapshot, fase, t]);

  // Rota cada 2,4 s. El índice vive aparte de la lista para que una línea
  // nueva (p. ej. el snapshot al llegar) no reinicie el ciclo.
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => n + 1), 2400);
    return () => window.clearInterval(id);
  }, []);
  const linea = lineas[i % lineas.length];

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* El orbe se alinea por ARRIBA con el título, no por el centro (Nico,
          2026-08-27: «dejá el título pegado al tope de arriba del orbe, mirá
          que está como en el centro»). Es la misma geometría que el avatar de
          una respuesta: la marca arranca donde arranca el texto.

          El desfase medido en la página era de 8px, y no es arbitrario: el
          canvas del orbe mide 1,9× su tamaño (el resplandor necesita margen) y
          el disco visible queda centrado ahí adentro, mientras que la primera
          línea del título pierde 4px de interlineado antes de dibujar la letra.
          `mt-[10px]` = los 2px que ya tenía + esos 8. */}
      <div className="mt-[10px] flex w-7 shrink-0 items-center justify-center">
        <ChatOrb size={28} className="-mt-[13px] -ml-[13px]" label={null} />
      </div>
      <div className="min-w-0 flex-1 pt-[3px]">
        {/* Sin reloj acá: ya está en el panel del compositor, y dos relojes
            iguales a la vista compiten (Nico: «quita eso del tiempo pero sólo
            en el del chat»). El tiempo sigue midiéndose para las fases. */}
        <p role="status" className="font-body text-[16px] text-fg">
          {t(`beta.tasks.phase.${fase}`)}
        </p>
        <p
          key={linea}
          className="mt-1 font-body text-[13.5px] text-fg-subtle animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          {linea}
        </p>
      </div>
    </div>
  );
}
