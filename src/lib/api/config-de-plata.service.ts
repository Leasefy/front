/**
 * `GET /config/plata` — qué áreas de la plata ya escriben centavos
 * («centavos en todo», C3-FRONT, 03-10-2026).
 *
 * Contrato (back `src/common/plata/config-de-plata.controller.ts`):
 *
 *   GET /config/plata
 *     200 → { conCentavos: { [area]: boolean } }   (las 9 áreas de C2)
 *
 * Pública (no dice nada de nadie: sólo si una migración y un interruptor están
 * puestos) y con `Cache-Control: max-age=60`. Un back viejo responde 404.
 *
 * Lanza `ApiError` ante cualquier falla: quien llama
 * (`lib/plata/con-centavos.ts`) decide «sin centavos», como hoy.
 */

import { apiClient } from './client'

const RUTA = '/config/plata'

/** El cuerpo tal como llega; lo interpreta `leerConfigDePlata`. */
export function pedirConfigDePlata(): Promise<unknown> {
  return apiClient.get<unknown>(RUTA)
}
