/**
 * El texto de un fallo en el backoffice, con la regla de oro (02-10-2026).
 *
 * Antes cada pantalla del admin hacía `err instanceof ApiError ? err.message
 * : 'Error de red'`: un 500 salía como «Error 500», un fallo que no era de
 * red (un `TypeError` de JavaScript) se le achacaba a la red, y lo que mandaba
 * el micro en `{ error }` se perdía detrás de «Error 400».
 *
 * Ahora delega en el traductor de la plataforma (`mensajeParaLaPersona`):
 *  · «conexión» SÓLO si el pedido no salió;
 *  · un 4xx dice lo que mandó el back (o el micro, en `body.error`);
 *  · un 5xx dice que falló de nuestro lado, con la referencia.
 *
 * Ronda 26 (23-10-2026, revisora T1) — tres filtros propios del admin:
 *  · un 404 de RUTA del back («Cannot GET /api/v1/admin/plataforma», el
 *    mensaje de Express cuando el servidor todavía no tiene esa parte) no se
 *    muestra en inglés: «Esta parte del admin todavía no está en el servidor»;
 *  · un 5xx NUNCA muestra el `message` del back o del micro (decía «Micro de
 *    agentes inalcanzable»): sólo «falló de nuestro lado» y la referencia;
 *  · un mensaje que nombra una variable del servidor
 *    («PRESCORING_PLATFORM_TENANT_ID no está configurado») no se muestra: dice
 *    que falta una configuración del servidor.
 *
 * `adminApi` tiene su propio `ApiError` (`status`, `message`, `body`): el
 * traductor lo lee por forma.
 */

import { ApiError } from './api'
import { mensajeParaLaPersona, type OpcionesDelMensaje } from '@/lib/errores/traductor-de-errores'

function comoObjeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** El 404 de Express cuando el servidor no tiene esa ruta: «Cannot GET /api/…». */
const RUTA_QUE_NO_EXISTE = /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \//i

/** El nombre de una variable del servidor: ocho o más mayúsculas y guiones bajos. */
const VARIABLE_DEL_SERVIDOR = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{6,}\b/

export const MENSAJE_PARTE_QUE_NO_ESTA =
  'Esta parte del admin todavía no está en el servidor. Cuando la suban, aparece aquí sola.'

export const MENSAJE_FALTA_CONFIGURACION =
  'Falta una configuración del servidor para esto. Avísale al equipo técnico; no es nada que hayas hecho.'

export const MENSAJE_SIN_RESPUESTA_DEL_ADMIN =
  'El servidor no respondió. Si tu internet funciona, esa parte puede estar apagada: prueba de nuevo en un momento.'

/** Lo que se le pasa al traductor de un 5xx: el status y la referencia, sin el texto del back. */
function sinElMensaje(status: number, cuerpo: Record<string, unknown> | null): Record<string, unknown> {
  const limpio: Record<string, unknown> = { status }
  for (const clave of ['code', 'referencia', 'requestId', 'servicio']) {
    if (cuerpo && cuerpo[clave] !== undefined) limpio[clave] = cuerpo[clave]
  }
  return limpio
}

function textoDe(err: ApiError): string {
  const cuerpo = comoObjeto(err.body)
  // El micro (cotizador, pre-scoring) responde `{ error: '…' }` y no
  // `{ message }`: `adminApi` deja «Error 400» y el texto bueno en `body.error`.
  if (/^Error \d{3}$/.test(err.message) && cuerpo && typeof cuerpo.error === 'string' && cuerpo.error.trim()) {
    return cuerpo.error.trim()
  }
  return err.message
}

export function mensajeDelAdmin(err: unknown, opciones: OpcionesDelMensaje = {}): string {
  if (err instanceof ApiError) {
    const cuerpo = comoObjeto(err.body)
    const texto = textoDe(err)

    // Sin respuesta: en el admin casi siempre es una parte apagada (el micro,
    // avalúos), no el internet de la persona.
    if (err.status === 0) {
      const sinInternet = typeof navigator !== 'undefined' && navigator.onLine === false
      return sinInternet ? mensajeParaLaPersona(err, opciones) : MENSAJE_SIN_RESPUESTA_DEL_ADMIN
    }

    if (err.status === 404 && RUTA_QUE_NO_EXISTE.test(texto.trim())) return MENSAJE_PARTE_QUE_NO_ESTA

    // 🔴 Un 5xx no muestra lo que escribió el servidor: «falló de nuestro lado» + referencia.
    if (err.status >= 500) return mensajeParaLaPersona(sinElMensaje(err.status, cuerpo), opciones)

    if (VARIABLE_DEL_SERVIDOR.test(texto)) return MENSAJE_FALTA_CONFIGURACION

    if (texto !== err.message) {
      return mensajeParaLaPersona({ ...cuerpo, status: err.status, message: texto }, opciones)
    }
  }
  if (err instanceof TypeError && /failed to fetch|networkerror|load failed|network request failed/i.test(err.message)) {
    const sinInternet = typeof navigator !== 'undefined' && navigator.onLine === false
    if (!sinInternet) return MENSAJE_SIN_RESPUESTA_DEL_ADMIN
  }
  return mensajeParaLaPersona(err, opciones)
}
