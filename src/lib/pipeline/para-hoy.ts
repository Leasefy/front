/**
 * «Para hoy» de Prospección (ronda 18 de la revisión, 22-10-2026): la pregunta de la pantalla es
 * «¿a quién tengo que mover hoy?». Antes la respuesta —las visitas vencidas— estaba en la 2.ª de 9
 * columnas, fuera de la pantalla a 390. Esta regla elige a quién poner arriba:
 *   · los que tienen la próxima acción vencida (primero, la más vieja);
 *   · los que la tienen para hoy;
 *   · los que llevan 7 días o más en la etapa sin ninguna acción con fecha.
 * Los cerrados (arrendado o perdido) nunca entran.
 */
import type { PipelineItem } from '@/lib/types/inmobiliaria';
import { diaDeLaProximaAccion } from '@/lib/pipeline/proxima-accion';

export const DIAS_SIN_MOVER = 7;

export type PorQueEsParaHoy = 'vencida' | 'hoy' | 'quieto';

export interface PendienteDeHoy {
  item: PipelineItem;
  porQue: PorQueEsParaHoy;
  /** `AAAA-MM-DD` de la acción (vencida u hoy), o `null` si está quieto sin acción. */
  dia: string | null;
}

const CERRADAS = new Set(['completed', 'lost']);

export function paraHoy(items: readonly PipelineItem[], hoy: string): PendienteDeHoy[] {
  const lista: PendienteDeHoy[] = [];
  for (const item of items) {
    if (CERRADAS.has(item.stage)) continue;
    const dia = diaDeLaProximaAccion(item.nextActionDate);
    if (dia !== null && dia < hoy) lista.push({ item, porQue: 'vencida', dia });
    else if (dia === hoy) lista.push({ item, porQue: 'hoy', dia });
    else if (dia === null && item.daysInStage >= DIAS_SIN_MOVER) lista.push({ item, porQue: 'quieto', dia: null });
  }
  const peso: Record<PorQueEsParaHoy, number> = { vencida: 0, hoy: 1, quieto: 2 };
  return lista.sort(
    (a, b) =>
      peso[a.porQue] - peso[b.porQue] ||
      (a.dia ?? '').localeCompare(b.dia ?? '') ||
      b.item.daysInStage - a.item.daysInStage,
  );
}
