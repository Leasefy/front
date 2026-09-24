/**
 * Re-exportación tipada de las redirecciones del módulo único de plata
 * («Cobros» + «Pagos» → «Pagos», septiembre 2026), para el resto de la app y
 * para el test que cubre la tabla. La tabla y el porqué viven en
 * `un-solo-modulo-de-plata.data.mjs`.
 */
import { UN_SOLO_MODULO_DE_PLATA_DATA } from './un-solo-modulo-de-plata.data.mjs'
import type { RedireccionDePanel } from './rutas-unificadas-del-panel'

export type { RedireccionDePanel }

export const UN_SOLO_MODULO_DE_PLATA: RedireccionDePanel[] = UN_SOLO_MODULO_DE_PLATA_DATA
