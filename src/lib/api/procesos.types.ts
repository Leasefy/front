/**
 * El centro de procesos — la forma de `GET /inmobiliaria/procesos` (back:
 * `src/inmobiliaria/procesos/procesos.service.ts#ProcesoVista`).
 */

export type EstadoDeProceso = 'EN_COLA' | 'CORRIENDO' | 'TERMINADO' | 'FALLO' | 'CANCELADO'

/** Los tipos que el centro conoce hoy. Un tipo nuevo del back se pinta con su nombre crudo. */
export type TipoDeProceso =
  | 'REPROCESAR_ASIENTOS'
  | 'ARCHIVO_DEL_LOTE'
  | 'EMISION_DE_FACTURAS'
  | 'MIGRACION_CONTRATOS'
  | 'MIGRACION_INMUEBLES'
  | 'EXPORTACION'
  | 'ENVIO_A_WOMPI'

export interface Proceso {
  id: string
  tipo: TipoDeProceso | string
  titulo: string
  estado: EstadoDeProceso
  hechos: number
  total: number | null
  /** 0–100, o `null` si no se sabe el total (barra indeterminada). */
  porcentaje: number | null
  mensaje: string | null
  lanzadoPor: { id: string | null; nombre: string | null; rol: string | null } | null
  esMio: boolean
  recurso: { tipo: string; id: string } | null
  archivo: {
    nombre: string
    tipo: string | null
    bytes: number | null
    venceAt: string | null
    vencido: boolean
  } | null
  sePuedeCancelar: boolean
  cancelacionPedida: boolean
  /** Estaba activo y dejó de dar señales: el back ya lo manda como `FALLO`. */
  interrumpido: boolean
  createdAt: string
  iniciadoAt: string | null
  terminadoAt: string | null
  actualizadoAt: string
}

export interface ListaDeProcesos {
  /** `false` = falta la migración del back: la lista está vacía por eso. */
  disponible: boolean
  motivo: string | null
  procesos: Proceso[]
  /** Cuántos de los que ves siguen en cola o corriendo. */
  activos: number
  /** Si ves los de todo el equipo (administrador). */
  veTodos: boolean
}

export interface FiltrosDeProcesos {
  estado?: EstadoDeProceso | 'ACTIVOS'
  tipo?: TipoDeProceso
  alcance?: 'mios' | 'todos'
  usuarioId?: string
  recursoTipo?: string
  recursoId?: string
  limite?: number
  antesDe?: string
}

export interface DescargaDeProceso {
  url: string
  nombre: string
  venceAt: string | null
}
