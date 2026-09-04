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
  hora?: string;               // «HH:mm» cuando el evento la tiene (visitas, tareas con hora)
  estadoRaw?: string;          // estado subyacente (ej. visita PENDING/ACCEPTED) para acciones
  vinculoTipo?: EventoVinculoTipo;  // tarea ligada a contrato/propiedad/tercero (AGEN-02)
  vinculoId?: string;
  vinculoLabel?: string;
  responsableId?: string;
  responsableNombre?: string;
  /**
   * Modalidad de la visita (`IN_PERSON` | `VIRTUAL`). Sólo en `tipo: 'visita'`.
   * Es lo primero que necesita saber quien la atiende: si hay que ir a abrir el
   * inmueble o conectarse.
   */
  modalidad?: string;
  /** Cómo ubicar a quien visita. Sólo en `tipo: 'visita'`. */
  contactoTelefono?: string;
  contactoEmail?: string;
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

// ── Tareas propias (AGEN-02) ─────────────────────────────────────────────────

export type TareaVinculoTipo = 'CONTRATO' | 'PROPIEDAD' | 'TERCERO';
export type TareaEstado = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';

export interface CrearTareaInput {
  titulo: string;
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:mm, opcional */
  hora?: string;
  nota?: string;
  vinculoTipo?: TareaVinculoTipo;
  vinculoId?: string;
  vinculoLabel?: string;
  responsableUserId?: string;
}

export interface ActualizarTareaInput extends Partial<CrearTareaInput> {
  estado?: TareaEstado;
}

/** El id de la fila detrás de un evento `tarea-<uuid>`. */
export const tareaIdOf = (eventId: string) => eventId.replace(/^tarea-/, '');
