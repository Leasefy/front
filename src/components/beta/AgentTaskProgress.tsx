'use client';

import { useState } from 'react';
import { CaretDown, Check, X, Clock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentActivityBlock, AgentExecution } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { ChatOrb } from './ChatOrb';
import { useElapsed, useSince, formatElapsed } from './useElapsed';

interface AgentTaskProgressProps {
  /** Bloque vivo; `null` cuando no hay agentes corriendo. */
  activity: AgentActivityBlock | null;
  /** Antes del primer despacho: el asistente está pensando. */
  thinking: boolean;
  /** Ya está escribiendo la respuesta. */
  streaming: boolean;
  className?: string;
}

type Estado = 'done' | 'running' | 'pending' | 'failed';
interface Paso { id: string; label: string; estado: Estado; startedAt?: Date; sub?: string }

function Glifo({ estado }: { estado: Estado }) {
  if (estado === 'running') return <ChatOrb size={13} label={null} />;
  if (estado === 'done') return <Check size={13} weight="bold" className="text-success-700" />;
  if (estado === 'failed') return <X size={13} weight="bold" className="text-danger" />;
  return <Clock size={13} className="text-fg-subtle" />;
}

function estadoDeAgente(a: AgentExecution): Estado {
  if (a.status === 'completed') return 'done';
  if (a.status === 'failed') return 'failed';
  return 'running';
}

/**
 * AgentTaskProgress — el progreso de la tarea, fusionado con el compositor.
 *
 * Nico, 2026-08-27: «cuando abro el dropdown no muestra nada… te dije que
 * hicieras algo así [Manus]: paso a paso todo lo que los agentes están
 * haciendo, lo que le falta hacer».
 *
 * Antes sólo listaba agentes despachados, y mientras piensa no hay ninguno:
 * desplegable vacío. Pero cada turno tiene un plan REAL y fijo — entender la
 * pregunta → consultar agentes → redactar la respuesta — y esos tres pasos
 * son ciertos siempre, así que se muestran como checklist. Cuando el backend
 * despacha agentes, el paso del medio se abre en una fila por agente con su
 * tarea real, estado y reloj. Nada acá es inventado: son las fases por las
 * que pasa de verdad cada respuesta, y los despachos que de verdad ocurren.
 */
export function AgentTaskProgress({ activity, thinking, streaming, className }: AgentTaskProgressProps) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);

  const agentes = activity?.agents ?? [];
  const hayAgentes = agentes.length > 0;
  const agenteEnCurso = agentes.find((a) => a.status === 'running' || a.status === 'dispatching') ?? null;
  const pensandoDesde = useSince(thinking);
  const escribiendoDesde = useSince(streaming);

  // ── El plan ────────────────────────────────────────────────────────────
  const pasos: Paso[] = [];
  pasos.push({
    id: 'entender',
    label: t('beta.tasks.plan.understand'),
    estado: thinking && !hayAgentes ? 'running' : 'done',
    startedAt: pensandoDesde ?? undefined,
  });
  if (hayAgentes) {
    for (const a of agentes) {
      pasos.push({
        id: a.id,
        label: a.taskDescription || AGENT_METADATA[a.agentType].label,
        estado: estadoDeAgente(a),
        startedAt: a.startedAt,
        sub: t('beta.tasks.workingAs', { agent: AGENT_METADATA[a.agentType].label }),
      });
    }
  } else {
    pasos.push({ id: 'agentes', label: t('beta.tasks.plan.consult'), estado: streaming ? 'done' : 'pending' });
  }
  pasos.push({
    id: 'redactar',
    label: t('beta.tasks.plan.write'),
    estado: streaming ? 'running' : 'pending',
    startedAt: escribiendoDesde ?? undefined,
  });

  const enCurso = pasos.find((p) => p.estado === 'running') ?? null;
  const hechos = pasos.filter((p) => p.estado === 'done' || p.estado === 'failed').length;
  const ms = useElapsed(enCurso?.startedAt ?? agenteEnCurso?.startedAt ?? pensandoDesde, Boolean(enCurso));

  const visible = thinking || hayAgentes || streaming;
  if (!visible) return null;

  return (
    <div
      className={cn(
        'w-full border-b border-surface-muted',
        'animate-in fade-in slide-in-from-bottom-1 duration-200',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2 text-left',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-xl'
        )}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <ChatOrb size={14} label={null} />
        </span>
        <span className="min-w-0 flex-1 truncate font-body text-[13.5px] font-medium text-fg">
          {enCurso?.label ?? t('beta.tasks.finishing')}
        </span>
        <span className="shrink-0 border-l border-border pl-3 font-mono text-[12px] tabular-nums text-fg-subtle">
          {formatElapsed(ms)}
        </span>
        <span className="shrink-0 font-body text-[13px] tabular-nums text-fg-muted">
          {hechos} / {pasos.length}
        </span>
        <CaretDown
          size={14}
          className={cn('shrink-0 text-fg-subtle transition-transform duration-200', abierto && 'rotate-180')}
        />
      </button>

      {abierto && (
        <div className="border-t border-surface-muted px-4 pb-3 pt-2.5">
          <p className="mb-2 font-body text-[12.5px] text-fg-subtle">{t('beta.tasks.progress')}</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {pasos.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center">
                  <Glifo estado={p.estado} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'line-clamp-2 font-body text-[13.5px]',
                      p.estado === 'running' ? 'text-fg' : p.estado === 'done' ? 'text-fg-muted' : 'text-fg-subtle'
                    )}
                  >
                    {p.label}
                  </span>
                  {p.estado === 'running' && p.sub && (
                    <span className="block font-body text-[12px] text-fg-subtle">{p.sub}</span>
                  )}
                </span>
                {p.estado === 'running' && (
                  <span className="shrink-0 border-l border-border pl-3 font-mono text-[11.5px] tabular-nums text-fg-subtle">
                    {formatElapsed(ms)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
