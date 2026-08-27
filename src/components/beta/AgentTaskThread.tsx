'use client';

import { Check, X, Clock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentActivityBlock, AgentExecution } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { ChatOrb } from './ChatOrb';
import { useElapsed, formatElapsed } from './useElapsed';

// ============================================================================
// Fila
// ============================================================================

function TaskRow({ agent, esUltima }: { agent: AgentExecution; esUltima: boolean }) {
  const { t } = useI18n();
  const corriendo = agent.status === 'running' || agent.status === 'dispatching';
  const ms = useElapsed(agent.startedAt, corriendo);
  const finalMs =
    agent.durationMs ??
    (agent.completedAt ? agent.completedAt.getTime() - agent.startedAt.getTime() : ms);
  const label = agent.taskDescription || AGENT_METADATA[agent.agentType].label;
  const agente = AGENT_METADATA[agent.agentType].label;

  return (
    <li className="relative flex gap-3">
      {/* Riel vertical que une las filas — el «árbol» de Manus */}
      {!esUltima && (
        <span
          aria-hidden
          className="absolute left-[9px] top-6 h-[calc(100%-4px)] w-px bg-border"
        />
      )}

      {/* Glifo de estado. Trabajando = el mismo orbe del chat, en chiquito:
          una sola identidad para «Laura está haciendo algo». */}
      <span className="relative z-10 mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center">
        {corriendo ? (
          <ChatOrb size={14} label={null} />
        ) : agent.status === 'completed' ? (
          <Check size={14} weight="bold" className="text-success-700" />
        ) : agent.status === 'failed' ? (
          <X size={14} weight="bold" className="text-danger" />
        ) : (
          <Clock size={14} className="text-fg-subtle" />
        )}
      </span>

      <div className="min-w-0 flex-1 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              'font-body text-[14px] leading-snug',
              corriendo ? 'text-fg' : agent.status === 'failed' ? 'text-fg' : 'text-fg-muted'
            )}
          >
            {label}
          </span>
          {/* Sin reloj en lo pendiente: un «0:00» al lado de algo que no
              empezó es ruido, no información. */}
          {(corriendo || agent.status === 'completed' || agent.status === 'failed') && (
            <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-fg-subtle">
              {formatElapsed(corriendo ? ms : finalMs)}
            </span>
          )}
        </div>

        {/* Sub-línea: qué está haciendo, con el nombre del agente */}
        {corriendo && (
          <p className="mt-0.5 font-body text-[12.5px] text-fg-subtle">
            {t('beta.tasks.workingAs', { agent: agente })}
          </p>
        )}
        {agent.status === 'failed' && agent.error && (
          <p className="mt-0.5 font-body text-[12.5px] text-danger">{agent.error}</p>
        )}
      </div>
    </li>
  );
}

// ============================================================================
// Bloque
// ============================================================================

interface AgentTaskThreadProps {
  activity: AgentActivityBlock;
  /** Texto del asistente que precede a la tarea, si ya llegó. */
  intro?: string;
  className?: string;
}

/**
 * AgentTaskThread — la actividad de los agentes, EN el hilo.
 *
 * ── Por qué (Nico, 2026-08-27) ─────────────────────────────────────────────
 *
 * «Cuando uno de nuestros agentes esté trabajando para traer información, mira
 * cómo lo hace Manus: debemos mostrar qué está haciendo y pensando. Ellos lo
 * atan al chat y se ve hermoso». Lo que había era una tarjeta con borde,
 * barra de progreso y encabezado — un widget metido en la conversación. Esto
 * es plano: filas con glifo de estado, la tarea, un reloj vivo, y un riel que
 * las une. Se lee como parte de lo que Laura está diciendo, no como un panel
 * aparte.
 *
 * Cada fila es un despacho REAL (`dispatch_start` / `dispatch_result` del
 * stream): agente, tarea, estado, duración. No hay pasos inventados.
 */
export function AgentTaskThread({ activity, intro, className }: AgentTaskThreadProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {/* Mismo avatar que un mensaje del asistente, para que el bloque se lea
          como suyo */}
      <div className="w-6 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {intro && (
          <p className="mb-3 font-body text-[14px] leading-relaxed text-fg">{intro}</p>
        )}
        <ul className="m-0 list-none p-0">
          {activity.agents.map((agent, i) => (
            <TaskRow key={agent.id} agent={agent} esUltima={i === activity.agents.length - 1} />
          ))}
        </ul>
      </div>
    </div>
  );
}
