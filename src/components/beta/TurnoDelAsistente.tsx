'use client';

import { useId, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ResponseType } from '@/lib/types/beta-chat';
import type { LecturaDelTurno } from '@/lib/agentes/agente-que-habla';
import { nombreDelAgente, type AgenteDelEquipo, type IdDeAgente } from '@/lib/agentes/equipo';
import { NOMBRE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { CabeceraDelTurno, DelegacionesDelTurno } from '@/components/agentes/TurnoDelEquipo';

/**
 * ══ LA RESPUESTA DEL ASISTENTE, CON SU EQUIPO (02-10-2026) ════════════════
 *
 * Nico: «el orquestador ES quien responde en el chat y le pasa el trabajo a
 * los especialistas; en cada respuesta se ve su orbe, a qué especialista
 * llamó, qué hizo cada uno y cómo lo pensó». Las piezas del equipo
 * (`src/components/agentes/TurnoDelEquipo.tsx`, commit `27a3b2b8`) se usan
 * tal cual; esto las acomoda al lenguaje del chat por dentro:
 *
 *   CabeceraDeLaRespuesta — el orbe y el nombre del orquestador (con su estado
 *                           mientras trabaja) y, a la derecha, el tipo de
 *                           respuesta en una etiqueta discreta.
 *   ResumenDelTurno       — en una respuesta ya cerrada, la delegación en UNA
 *                           línea («Ori le pasó el trabajo a Laura») que se
 *                           abre en el detalle de cada especialista.
 *
 * Mientras el turno corre, la delegación vive dentro de la tarjeta de los
 * pasos (`AgentTaskThread`), en su lugar de la historia.
 */

/** El orbe del orquestador, su nombre y su estado; a la derecha, el tipo de respuesta. */
export function CabeceraDeLaRespuesta({
  turno,
  tipo,
  onAbrirEquipo,
  className,
}: {
  turno: LecturaDelTurno;
  /** El tipo de la respuesta (`responseMeta.type`), si lo trae: va como etiqueta discreta. */
  tipo?: ResponseType | null;
  onAbrirEquipo?: (id: IdDeAgente) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex min-h-[34px] items-center justify-between gap-3', className)} data-testid="cabecera-de-la-respuesta">
      <CabeceraDelTurno turno={turno} onAbrirEquipo={onAbrirEquipo} />
      {tipo && turno.orquestador.estado === 'listo' && (
        <span
          className="shrink-0 animate-in fade-in duration-slow font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle motion-reduce:animate-none"
          data-testid="tipo-de-respuesta"
        >
          {tipo === 'actionable' ? t('beta.response.actionable') : t('beta.response.informative')}
        </span>
      )}
    </div>
  );
}

/** «Laura», «Laura y Cobri», «Laura, Cobri y Vinci» — con la conjunción del idioma. */
function listaDeNombres(nombres: string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(nombres);
  } catch {
    return nombres.join(', ');
  }
}

/**
 * La delegación de una respuesta ya cerrada, en UNA línea elegante: los orbes
 * de quienes ayudaron y «Ori le pasó el trabajo a Laura y Cobri». Al tocarla
 * se abre el detalle de cada uno (`DelegacionesDelTurno`: la tarea y lo que
 * contestó). Sin delegaciones no pinta nada.
 */
export function ResumenDelTurno({
  turno,
  onAbrirEquipo,
  className,
}: {
  turno: LecturaDelTurno;
  onAbrirEquipo?: (id: IdDeAgente) => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  if (turno.delegaciones.length === 0) return null;

  // Cada especialista una vez, en el orden en que entró.
  const unicos: AgenteDelEquipo[] = [];
  for (const d of turno.delegaciones) {
    if (d.agente && !unicos.some((a) => a.id === d.agente!.id)) unicos.push(d.agente);
  }
  const nombres = unicos.map((a) => nombreDelAgente(a, t));
  const fallidos = turno.delegaciones.filter((d) => d.estado === 'fallo' && d.agente);
  const texto = nombres.length
    ? t('beta.turno.lePasoElTrabajo', { orquestador: NOMBRE_DEL_ORQUESTADOR, nombres: listaDeNombres(nombres, locale) })
    : t('beta.turno.lePasoElTrabajoSinNombre', { orquestador: NOMBRE_DEL_ORQUESTADOR });

  return (
    <div className={cn('min-w-0', className)} data-testid="resumen-del-turno">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={id}
        className={cn(
          'group -ml-1 inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-left',
          'font-body text-[13px] text-fg-muted transition-colors duration-fast hover:bg-surface-hover hover:text-fg',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <span aria-hidden className="flex shrink-0 items-center -space-x-1.5">
          {unicos.slice(0, 4).map((a, i) => (
            <span key={a.id} className="relative rounded-full ring-2 ring-bg" style={{ zIndex: 10 - i }}>
              <OrbeDeAgente agente={a} tamano={18} quieto decorativo />
            </span>
          ))}
        </span>
        <span className="min-w-0 truncate">
          {texto}
          {fallidos.length > 0 && (
            <span className="text-fg-subtle">
              {' · '}
              {fallidos.length === 1
                ? t('agentes.orbe.fallo', { nombre: nombreDelAgente(fallidos[0].agente!, t) })
                : t('beta.turno.noPudieron', {
                    nombres: listaDeNombres(fallidos.map((d) => nombreDelAgente(d.agente!, t)), locale),
                  })}
            </span>
          )}
        </span>
        <CaretDown
          size={11}
          aria-hidden
          className={cn('shrink-0 text-fg-subtle transition-transform duration-slow ease-enter', abierto && 'rotate-180')}
        />
      </button>
      <Collapse open={abierto} id={id} className="pt-2">
        <DelegacionesDelTurno turno={turno} onAbrirEquipo={onAbrirEquipo} />
      </Collapse>
    </div>
  );
}
