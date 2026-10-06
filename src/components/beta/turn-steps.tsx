'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowsLeftRight,
  Bank,
  CaretDown,
  ChartBar,
  ChatCircle,
  Check,
  CurrencyDollar,
  FileText,
  FunnelSimple,
  HandPointing,
  MagnifyingGlass,
  PencilSimpleLine,
  Scales,
  Wallet,
  Wrench,
  X,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Collapse, Progress, motionDuration, motionEase } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentType, TurnStep } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { Delegacion, LecturaDelTurno } from '@/lib/agentes/agente-que-habla';
import { nombreDelAgente, type IdDeAgente } from '@/lib/agentes/equipo';
import { NOMBRE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';

/**
 * Piezas compartidas por las DOS vistas de los pasos del turno: la tarjeta en
 * el hilo (`AgentTaskThread`) y la franja pegada al compositor
 * (`AgentTaskProgress`). Las dos leen el mismo `TurnStep[]` que produce el
 * hook con los eventos del backend, así que nunca se contradicen.
 *
 * ── Nico, 23-09 ─────────────────────────────────────────────────────────────
 * «Se queda ahí sólo con un texto y sin cargas, no se sabe si sí está
 * funcionando», y del reloj: «no tiene sentido dejarlo ahí». Por eso el paso
 * activo gira y dice en presente qué hace; los terminados colapsan a una
 * línea; sin reloj.
 *
 * ── Nico, 02-10 ─────────────────────────────────────────────────────────────
 * «Esas cards de los subagentes deberían verse mucho más bonitas». Cada estado
 * tiene su glifo en un círculo (en espera: aro vacío; trabajando: aro cobalto
 * que gira y respira; listo: ✓ que aparece con un rebote corto; falló: ✕ en
 * rojo suave), el especialista lleva su ícono, y el avance se dice «1 de 2».
 *
 * ── El equipo (02-10, commit `27a3b2b8`) ────────────────────────────────────
 * Con la lectura del turno (`leerElTurno`), el paso de un especialista es una
 * DELEGACIÓN: su orbe en lugar del glifo, «Ori → Laura», la tarea mientras
 * trabaja (o su resumen al terminar) y «Lo que hizo · N» con sus herramientas
 * colgadas de él. Las herramientas ya no van sueltas en la lista.
 */

/** Ícono del especialista (el mismo nombre que usa `AGENT_METADATA`). */
const ICONO_DEL_AGENTE: Record<string, Icon> = {
  CurrencyDollar,
  FileText,
  ChartBar,
  FunnelSimple,
  Scales,
  ArrowsLeftRight,
  Bank,
  Wrench,
  ChatCircle,
};

/** Ícono de cada tipo de paso que no es un especialista. */
const ICONO_DEL_TIPO: Record<TurnStep['kind'], Icon> = {
  entender: MagnifyingGlass,
  cartera: Wallet,
  agente: ChartBar,
  herramienta: Wrench,
  propuesta: HandPointing,
  redactar: PencilSimpleLine,
};

export function iconoDelPaso(step: Pick<TurnStep, 'kind' | 'agentType'>): Icon {
  if (step.agentType) {
    const nombre = AGENT_METADATA[step.agentType]?.icon;
    if (nombre && ICONO_DEL_AGENTE[nombre]) return ICONO_DEL_AGENTE[nombre];
  }
  return ICONO_DEL_TIPO[step.kind] ?? MagnifyingGlass;
}

export function iconoDelAgente(agente: AgentType): Icon {
  return ICONO_DEL_AGENTE[AGENT_METADATA[agente]?.icon ?? ''] ?? ChartBar;
}

/** El glifo de estado, siempre en un círculo de 20 px. */
export function GlifoPaso({ estado }: { estado: TurnStep['status']; size?: number }) {
  if (estado === 'running') {
    return (
      <span
        aria-hidden
        data-testid="paso-girando"
        className="chat-paso-girando relative flex size-5 items-center justify-center rounded-full"
      >
        <span className="size-1.5 rounded-full bg-primary" />
      </span>
    );
  }
  if (estado === 'done') {
    return (
      <span aria-hidden className="chat-paso-listo flex size-5 items-center justify-center rounded-full bg-success-soft text-success">
        <Check size={11} weight="bold" />
      </span>
    );
  }
  if (estado === 'failed') {
    return (
      <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-danger-soft text-danger">
        <X size={11} weight="bold" />
      </span>
    );
  }
  return <span aria-hidden className="block size-5 rounded-full border-[1.5px] border-dashed border-border-strong" />;
}

/** Traduce el paso: el texto del backend manda; la clave i18n es el respaldo. */
export function useTextoPaso(step: TurnStep): { label: string; detail: string | null } {
  const { t } = useI18n();
  const nombreAgente = step.agentType ? AGENT_METADATA[step.agentType].label : '';
  const base =
    step.label ||
    (step.labelKey ? t(step.labelKey, nombreAgente ? { agent: nombreAgente } : undefined) : '');
  const label = step.repeticiones && step.repeticiones > 1 ? `${base} ×${step.repeticiones}` : base;
  const detail = step.detail
    ? step.detail
    : step.detailKey
      ? t(step.detailKey, step.detailVars as Record<string, string | number> | undefined)
      : null;
  return { label, detail };
}

/**
 * Lo que el paso activo está haciendo ahora, en presente. `null` si el paso no
 * está corriendo. Si el micro no mandó `progreso`, cada tipo de paso dice lo
 * que siempre hace; el especialista, la tarea que le encargaron.
 */
export function useActividadPaso(step: TurnStep, detail: string | null): string | null {
  const { t } = useI18n();
  if (step.status !== 'running') return null;
  if (step.actividad) return step.actividad;
  if (step.kind === 'agente') return detail;
  if (step.kind === 'cartera' || step.kind === 'entender' || step.kind === 'redactar') {
    return t(`beta.tasks.activo.${step.kind}`);
  }
  return null;
}

/**
 * La línea viva del paso activo. `key` = el texto: cada aviso nuevo vuelve a
 * montar la línea y el fundido corre otra vez, así se VE que avanzó.
 */
export function LineaDeActividad({
  texto,
  avance,
  className,
}: {
  texto: string;
  avance?: TurnStep['avance'];
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span className={cn('block', className)}>
      <span
        key={texto}
        role="status"
        aria-live="polite"
        title={texto}
        className={cn(
          'block line-clamp-2 font-body text-[13.5px] leading-snug text-fg-muted',
          'animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none'
        )}
      >
        {texto}
      </span>
      {avance && (
        <Progress
          size="xs"
          value={avance.hechos}
          max={avance.total}
          label={t('beta.tasks.avance', { hechos: avance.hechos, total: avance.total })}
          className="mt-1.5 max-w-[240px]"
        />
      )}
    </span>
  );
}

export function ClasePaso(estado: TurnStep['status']): string {
  return cn(estado === 'running' ? 'text-fg' : estado === 'pending' ? 'text-fg-subtle' : 'text-fg-muted');
}

/** Una fila de la lista de pasos, con el riel que la une a la siguiente. */
function FilaDePaso({ step, esUltima }: { step: TurnStep; esUltima: boolean }) {
  const { label, detail } = useTextoPaso(step);
  const actividad = useActividadPaso(step, detail);
  const corriendo = step.status === 'running';
  const fallo = step.status === 'failed';

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className={cn('relative flex gap-3', step.kind === 'herramienta' && 'pl-6')}
      data-estado={step.status}
    >
      {!esUltima && (
        <span
          aria-hidden
          className={cn(
            'absolute left-[9.5px] top-[26px] h-[calc(100%-22px)] w-px',
            step.status === 'done' ? 'bg-success/30' : 'bg-border'
          )}
        />
      )}
      <span className="relative z-10 mt-[1px] shrink-0">
        <GlifoPaso estado={step.status} />
      </span>
      <div className={cn('min-w-0 flex-1', corriendo ? 'pb-3.5' : 'pb-2.5')}>
        {/* Sin reloj (Nico, 23-09). El activo puede ocupar dos líneas; uno
            terminado colapsa a UNA, con el resto en el `title`. */}
        <span
          title={[label, !corriendo && !fallo ? detail : null].filter(Boolean).join(' — ')}
          className={cn(
            'block font-body text-[14px] leading-snug',
            corriendo ? 'line-clamp-2 font-medium text-fg' : 'truncate',
            fallo ? 'text-fg' : !corriendo && ClasePaso(step.status)
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
    </motion.li>
  );
}

/** El estado del paso → el del orbe (mismo vocabulario que `leerElTurno`). */
const ESTADO_DEL_PASO = {
  pending: 'pensando',
  running: 'trabajando',
  done: 'listo',
  failed: 'fallo',
} as const;

/**
 * Una DELEGACIÓN en la lista de pasos (02-10): el orquestador le pasó el
 * trabajo a un especialista. Ocupa el lugar del paso `agente`, con el mismo
 * riel y el mismo ritmo que las demás filas, para que el turno se lea como UNA
 * historia: entendió → revisó la cartera → «Ori → Laura» → escribió.
 */
function FilaDeDelegacion({
  step,
  delegacion,
  esUltima,
  onAbrirEquipo,
}: {
  step: TurnStep;
  delegacion: Delegacion;
  esUltima: boolean;
  onAbrirEquipo?: (id: IdDeAgente) => void;
}) {
  const { t } = useI18n();
  const { detail } = useTextoPaso(step);
  const corriendo = step.status === 'running';
  const fallo = step.status === 'failed';
  const agente = delegacion.agente;
  const nombre = agente ? nombreDelAgente(agente, t) : AGENT_METADATA[step.agentType ?? 'reportes']?.label ?? delegacion.clave;
  // Lo que hizo se ve mientras trabaja (es lo que está pasando); al terminar
  // se pliega en «Lo que hizo · N».
  const [abierta, setAbierta] = useState<boolean | null>(null);
  const verPasos = abierta ?? corriendo;
  const actividad = corriendo ? step.actividad || delegacion.tarea || detail : null;
  // Cerrado, la línea de abajo es lo que CONTESTÓ (su resumen); si no lo
  // mandó, la tarea que le encargaron.
  const debajo = !corriendo && !fallo ? delegacion.resumen || delegacion.tarea : null;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className="relative flex gap-3"
      data-estado={step.status}
      data-testid="paso-delegacion"
      data-agente={agente?.id ?? delegacion.clave}
    >
      {!esUltima && (
        <span
          aria-hidden
          className={cn(
            'absolute left-[9.5px] top-[26px] h-[calc(100%-22px)] w-px',
            step.status === 'done' ? 'bg-success/30' : 'bg-border'
          )}
        />
      )}
      <span className="relative z-10 mt-[1px] shrink-0">
        {agente ? (
          <OrbeDeAgente agente={agente} estado={ESTADO_DEL_PASO[step.status]} tamano={20} decorativo />
        ) : (
          <GlifoPaso estado={step.status} />
        )}
      </span>
      <div className={cn('min-w-0 flex-1', corriendo ? 'pb-3.5' : 'pb-2.5')}>
        <span className={cn('flex flex-wrap items-center gap-x-1.5 font-body text-[14px] leading-snug', corriendo ? 'text-fg' : 'text-fg-muted')}>
          <span>{NOMBRE_DEL_ORQUESTADOR}</span>
          <ArrowRight size={11} aria-hidden className="text-fg-subtle" />
          {agente && onAbrirEquipo ? (
            <button
              type="button"
              onClick={() => onAbrirEquipo(agente.id)}
              className={cn(
                'rounded-full font-medium underline-offset-2 transition-colors duration-fast hover:underline',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                corriendo || fallo ? 'text-fg' : 'text-fg-muted hover:text-fg'
              )}
            >
              {nombre}
            </button>
          ) : (
            <span className={cn('font-medium', corriendo && 'text-fg')}>{nombre}</span>
          )}
          {corriendo && (
            <span className="text-fg-subtle">· {t('beta.tasks.trabajando')}</span>
          )}
        </span>
        {actividad && <LineaDeActividad texto={actividad} avance={step.avance} className="mt-0.5" />}
        {debajo && (
          <span title={debajo} className="mt-0.5 block line-clamp-2 font-body text-[13.5px] leading-snug text-fg-subtle">
            {debajo}
          </span>
        )}
        {fallo && (delegacion.error || detail) && (
          <p title={delegacion.error || detail || ''} className="mt-0.5 line-clamp-2 font-body text-[13.5px] text-danger">
            {delegacion.error || detail}
          </p>
        )}
        {delegacion.pasos.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setAbierta(!verPasos)}
              aria-expanded={verPasos}
              className="mt-1 inline-flex items-center gap-1 rounded-full font-body text-[12.5px] font-medium text-fg-muted transition-colors duration-fast hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('agentes.turno.loQueHizo')} · <span className="font-mono tabular-nums">{delegacion.pasos.length}</span>
              <CaretDown
                size={11}
                aria-hidden
                className={cn('transition-transform duration-slow ease-enter', verPasos && 'rotate-180')}
              />
            </button>
            <Collapse open={verPasos} className="pt-1.5">
              <ul className="m-0 list-none space-y-1 p-0">
                {delegacion.pasos.map((p, i) => (
                  <li key={`${p.texto}-${i}`} className="flex items-start gap-2 font-body text-[13px] leading-snug text-fg-muted">
                    <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <Check size={8} weight="bold" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      {p.texto}
                      {p.repeticiones && p.repeticiones > 1 ? (
                        <span className="font-mono tabular-nums text-fg-subtle"> ×{p.repeticiones}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Collapse>
          </>
        )}
      </div>
    </motion.li>
  );
}

/**
 * Las filas que se pintan: con la lectura del turno, cada paso `agente` lleva
 * su delegación (en orden, como las arma `leerElTurno`) y las herramientas de
 * un especialista se cuelgan de él en vez de ir sueltas.
 */
export function filasDeLosPasos(
  steps: TurnStep[],
  turno?: LecturaDelTurno | null
): Array<{ step: TurnStep; delegacion: Delegacion | null }> {
  const delegaciones = turno?.delegaciones ?? [];
  let k = 0;
  let hayDuena = false;
  const out: Array<{ step: TurnStep; delegacion: Delegacion | null }> = [];
  for (const step of steps) {
    if (step.kind === 'agente' && step.agentType && delegaciones.length > 0) {
      const d = delegaciones[k] ?? null;
      k += 1;
      hayDuena = hayDuena || !!d;
      out.push({ step, delegacion: d });
      continue;
    }
    // La herramienta ya está dentro de «Lo que hizo» de su especialista.
    if (step.kind === 'herramienta' && hayDuena) continue;
    out.push({ step, delegacion: null });
  }
  return out;
}

/** La lista de pasos (con riel). `soloOcurridos` esconde los que no empezaron. */
export function ListaDePasos({
  steps,
  soloOcurridos = false,
  turno,
  onAbrirEquipo,
}: {
  steps: TurnStep[];
  soloOcurridos?: boolean;
  /** La lectura del turno (`leerElTurno`): con ella los especialistas son delegaciones. */
  turno?: LecturaDelTurno | null;
  onAbrirEquipo?: (id: IdDeAgente) => void;
}) {
  const filas = filasDeLosPasos(steps, turno).filter((f) => !soloOcurridos || f.step.status !== 'pending');
  return (
    <ul className="m-0 list-none p-0">
      <AnimatePresence initial={false}>
        {filas.map(({ step, delegacion }, i) =>
          delegacion ? (
            <FilaDeDelegacion
              key={step.id}
              step={step}
              delegacion={delegacion}
              esUltima={i === filas.length - 1}
              onAbrirEquipo={onAbrirEquipo}
            />
          ) : (
            <FilaDePaso key={step.id} step={step} esUltima={i === filas.length - 1} />
          )
        )}
      </AnimatePresence>
    </ul>
  );
}

/**
 * Lo que dice el encabezado: el paso activo, «redactando» o «falló». Las
 * herramientas no cuentan como pasos («Paso 2 de 4» es lo que se ve en la
 * lista): son lo que hizo un especialista, dentro de su delegación.
 */
export function estadoDelTurno(todos: TurnStep[]) {
  const steps = todos.filter((p) => p.kind !== 'herramienta');
  // Si dos corren a la vez, manda el último que arrancó: es lo que pasa AHORA.
  const enCurso = [...steps].reverse().find((p) => p.status === 'running') ?? null;
  const hechos = steps.filter((p) => p.status === 'done' || p.status === 'failed').length;
  const fallidos = steps.filter((p) => p.status === 'failed').length;
  // El paso «actual» para el contador: el que corre, o el siguiente pendiente.
  const actual = enCurso ? steps.indexOf(enCurso) + 1 : Math.min(hechos + 1, steps.length);
  return { enCurso, hechos, fallidos, actual, total: steps.length };
}
