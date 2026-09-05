'use client'

/**
 * Cómo se le pide algo al agente de mantenimiento (Fixi) — y cómo se cuenta
 * cuando no se pudo.
 *
 * 🔴 Lo que decía el código y NO es cierto: los tres comentarios de estos hooks
 * afirmaban «endpoint not-yet-existing» / «no backend». Las tres rutas EXISTEN
 * y están registradas en el micro:
 *
 *   GET /api/agency/{agencyId}/mantenimiento/overview
 *   GET /api/agency/{agencyId}/mantenimiento/inbox
 *   GET /api/agency/{agencyId}/mantenimiento/tickets/{ticketId}
 *
 * (`agent-integracion/src/server/routes/agency-mantenimiento-*.ts`, montadas por
 * `manifest.ts`.) Lo que pasa es otra cosa: las tres arrancan con
 * `isMantenimientoEnabled()` y devuelven **404 `feature_not_enabled`** mientras
 * `MANTENIMIENTO_ENABLED` no esté en `true` — y esa variable no está ni en el
 * `.env` ni en el `.env.example` del micro. O sea: el agente está APAGADO, no
 * ausente. Son dos arreglos distintos (prender un flag vs. escribir una ruta) y
 * el mensaje tiene que decir cuál es.
 *
 * Antes el `catch` guardaba `err.message`, que para un fallo de HTTP era el
 * string `"404"` — literalmente eso era todo lo que leía el usuario dentro del
 * cartel rojo. Un número no es una explicación.
 *
 * El micro es GET-only para tickets: el estado vive en el back
 * (`/internal/mantenimiento`, S2S). Desde el panel, por ahora, esto se MIRA.
 */

export const SIN_AGENTE_CONFIGURADO =
  'No hay agente configurado (falta NEXT_PUBLIC_AGENT_URL), así que no se pudo traer nada. ' +
  'Esta pantalla está vacía porque no pudimos consultar, no porque no haya datos.'

export const AGENTE_APAGADO =
  'El agente de mantenimiento está apagado en el microservicio (falta MANTENIMIENTO_ENABLED=true). ' +
  'La ruta existe y responde 404 a propósito: no es que no tengas tickets, es que todavía no se puede preguntar.'

export const SIN_AGENCIA =
  'Todavía no sabemos con qué inmobiliaria estás trabajando, así que no se consultó nada. ' +
  'Volvé a entrar o cambiá de inmobiliaria; esta pantalla está vacía porque no preguntamos, no porque no haya datos.'

/**
 * Traduce una respuesta que no fue 2xx a algo que se pueda leer.
 *
 * El 404 del micro no es «no existe ese ticket» a secas: en estas tres rutas el
 * flag apagado responde exactamente eso, y es de lejos el caso frecuente hoy.
 */
export function mensajeDeRespuestaFallida(res: Response, queEs: string): string {
  if (res.status === 404) return AGENTE_APAGADO
  if (res.status === 401 || res.status === 403) {
    return `Tu usuario no tiene permiso para ver ${queEs} (${res.status}).`
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return `El agente no pudo responder (${res.status}). Es un problema del servidor, no de tus datos.`
  }
  return `No se pudo traer ${queEs} (HTTP ${res.status}).`
}

/** El `catch` de red: un `TypeError: Failed to fetch` tampoco explica nada solo. */
export function mensajeDeErrorDeRed(err: unknown, queEs: string): string {
  if (err instanceof Error && err.message) {
    return `No se pudo traer ${queEs}: ${err.message}`
  }
  return `No se pudo traer ${queEs}.`
}
