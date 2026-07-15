/**
 * Agenda interna — contrato de tipos (v6-06, frontend-first).
 *
 * Una sola vista que agrega los eventos que el sistema ya conoce (visitas, firmas
 * pendientes, vencimientos de contrato, seguimientos, inspecciones) junto con las
 * tareas que crea el usuario, vinculadas a un contrato, propiedad o tercero.
 * La agregación autoritativa de eventos y los recordatorios los hará el motor (M1);
 * la UI se construye contra estos tipos con estado vacío honesto — NO hay data falsa.
 */

export type EventoTipo =
  | 'visita'
  | 'firma_pendiente'
  | 'vencimiento_contrato'
  | 'seguimiento'
  | 'inspeccion'
  | 'tarea';

/** De dónde nace el evento: derivado por el sistema o creado por el usuario. */
export type EventoOrigen = 'sistema' | 'usuario';

export type EventoEstado = 'pendiente' | 'completado' | 'vencido' | 'cancelado';

/** A qué entidad del CRM/ERP se ata el evento o la tarea (AGEN-02). */
export type EventoVinculoTipo = 'contrato' | 'propiedad' | 'tercero' | 'pqrs';

/** Un evento de la agenda (del sistema o una tarea del usuario). */
export interface EventoAgenda {
  id: string;
  tipo: EventoTipo;
  origen: EventoOrigen;        // 'sistema' (derivado, AGEN-01) | 'usuario' (tarea, AGEN-02)
  estado: EventoEstado;
  titulo: string;
  descripcion?: string;
  fecha: string;               // ISO — fecha/hora del evento
  vinculoTipo?: EventoVinculoTipo;  // tarea ligada a contrato/propiedad/tercero (AGEN-02)
  vinculoId?: string;
  vinculoLabel?: string;
  responsableId?: string;
  responsableNombre?: string;
}

/** Conteos por tipo de evento para el resumen de la agenda. */
export interface ResumenAgenda {
  total: number;
  visitas: number;
  firmasPendientes: number;
  vencimientos: number;
  seguimientos: number;
  inspecciones: number;
  tareas: number;
}

/** Contrato del listado que el motor (M1) devolverá. */
export interface AgendaListResponse {
  resumen: ResumenAgenda;
  eventos: EventoAgenda[];
  total: number;
}

export const RESUMEN_AGENDA_VACIO: ResumenAgenda = {
  total: 0,
  visitas: 0,
  firmasPendientes: 0,
  vencimientos: 0,
  seguimientos: 0,
  inspecciones: 0,
  tareas: 0,
};
