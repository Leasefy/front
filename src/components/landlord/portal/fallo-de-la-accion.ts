/**
 * Qué decirle al propietario cuando una ACCIÓN del portal (elegir inquilino,
 * abrir una solicitud) no sale (02-10-2026, sistema de errores).
 *
 * `ownerPost` (`lib/api/owner-portal.http.ts`) devuelve `{ ok, status, error }`
 * en vez de lanzar. Antes cada pantalla decía «Próximamente» con CUALQUIER
 * `status: 0` —también con la red caída— y, si no, pintaba `res.error` tal
 * cual («Error 500», «network», «[object Object]»). Ahora:
 *
 *  · «no habilitado» (Próximamente) SÓLO cuando el portal no está cableado
 *    (`error: 'unavailable'`: falta la URL del micro o el `agencyId`) o el
 *    micro responde 401/404 (el mismo criterio que los GET del portal);
 *  · la red caída (`error: 'network'`) habla de la conexión;
 *  · lo demás pasa por el traductor: un 4xx dice lo que mandó el micro si se
 *    puede leer, un 5xx dice que fue nuestro.
 */

import type { OwnerActionResult } from '@/lib/api/owner-portal.http'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

export type FalloDeLaAccion = { tipo: 'no-habilitado' } | { tipo: 'mensaje'; texto: string }

/** Los status con que el micro dice «el portal no está habilitado para ti». */
const STATUS_DE_NO_HABILITADO = new Set([401, 404])

export function falloDeLaAccionDelPortal(
  res: Pick<OwnerActionResult<unknown>, 'status' | 'error' | 'fallo'>,
  opciones: { accion: string; porDefecto: string },
): FalloDeLaAccion {
  if (res.status === 0 && res.error === 'unavailable') return { tipo: 'no-habilitado' }
  if (STATUS_DE_NO_HABILITADO.has(res.status)) return { tipo: 'no-habilitado' }
  // 02-10-2026 · `ownerPost` ya trae el fallo entero (status, `code`, cuerpo):
  // el traductor lee de ahí el `message` del sobre de un 4xx y la referencia
  // de un 5xx. Un 2xx ilegible llega como un 500 nuestro, no como la red.
  if (res.fallo) return { tipo: 'mensaje', texto: mensajeParaLaPersona(res.fallo, opciones) }
  // Sin el fallo (un resultado armado a mano): por el status y el `error`.
  // `network`: el `fetch` no salió. Lo demás con status 0 tampoco tuvo respuesta legible.
  const error =
    res.status === 0
      ? new TypeError('Failed to fetch')
      : { status: res.status, message: esUnaFrase(res.error) ? res.error : '' }
  return { tipo: 'mensaje', texto: mensajeParaLaPersona(error, opciones) }
}

/**
 * El micro a veces manda un código en `error` (`conflict`, `invalid_state`,
 * `terms_changed`): eso no es una frase para nadie y no se muestra.
 */
function esUnaFrase(texto: string | null): texto is string {
  return typeof texto === 'string' && !/^[a-z0-9_.-]+$/.test(texto.trim())
}
