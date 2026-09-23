/**
 * Re-exportación tipada del renombre de las dos pestañas del Pipeline
 * (21-09-2026). La tabla y el porqué viven en
 * `los-nombres-que-no-decian-nada.data.mjs`.
 */
import { LOS_NOMBRES_QUE_NO_DECIAN_NADA_DATA } from './los-nombres-que-no-decian-nada.data.mjs'
import type { RedireccionDePanel } from './rutas-unificadas-del-panel'

export type { RedireccionDePanel }

export const LOS_NOMBRES_QUE_NO_DECIAN_NADA: RedireccionDePanel[] =
  LOS_NOMBRES_QUE_NO_DECIAN_NADA_DATA
