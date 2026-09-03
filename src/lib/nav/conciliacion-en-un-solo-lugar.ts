/**
 * Re-exportación tipada de la redirección de la conciliación unificada, para
 * el test que cubre la tabla. La tabla y el porqué viven en
 * `conciliacion-en-un-solo-lugar.data.mjs`.
 */
import { CONCILIACION_EN_UN_SOLO_LUGAR_DATA } from './conciliacion-en-un-solo-lugar.data.mjs'
import type { RedireccionDePanel } from './rutas-unificadas-del-panel'

export type { RedireccionDePanel }

export const CONCILIACION_EN_UN_SOLO_LUGAR: RedireccionDePanel[] =
  CONCILIACION_EN_UN_SOLO_LUGAR_DATA
