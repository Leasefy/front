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
 * `adminApi` tiene su propio `ApiError` (`status`, `message`, `body`): el
 * traductor lo lee por forma.
 */

import { ApiError } from './api'
import { mensajeParaLaPersona, type OpcionesDelMensaje } from '@/lib/errores/traductor-de-errores'

function comoObjeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

export function mensajeDelAdmin(err: unknown, opciones: OpcionesDelMensaje = {}): string {
  // El micro (cotizador, pre-scoring) responde `{ error: '…' }` y no
  // `{ message }`: `adminApi` deja «Error 400» y el texto bueno en `body.error`.
  if (err instanceof ApiError && /^Error \d{3}$/.test(err.message)) {
    const cuerpo = comoObjeto(err.body)
    if (cuerpo && typeof cuerpo.error === 'string' && cuerpo.error.trim()) {
      return mensajeParaLaPersona({ ...cuerpo, status: err.status, message: cuerpo.error }, opciones)
    }
  }
  return mensajeParaLaPersona(err, opciones)
}
