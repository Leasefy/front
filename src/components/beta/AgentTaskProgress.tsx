'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { Collapse, motionDuration, motionEase } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { TurnStep } from '@/lib/types/beta-chat';
import type { LecturaDelTurno } from '@/lib/agentes/agente-que-habla';
import { nombreDelAgente, type IdDeAgente } from '@/lib/agentes/equipo';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { estadoDelTurno, GlifoPaso, ListaDePasos, useTextoPaso } from './turn-steps';
import { agenteDelDespacho } from '@/lib/agentes/equipo';
import { conNombreDelEquipo, pasoEnCurso, type PensamientoEnVivo } from '@/lib/chat/pensamiento';
import { PensamientoDelTurno, RelojDelTurno } from './PensamientoDelTurno';

interface AgentTaskProgressProps {
  /** Los pasos del turno en curso, en orden. Vacío = no hay turno. */
  steps: TurnStep[];
  /** La lectura del turno (02-10): el orbe de quien trabaja y las delegaciones. */
  turno?: LecturaDelTurno | null;
  /**
   * El pensamiento en vivo (02-10), cuando el micro lo cuenta: entonces la
   * franja dice el paso que corre y el tiempo, y al abrirse muestra la misma
   * lista que el hilo. Sin él, los pasos de siempre.
   */
  pensamiento?: PensamientoEnVivo | null;
  onAbrirEquipo?: (id: IdDeAgente) => void;
  className?: string;
}

/**
 * AgentTaskProgress — la franja del turno pegada ARRIBA del compositor (dentro
 * de su caja), para seguir el avance aunque la tarjeta del hilo haya quedado
 * fuera de la vista. Una línea: el orbe de quien trabaja (o el glifo del paso),
 * lo que hace ahora y «Paso 2 de 3»; al tocarla despliega todos los pasos
 * (también los que faltan), con las mismas filas que la tarjeta del hilo.
 *
 * La lista ya no se arma acá (Nico, 27-08: «quiero que muestre según el
 * contexto las diferentes tareas»): viene del hook, con los eventos REALES.
 */
export function AgentTaskProgress({ steps, turno, pensamiento, onAbrirEquipo, className }: AgentTaskProgressProps) {
  if (pensamiento && pensamiento.pasos.length > 0) {
    return <FranjaDelPensamiento pensamiento={pensamiento} className={className} />;
  }
  return <FranjaDeLosPasos steps={steps} turno={turno} onAbrirEquipo={onAbrirEquipo} className={className} />;
}

/**
 * La franja con el pensamiento en vivo: el paso que corre (con el orbe del
 * especialista si es uno) y el tiempo; al tocarla, la lista entera.
 */
function FranjaDelPensamiento({ pensamiento, className }: { pensamiento: PensamientoEnVivo; className?: string }) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const vivo = pasoEnCurso(pensamiento.pasos);
  const ultimo = pensamiento.pasos[pensamiento.pasos.length - 1]!;
  const paso = vivo ?? ultimo;
  const agente = paso.fase === 'despacho' ? agenteDelDespacho(paso.agente) : null;
  const texto = conNombreDelEquipo(paso.actividad ?? paso.texto, paso.agente, t);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className={cn('w-full overflow-hidden border-b border-border-faint', className)}
      data-testid="franja-del-turno"
      data-pensamiento
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {agente ? (
            <OrbeDeAgente agente={agente} estado={vivo ? 'trabajando' : 'listo'} tamano={18} decorativo />
          ) : (
            <GlifoPaso estado={vivo ? 'running' : paso.estado === 'fallo' ? 'failed' : 'done'} />
          )}
        </span>
        <span
          key={texto}
          className="min-w-0 flex-1 truncate font-body text-[13.5px] font-medium text-fg animate-in fade-in duration-slow motion-reduce:animate-none"
        >
          {texto}
        </span>
        <RelojDelTurno inicio={pensamiento.inicio} fin={pensamiento.fin} />
        <CaretDown
          size={14}
          aria-hidden
          className={cn('shrink-0 text-fg-subtle transition-transform duration-slow ease-enter', abierto && 'rotate-180')}
        />
      </button>
      <Collapse open={abierto}>
        <div className="max-h-[40vh] overflow-y-auto overscroll-contain px-4 pb-1 pt-1 sm:px-5" data-lenis-prevent>
          <PensamientoDelTurno pasos={pensamiento.pasos} vivo anunciar={false} />
        </div>
      </Collapse>
    </motion.div>
  );
}

/** La franja de siempre, con los pasos fijos (un micro que no cuenta su pensamiento). */
function FranjaDeLosPasos({
  steps,
  turno,
  onAbrirEquipo,
  className,
}: Omit<AgentTaskProgressProps, 'pensamiento'>) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const { enCurso, fallidos, actual, total } = estadoDelTurno(steps);
  const { label } = useTextoPaso(enCurso ?? steps[0] ?? { id: '-', kind: 'entender', status: 'pending' });

  if (steps.length === 0) return null;

  const especialista =
    turno && turno.hablaAhora.id !== turno.orquestador.agente.id && enCurso ? turno.hablaAhora : null;
  // El mismo título que la tarjeta del hilo: lo que hace ahora o, si el
  // especialista no avisó nada todavía, «Laura está trabajando».
  const texto = enCurso
    ? enCurso.actividad ||
      (enCurso.kind === 'agente' && especialista
        ? t('agentes.orbe.trabajando', { nombre: nombreDelAgente(especialista, t) })
        : label)
    : fallidos > 0
      ? t('beta.tasks.unoFallo')
      : t('beta.tasks.finishing');

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className={cn('w-full overflow-hidden border-b border-border-faint', className)}
      data-testid="franja-del-turno"
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {especialista ? (
            <OrbeDeAgente agente={especialista} estado="trabajando" tamano={20} decorativo />
          ) : (
            <GlifoPaso estado={enCurso ? 'running' : fallidos > 0 ? 'failed' : 'done'} />
          )}
        </span>
        <span
          key={texto}
          className="min-w-0 flex-1 truncate font-body text-[13.5px] font-medium text-fg animate-in fade-in duration-slow motion-reduce:animate-none"
        >
          {texto}
        </span>
        <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-fg-muted">
          {t('beta.tasks.pasoDe', { n: actual, total })}
        </span>
        <CaretDown
          size={14}
          aria-hidden
          className={cn('shrink-0 text-fg-subtle transition-transform duration-slow ease-enter', abierto && 'rotate-180')}
        />
      </button>

      <Collapse open={abierto}>
        <div className="max-h-[40vh] overflow-y-auto overscroll-contain px-4 pb-1 pt-1 sm:px-5" data-lenis-prevent>
          <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            {t('beta.tasks.progress')}
          </p>
          <ListaDePasos steps={steps} turno={turno} onAbrirEquipo={onAbrirEquipo} />
        </div>
      </Collapse>
    </motion.div>
  );
}
