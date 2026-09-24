'use client';

import { cn } from '@/lib/utils';
import type { TurnStep } from '@/lib/types/beta-chat';
import { GlifoPaso, LineaDeActividad, useActividadPaso, useTextoPaso } from './turn-steps';

function TaskRow({ step, esUltima }: { step: TurnStep; esUltima: boolean }) {
  const { label, detail } = useTextoPaso(step);
  const actividad = useActividadPaso(step, detail);
  const corriendo = step.status === 'running';
  const fallo = step.status === 'failed';

  return (
    <li
      className={cn('relative flex gap-3', step.kind === 'herramienta' && 'pl-6')}
      data-estado={step.status}
    >
      {/* Riel vertical que une las filas — el «árbol» de Manus */}
      {!esUltima && (
        <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-4px)] w-px bg-border" />
      )}

      <span className="relative z-10 mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center">
        <GlifoPaso estado={step.status} />
      </span>

      <div className={cn('min-w-0 flex-1', corriendo ? 'pb-3' : 'pb-2')}>
        {/* Sin reloj (Nico, 23-09: «no tiene sentido dejarlo ahí»). El activo
            puede ocupar dos líneas; uno terminado colapsa a UNA, con el resto
            en el `title`: ya pasó, lo que importa es lo que está pasando. */}
        <span
          title={[label, !corriendo && !fallo ? detail : null].filter(Boolean).join(' — ')}
          className={cn(
            'block font-body text-[14px] leading-snug',
            corriendo ? 'line-clamp-2 font-medium text-fg' : 'truncate',
            fallo ? 'text-fg' : !corriendo && 'text-fg-muted'
          )}
        >
          {label}
        </span>

        {actividad && <LineaDeActividad texto={actividad} avance={step.avance} className="mt-0.5" />}

        {/* El porqué de un fallo sí se queda a la vista: es lo que hay que leer. */}
        {fallo && detail && (
          <p title={detail} className="mt-0.5 line-clamp-2 font-body text-[13.5px] text-danger">
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
 * atan al chat y se ve hermoso». Filas planas con glifo de estado, la tarea
 * y un riel que las une; se lee como parte de lo que dice el asistente, no
 * como un widget aparte. El activo gira y dice qué hace (ver `turn-steps`).
 *
 * Acá va lo que YA pasó o está pasando. Lo que falta se ve en el panel del
 * compositor: en el hilo, una lista de futuros es ruido.
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
