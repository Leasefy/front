/**
 * Re-exportación tipada de las redirecciones que dejó la Sala del agente de
 * Pagos al irse (2026-09-16), para el resto de la app y para su test. La tabla
 * y el porqué viven en `la-sala-de-pagos-se-fue.data.mjs`.
 */
import { LA_SALA_DE_PAGOS_SE_FUE_DATA } from './la-sala-de-pagos-se-fue.data.mjs'
import type { RedireccionDePanel } from './rutas-unificadas-del-panel'

export type { RedireccionDePanel }

export const LA_SALA_DE_PAGOS_SE_FUE: RedireccionDePanel[] = LA_SALA_DE_PAGOS_SE_FUE_DATA
