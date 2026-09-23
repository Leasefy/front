import { apiClient } from './client';

/**
 * 🔴 LA BITÁCORA DE MOVIMIENTOS (22-09-2026).
 *
 * Nico: «cada uno de los features debería tener bitácora de uso/movimiento, del
 * usuario que haga algo, su rol, etc., porque eso es muy importante y debe estar
 * en todo lado».
 *
 * Las filas las escribe el back SOLO, después de cada acción del panel
 * (`src/inmobiliaria/movimientos/` del back). Esto es de SÓLO LECTURA: no hay
 * forma de escribir ni de borrar una fila desde una pantalla.
 *
 * No reemplaza a la bitácora de PLATA (`bitacora.service.ts`): ésa guarda el
 * porqué y el monto de lo que movió plata; ésta guarda quién, con qué rol, qué,
 * sobre qué y con qué resultado, en todo el producto.
 */

export interface Movimiento {
  id: string;
  fecha: string;
  actor: {
    userId: string | null;
    nombre: string | null;
    email: string | null;
    /** El rol que tenía AL ACTUAR (`ADMIN`, `CONTADOR`…), copiado en la fila. */
    rol: string | null;
  };
  metodo: string;
  ruta: string;
  modulo: string;
  /** En español y en pasado: «Aprobó el lote de giros». */
  accion: string;
  recurso: { tipo: string; id: string | null } | null;
  /** El código HTTP. 4xx = negado (un intento sin permiso también queda). */
  resultado: number;
  duracionMs: number | null;
  /** Lo enviado, con todo campo fuera de la lista blanca como «redactado». */
  resumen: Record<string, unknown> | null;
  ip: string | null;
  agente: string | null;
}

export interface PaginaDeMovimientos {
  /** `false` = falta la migración: la bitácora todavía no guarda nada. */
  disponible: boolean;
  motivo: string | null;
  total: number;
  pagina: number;
  porPagina: number;
  resumen: { negados: number; errores: number; personas: number };
  filas: Movimiento[];
}

export interface OpcionesDeMovimientos {
  disponible: boolean;
  personas: { userId: string; nombre: string | null; email: string | null }[];
  roles: string[];
  modulos: string[];
}

export interface MovimientosDelRecurso {
  disponible: boolean;
  motivo: string | null;
  filas: Movimiento[];
}

export type ResultadoDelMovimiento = 'exito' | 'negado' | 'error';

export interface FiltrosDeMovimientos {
  usuario?: string;
  rol?: string;
  modulo?: string;
  recursoTipo?: string;
  recursoId?: string;
  /** `YYYY-MM-DD`, día de Bogotá, inclusive. */
  desde?: string;
  hasta?: string;
  resultado?: ResultadoDelMovimiento;
  pagina?: number;
  porPagina?: number;
}

const BASE = '/inmobiliaria/movimientos';

export const movimientosApi = {
  listar(filtros: FiltrosDeMovimientos = {}): Promise<PaginaDeMovimientos> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    return apiClient.get<PaginaDeMovimientos>(`${BASE}?${q.toString()}`);
  },

  opciones(): Promise<OpcionesDeMovimientos> {
    return apiClient.get<OpcionesDeMovimientos>(`${BASE}/opciones`);
  },

  /**
   * Los movimientos de UN recurso, para la sección «Movimientos» de su cajón.
   * `tipo` es el tipo canónico del back (`lote`, `dispersion`, `egreso`…).
   */
  delRecurso(tipo: string, id: string): Promise<MovimientosDelRecurso> {
    return apiClient.get<MovimientosDelRecurso>(
      `${BASE}/recurso/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`,
    );
  },
};
