'use client';

import { useState } from 'react';
import { CaretDown, Check, X, Clock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentActivityBlock, AgentExecution } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { ChatOrb } from './ChatOrb';
import { useElapsed, formatElapsed } from './useElapsed';

interface AgentTaskProgressProps {
  /** Bloque vivo; `null` cuando no hay agentes corriendo. */
  activity: AgentActivityBlock | null;
  /** Antes del primer despacho: el asistente está pensando. */
  thinking: boolean;
  className?: string;
}

function Glifo({ agent }: { agent: AgentExecution }) {
  if (agent.status === 'running' || agent.status === 'dispatching')
    return <ChatOrb size={13} label={null} />;
  if (agent.status === 'completed') return <Check size={13} weight="bold" className="text-success-700" />;
  if (agent.status === 'failed') return <X size={13} weight="bold" className="text-danger" />;
  return <Clock size={13} className="text-fg-subtle" />;
}

/**
 * AgentTaskProgress — el progreso de la tarea, pegado al compositor.
 *
 * La otra mitad del patrón de Manus: mientras el hilo cuenta la historia, este
 * panel es el «dónde vamos». Cerrado, una línea: la tarea en curso, su reloj y
 * «3 / 5». Abierto, la lista completa con ✓ hecho · orbe en curso · reloj
 * pendiente. Vive sólo mientras hay trabajo (pensando o agentes corriendo);
 * cuando termina, desaparece y el hilo queda como registro.
 */
export function AgentTaskProgress({ activity, thinking, className }: AgentTaskProgressProps) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);

  const agentes = activity?.agents ?? [];
  const enCurso =
    agentes.find((a) => a.status === 'running' || a.status === 'dispatching') ?? null;
  const hechos = agentes.filter((a) => a.status === 'completed' || a.status === 'failed').length;
  const ms = useElapsed(enCurso?.startedAt ?? activity?.startedAt, Boolean(enCurso) || thinking);

  const visible = thinking || agentes.length > 0;
  if (!visible) return null;

  const titulo = enCurso
    ? enCurso.taskDescription || AGENT_METADATA[enCurso.agentType].label
    : thinking
      ? t('beta.tasks.thinking')
      : t('beta.tasks.finishing');

  return (
    <div
      className={cn(
        // Se apoya sobre el compositor: bordes de arriba redondeados, el de
        // abajo recto para que se lea como una sola pieza con la caja de texto.
        'mx-auto w-full max-w-3xl rounded-t-2xl border border-b-0 border-border bg-surface',
        'shadow-[0_-6px_24px_-12px_rgba(20,19,15,0.12)]',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      {/* Cabecera — siempre visible */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2.5 text-left',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-2xl'
        )}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <ChatOrb size={15} label={null} />
        </span>
        <span className="min-w-0 flex-1 truncate font-body text-[14px] font-medium text-fg">
          {titulo}
        </span>
        <span className="shrink-0 border-l border-border pl-3 font-mono text-[12px] tabular-nums text-fg-subtle">
          {formatElapsed(ms)}
        </span>
        {agentes.length > 0 && (
          <span className="shrink-0 font-body text-[13px] tabular-nums text-fg-muted">
            {hechos} / {agentes.length}
          </span>
        )}
        <CaretDown
          size={14}
          className={cn(
            'shrink-0 text-fg-subtle transition-transform duration-200',
            abierto && 'rotate-180'
          )}
        />
      </button>

      {/* Lista — al abrir */}
      {abierto && agentes.length > 0 && (
        <div className="border-t border-surface-muted px-4 pb-3 pt-2.5">
          <p className="mb-2 font-body text-[12.5px] text-fg-subtle">{t('beta.tasks.progress')}</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {agentes.map((a) => {
              const corre = a.status === 'running' || a.status === 'dispatching';
              return (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Glifo agent={a} />
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-body text-[13.5px]',
                      corre ? 'text-fg' : a.status === 'completed' ? 'text-fg-muted' : 'text-fg-subtle'
                    )}
                  >
                    {a.taskDescription || AGENT_METADATA[a.agentType].label}
                  </span>
                  {corre && (
                    <span className="shrink-0 border-l border-border pl-3 font-mono text-[11.5px] tabular-nums text-fg-subtle">
                      {formatElapsed(ms)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
