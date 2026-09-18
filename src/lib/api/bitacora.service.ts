import { apiClient } from './client';

/**
 * 🔴 La bitácora de lo que MUEVE PLATA, «visible para el dueño de la
 * inmobiliaria» (Nico, 17/18-09-2026).
 *
 * Responde la pregunta que las columnas `anulado_*` de cada fila no podían
 * responder: «¿qué movió Juan esta semana?». Es de SÓLO LECTURA: las filas las
 * escriben las acciones, no una pantalla.
 */
export interface HuellaDePlata {
  id: string;
  accion: string;
  objetoTipo: string;
  objetoId: string | null;
  resumen: string;
  motivo: string | null;
  valorCop: number | null;
  actor: { userId: string | null; nombre: string | null; email: string | null };
  detalle: unknown;
  fecha: string;
}

export interface BitacoraDePlata {
  /** `false` = falta la migración: la bitácora todavía no guarda nada. */
  disponible: boolean;
  motivo: string | null;
  total: number;
  filas: HuellaDePlata[];
}

const BASE = '/inmobiliaria/bitacora';

export const bitacoraApi = {
  listar(filtros: { accion?: string; limite?: number } = {}): Promise<BitacoraDePlata> {
    const q = new URLSearchParams();
    if (filtros.accion) q.set('accion', filtros.accion);
    if (filtros.limite) q.set('limite', String(filtros.limite));
    const cola = q.toString();
    return apiClient.get<BitacoraDePlata>(cola ? `${BASE}?${cola}` : BASE);
  },

  acciones(): Promise<{ acciones: string[] }> {
    return apiClient.get<{ acciones: string[] }>(`${BASE}/acciones`);
  },
};
