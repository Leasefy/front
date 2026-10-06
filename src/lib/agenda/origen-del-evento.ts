import type { EventoAgenda } from '@/lib/api/agenda.types';

/**
 * AG-13 (QA del 04-10-2026): la tarea que creó el administrador le salía a la
 * asesora con origen «Tú». «Tú» sólo para quien la creó; a los demás, el
 * nombre de quien la creó. Lo que deriva el sistema sigue diciendo «Sistema».
 */
export function origenDelEvento(
  evento: Pick<EventoAgenda, 'tipo' | 'origen' | 'creadaPorId' | 'creadaPorNombre'>,
  miUserId: string | null | undefined,
  rotuloDelOrigen: (origen: EventoAgenda['origen']) => string,
): string {
  if (evento.tipo === 'tarea' && evento.creadaPorId) {
    if (miUserId && evento.creadaPorId === miUserId) return 'Tú';
    return evento.creadaPorNombre ?? 'Alguien del equipo';
  }
  return rotuloDelOrigen(evento.origen);
}
