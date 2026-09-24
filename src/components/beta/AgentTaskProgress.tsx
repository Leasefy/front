'use client';

import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { TurnStep } from '@/lib/types/beta-chat';
import { ChatOrb } from './ChatOrb';
import { GlifoPaso, LineaDeActividad, useActividadPaso, useTextoPaso, ClasePaso } from './turn-steps';

interface AgentTaskProgressProps {
  /** Los pasos del turno en curso, en orden. Vacío = no hay turno. */
  steps: TurnStep[];
  className?: string;
}

function Fila({ step }: { step: TurnStep }) {
  const { label, detail } = useTextoPaso(step);
  const actividad = useActividadPaso(step, detail);
  const corriendo = step.status === 'running';
  const fallo = step.status === 'failed';

  // Sin reloj (Nico, 23-09). Terminados y pendientes en UNA línea; el activo
  // dice qué hace; el fallido, por qué.
  return (
    <li className={cn('flex items-start gap-3', step.kind === 'herramienta' && 'pl-6')} data-estado={step.status}>
      <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center">
        <GlifoPaso estado={step.status} size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          title={[label, !corriendo && !fallo ? detail : null].filter(Boolean).join(' — ')}
          className={cn(
            'block font-body text-[13.5px]',
            corriendo ? 'line-clamp-2 font-medium' : 'truncate',
            ClasePaso(step.status)
          )}
        >
          {label}
        </span>
        {actividad && <LineaDeActividad texto={actividad} avance={step.avance} className="mt-0.5" />}
        {fallo && detail && (
          <span className="mt-0.5 block line-clamp-2 font-body text-[13.5px] text-danger" title={detail}>
            {detail}
          </span>
        )}
      </span>
    </li>
  );
}

/**
 * Encabezado: lo que se está haciendo AHORA. Si el paso activo avisó qué hace
 * («Leyendo contratos…»), eso; si no, su nombre. Sin reloj (Nico, 23-09).
 */
function Encabezado({ step }: { step: TurnStep }) {
  const { label } = useTextoPaso(step);
  const texto = step.actividad || label;
  return (
    <span
      key={texto}
      className="min-w-0 flex-1 truncate font-body text-[13.5px] font-medium text-fg animate-in fade-in duration-300 motion-reduce:animate-none"
    >
      {texto}
    </span>
  );
}

/**
 * AgentTaskProgress — el plan del turno, fusionado con el compositor.
 *
 * ── Por qué así (Nico, 2026-08-27) ────────────────────────────────────────
 * «Dejaste solo como 3 tareas siempre y ya, nada inteligente; quiero que
 * muestre según el contexto las diferentes tareas».
 *
 * La lista ya no se arma acá. Viene del hook, que la construye con los eventos
 * REALES del turno: el `snapshot` (con las cifras de la agencia), cada
 * despacho con la tarea que el orquestador le escribió al especialista, el
 * resumen con que ese especialista contesta, y los pasos internos que el
 * backend reporte. Por eso preguntar por la cartera y pedir una cotización
 * muestran planes distintos: hacen cosas distintas.
 */
export function AgentTaskProgress({ steps, className }: AgentTaskProgressProps) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);

  if (steps.length === 0) return null;

  const enCurso = steps.find((p) => p.status === 'running') ?? null;
  const hechos = steps.filter((p) => p.status === 'done' || p.status === 'failed').length;

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
        {enCurso ? (
          <Encabezado step={enCurso} />
        ) : (
          <span className="min-w-0 flex-1 truncate font-body text-[13.5px] font-medium text-fg">
            {t('beta.tasks.finishing')}
          </span>
        )}
        <span className="shrink-0 font-body text-[13px] tabular-nums text-fg-muted">
          {hechos} / {steps.length}
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
            {steps.map((p) => (
              <Fila key={p.id} step={p} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
