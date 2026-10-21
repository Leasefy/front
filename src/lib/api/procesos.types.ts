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
  /** Subir un archivo para ingerirlo: extracto bancario, recaudo, lista restrictiva. */
  | 'CARGA'
  /** Mandar N correos, mensajes o documentos: extractos, recordatorios, invitaciones. */
  | 'ENVIO_MASIVO'
  /** Generar lo del mes: cobros, dispersiones, certificados de retención. */
  | 'GENERACION'
  /** Aprobar o reversar muchos de una vez. */
  | 'APROBACION_MASIVA'

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
  /** Si ves los de todo el equipo (administrador o contador; lo decide el back). */
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

// ── Lo que hizo cada proceso, renglón por renglón (Nico, 20-10-2026) ────────
// `GET /inmobiliaria/procesos/:id/renglones` (back `renglones-de-los-procesos.ts`).

/** OK = salió · FALLO = no salió (con su motivo) · OMITIDO = no tocaba. */
export type EstadoDeRenglon = 'OK' | 'FALLO' | 'OMITIDO'

export interface RenglonDelProceso {
  /** Orden de llegada (BIGINT como texto): el cursor de la página siguiente. */
  n: string
  estado: EstadoDeRenglon
  /** «FE-1203 · Mateo Giraldo» */
  titulo: string
  detalle: string | null
  motivo: string | null
  montoCop: number | null
  /** Qué cosa es, para abrir SU cajón (`FACTURA`, `CONTRATO`…). */
  recurso: { tipo: string; id: string } | null
  createdAt: string
}

export interface ResumenDeRenglones {
  OK: number
  FALLO: number
  OMITIDO: number
  total: number
}

export interface PaginaDeRenglones {
  /** `false` = falta la migración de los renglones: el cajón muestra lo de antes. */
  disponible: boolean
  renglones: RenglonDelProceso[]
  siguiente: string | null
  resumen: ResumenDeRenglones
}

/** Lo que anota el NAVEGADOR (`POST /inmobiliaria/procesos/:id/renglones`). */
export interface RenglonNuevoDelNavegador {
  estado: EstadoDeRenglon
  titulo: string
  detalle?: string | null
  motivo?: string | null
  montoCop?: number | null
  recurso?: { tipo: string; id: string } | null
}

export interface FiltrosDeRenglones {
  estado?: EstadoDeRenglon
  buscar?: string
  despuesDe?: string
  limite?: number
}
