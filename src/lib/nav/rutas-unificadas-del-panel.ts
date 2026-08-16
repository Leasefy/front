/**
 * Re-exportación tipada de las redirecciones del panel unificado, para el
 * resto de la app y para el test que cubre la tabla. La tabla y el porqué
 * viven en `rutas-unificadas-del-panel.data.mjs`.
 */
import { RUTAS_UNIFICADAS_DEL_PANEL_DATA } from './rutas-unificadas-del-panel.data.mjs'

export interface RedireccionDePanel {
  source: string
  destination: string
  permanent: boolean
}

export const RUTAS_UNIFICADAS_DEL_PANEL: RedireccionDePanel[] =
  RUTAS_UNIFICADAS_DEL_PANEL_DATA
