'use client';

import { cn } from '@/lib/utils';
import type { TurnStep } from '@/lib/types/beta-chat';
import { GlifoPaso, useTextoPaso, useRelojPaso } from './turn-steps';

function TaskRow({ step, esUltima }: { step: TurnStep; esUltima: boolean }) {
  const { label, detail } = useTextoPaso(step);
  const reloj = useRelojPaso(step);

  return (
    <li className={cn('relative flex gap-3', step.kind === 'herramienta' && 'pl-6')}>
      {/* Riel vertical que une las filas — el «árbol» de Manus */}
      {!esUltima && (
        <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-4px)] w-px bg-border" />
      )}

      <span className="relative z-10 mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center">
        <GlifoPaso estado={step.status} />
      </span>

      <div className="min-w-0 flex-1 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          {/* Dos líneas como máximo: el orquestador manda como «tarea» un
              párrafo entero con todo el contexto, y en el hilo pesa como un
              mensaje más. Lo que sigue lo cuenta el title. */}
          <span
            title={label}
            className={cn(
              'line-clamp-2 font-body text-[14px] leading-snug',
              step.status === 'running' || step.status === 'failed' ? 'text-fg' : 'text-fg-muted'
            )}
          >
            {label}
          </span>
          {reloj && (
            <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-fg-subtle">{reloj}</span>
          )}
        </div>

        {detail && (
          <p
            title={detail}
            className={cn(
              'mt-0.5 line-clamp-2 font-body text-[12.5px]',
              step.status === 'failed' ? 'text-danger' : 'text-fg-subtle'
            )}
          >
            {detail}
          </p>
        )}
      </div>
    </li>
  );
}

interface AgentTaskThreadProps {
  /** Pasos del turno. Se muestran los que ya ocurrieron; lo pendiente vive en el panel. */
  steps: TurnStep[];
  className?: string;
}

/**
 * AgentTaskThread — la actividad, EN el hilo.
 *
 * ── Por qué (Nico, 2026-08-27) ────────────────────────────────────────────
 * «Mira cómo lo hace Manus: debemos mostrar qué está haciendo y pensando; lo
 * atan al chat y se ve hermoso». Filas planas con glifo de estado, la tarea,
 * un reloj y un riel que las une; se lee como parte de lo que dice el
 * asistente, no como un widget aparte.
 *
 * Acá va lo que YA pasó o está pasando. Lo que falta se ve en el panel del
 * compositor: en el hilo, una lista de futuros con relojes en cero es ruido.
 */
export function AgentTaskThread({ steps, className }: AgentTaskThreadProps) {
  const visibles = steps.filter((p) => p.status !== 'pending');
  if (visibles.length === 0) return null;

  return (
    <div className={cn('flex gap-3', className)}>
      <div className="w-6 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <ul className="m-0 list-none p-0">
          {visibles.map((step, i) => (
            <TaskRow key={step.id} step={step} esUltima={i === visibles.length - 1} />
          ))}
        </ul>
      </div>
    </div>
  );
}
