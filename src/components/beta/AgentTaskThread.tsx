'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { Collapse, motionDuration, motionEase } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { TurnStep } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { LecturaDelTurno } from '@/lib/agentes/agente-que-habla';
import { nombreDelAgente, type IdDeAgente } from '@/lib/agentes/equipo';
import { NOMBRE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { estadoDelTurno, iconoDelPaso, ListaDePasos, useTextoPaso } from './turn-steps';

interface AgentTaskThreadProps {
  /** Pasos del turno. En la lista van los que ya ocurrieron; el contador cuenta todos. */
  steps: TurnStep[];
  /**
   * La lectura del turno (`leerElTurno`, 02-10): quién trabaja ahora y a quién
   * le pasó el trabajo el orquestador. Con ella la tarjeta lleva el orbe del
   * que actúa y cada especialista es una delegación en la lista.
   */
  turno?: LecturaDelTurno | null;
  /** Abre «El equipo» en el agente tocado. */
  onAbrirEquipo?: (id: IdDeAgente) => void;
  className?: string;
}

/**
 * AgentTaskThread — la ejecución del turno, EN el hilo (Nico, 02-10-2026:
 * «esas cards de los subagentes deberían verse mucho más bonitas, más
 * hermosas»).
 *
 * Va debajo de la cabecera del turno (el orbe del orquestador, «Ori está
 * pensando») en el lugar de la respuesta que se está armando:
 * - el encabezado dice en presente qué se hace AHORA, con el orbe de quien lo
 *   hace (el especialista que trabaja o el orquestador) y «Paso 2 de 4»;
 * - una barra fina que avanza con los pasos (`scaleX`, no `width`);
 * - la lista de pasos con su riel; cada especialista es una delegación
 *   («Ori → Laura», la tarea, lo que hizo). Se pliega con `Collapse`; arranca
 *   abierta, porque ver qué hace es la gracia (Nico, 27-08: «debemos mostrar
 *   qué está haciendo y pensando»).
 *
 * Al terminar la reemplaza la respuesta; la delegación queda resumida en una
 * línea arriba de ella (`ResumenDelTurno`).
 */
export function AgentTaskThread({ steps, turno, onAbrirEquipo, className }: AgentTaskThreadProps) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(true);
  const visibles = steps.filter((p) => p.status !== 'pending');
  const { enCurso, hechos, fallidos, actual, total } = estadoDelTurno(steps);
  const activo = enCurso ?? visibles[visibles.length - 1] ?? steps[0];
  const { label } = useTextoPaso(activo ?? { id: '-', kind: 'entender', status: 'pending' });

  if (visibles.length === 0 || !activo) return null;

  const trabajando = !!enCurso;
  // Quién actúa ahora: el especialista que corre o, si no, el orquestador.
  const quien = turno?.hablaAhora ?? null;
  const esEspecialista = !!quien && quien.id !== turno?.orquestador.agente.id;
  const nombreQuien = quien ? nombreDelAgente(quien, t) : null;
  const especialista = activo.agentType ? AGENT_METADATA[activo.agentType]?.label : null;
  const titulo = enCurso
    ? enCurso.actividad ||
      (enCurso.kind === 'agente' && esEspecialista && nombreQuien
        ? t('agentes.orbe.trabajando', { nombre: nombreQuien })
        : label)
    : fallidos > 0
      ? t('beta.tasks.unoFallo')
      : t('beta.tasks.finishing');
  const bajada =
    esEspecialista && nombreQuien && trabajando
      ? t('agentes.turno.llamoA', { orquestador: NOMBRE_DEL_ORQUESTADOR, nombre: nombreQuien })
      : !turno && especialista
        ? t('beta.tasks.especialista', { agent: especialista })
        : null;
  const avance = total > 0 ? hechos / total : 0;
  const Icono = iconoDelPaso(activo);

  return (
    <div
      className={cn(
        'chat-tarjeta-del-turno min-w-0 overflow-hidden rounded-[20px] border border-border bg-surface',
        'shadow-[0_1px_2px_rgba(20,19,15,0.04)]',
        className
      )}
      data-testid="ejecucion-del-turno"
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 pb-2.5 pt-3 text-left transition-colors duration-fast hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {/* Quién lo hace ahora: el orbe del especialista que trabaja. Cuando
            lo hace el orquestador (entender, cartera, redactar) va el ícono del
            paso: su orbe ya está arriba, en la cabecera del turno. */}
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center">
          {quien && esEspecialista ? (
            <OrbeDeAgente agente={quien} estado="trabajando" tamano={26} decorativo />
          ) : (
            <span
              className={cn(
                'relative flex size-7 items-center justify-center rounded-full',
                fallidos > 0 && !trabajando ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary',
                trabajando && 'chat-avatar-trabajando'
              )}
            >
              <Icono size={14} weight="bold" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            key={titulo}
            className="block truncate font-body text-[14.5px] font-medium text-fg animate-in fade-in slide-in-from-bottom-1 duration-slow motion-reduce:animate-none"
          >
            {titulo}
          </span>
          {bajada && (
            <span className="mt-0.5 block truncate font-body text-[12.5px] text-fg-muted">{bajada}</span>
          )}
        </span>
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 font-mono text-[11.5px] tabular-nums text-fg-muted">
          {t('beta.tasks.pasoDe', { n: actual, total })}
        </span>
        <CaretDown
          size={14}
          aria-hidden
          className={cn('shrink-0 text-fg-subtle transition-transform duration-slow ease-enter', abierto && 'rotate-180')}
        />
      </button>

      {/* Barra fina del avance: crece con cada paso (scaleX, no width); mientras trabaja, un brillo la recorre. */}
      <div aria-hidden className="mx-4 h-[3px] overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className={cn('h-full w-full origin-left rounded-full', fallidos > 0 ? 'bg-danger' : 'bg-primary', trabajando && 'chat-barra-viva')}
          initial={false}
          animate={{ scaleX: Math.max(avance, trabajando ? 0.06 : 0) }}
          transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
        />
      </div>

      <Collapse open={abierto} className="px-4 pb-1.5 pt-3.5">
        <ListaDePasos steps={steps} soloOcurridos turno={turno} onAbrirEquipo={onAbrirEquipo} />
      </Collapse>
      {!abierto && <div className="h-3" aria-hidden />}
    </div>
  );
}
