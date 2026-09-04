/**
 * Re-exportación tipada de las redirecciones de la arquitectura por ciclo de
 * vida (septiembre 2026), para el resto de la app y para el test que cubre la
 * tabla. La tabla y el porqué viven en `rutas-por-ciclo-de-vida.data.mjs`.
 */
import { RUTAS_POR_CICLO_DE_VIDA_DATA } from './rutas-por-ciclo-de-vida.data.mjs'
import type { RedireccionDePanel } from './rutas-unificadas-del-panel'

export type { RedireccionDePanel }

export const RUTAS_POR_CICLO_DE_VIDA: RedireccionDePanel[] = RUTAS_POR_CICLO_DE_VIDA_DATA
