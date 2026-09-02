'use client';

import { Check, X, Clock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { TurnStep } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { ChatOrb } from './ChatOrb';
import { useElapsed, formatElapsed } from './useElapsed';

/**
 * Piezas compartidas por las DOS vistas de los pasos del turno: las filas en el
 * hilo (`AgentTaskThread`) y el panel pegado al compositor
 * (`AgentTaskProgress`). Antes cada una armaba su propia lista y se
 * contradecían; ahora las dos leen el mismo `TurnStep[]` que produce el hook
 * con los eventos del backend.
 */

export function GlifoPaso({ estado, size = 14 }: { estado: TurnStep['status']; size?: number }) {
  if (estado === 'running') return <ChatOrb size={size} label={null} />;
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

/** Reloj de un paso: vivo mientras corre, congelado en su duración al cerrar. */
export function useRelojPaso(step: TurnStep): string | null {
  const corriendo = step.status === 'running';
  const ms = useElapsed(step.startedAt, corriendo);
  if (!step.startedAt) return null;
  if (corriendo) return formatElapsed(ms);
  if (step.completedAt) return formatElapsed(step.completedAt.getTime() - step.startedAt.getTime());
  return null;
}

export function ClasePaso(estado: TurnStep['status']): string {
  return cn(
    estado === 'running' ? 'text-fg' : estado === 'pending' ? 'text-fg-subtle' : 'text-fg-muted'
  );
}
