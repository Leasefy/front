'use client';

import { Check, X, Clock } from '@phosphor-icons/react';
import { Progress, Spinner } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { TurnStep } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';

/**
 * Piezas compartidas por las DOS vistas de los pasos del turno: las filas en el
 * hilo (`AgentTaskThread`) y el panel pegado al compositor
 * (`AgentTaskProgress`). Antes cada una armaba su propia lista y se
 * contradecían; ahora las dos leen el mismo `TurnStep[]` que produce el hook
 * con los eventos del backend.
 *
 * ── Nico, 23-09 (con capturas del panel) ───────────────────────────────────
 * «Se queda ahí sólo con un texto y sin cargas, no se sabe si sí está
 * funcionando», y del reloj de la derecha («0:06»): «no tiene sentido dejarlo
 * ahí». Por eso:
 *   - el paso ACTIVO gira con el indicador de Cadence (el anillo `cadSpin` de
 *     `Spinner`/`WorkState`), no con el orbe de 14 px, que a ese tamaño se leía
 *     como un punto quieto;
 *   - debajo dice, en presente, qué está haciendo AHORA (`actividad`, del
 *     evento `progreso` del micro), y si no llegó nada todavía, lo que ese tipo
 *     de paso siempre hace — nunca una línea vacía;
 *   - los terminados colapsan a UNA línea (el detalle queda en el `title`);
 *   - sin reloj.
 */

export function GlifoPaso({ estado, size = 14 }: { estado: TurnStep['status']; size?: number }) {
  if (estado === 'running') {
    return <Spinner size="sm" aria-hidden className="text-primary" data-testid="paso-girando" />;
  }
  if (estado === 'done') return <Check size={size} weight="bold" className="text-success-700" />;
  if (estado === 'failed') return <X size={size} weight="bold" className="text-danger" />;
  return <Clock size={size} className="text-fg-subtle" />;
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
 * está corriendo. Si el micro no mandó `progreso` (uno viejo, o un paso que no
 * lo emite), cada tipo de paso dice lo que siempre hace; el especialista, la
 * tarea que le encargaron.
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
  return cn(
    estado === 'running' ? 'text-fg' : estado === 'pending' ? 'text-fg-subtle' : 'text-fg-muted'
  );
}
