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

// 🔴 QA con avatares 04-10: estos textos llegaban a la persona con nombres de
// variables («falta MANTENIMIENTO_ENABLED=true»), «microservicio» y códigos
// HTTP. Ahora dicen qué pasa y qué sigue valiendo, sin palabras de programador.
export const SIN_AGENTE_CONFIGURADO =
  'El asistente de mantenimiento no está disponible por ahora, así que no pudimos traer nada. ' +
  'Esta pantalla está vacía porque no pudimos consultar, no porque no haya datos.'

export const AGENTE_APAGADO =
  'El asistente de mantenimiento todavía no está encendido para tu inmobiliaria, así que no podemos mostrarte la priorización de tickets. ' +
  'No es que no tengas tickets: los puedes ver y gestionar en el tablero de Mantenimiento.'

export const SIN_AGENCIA =
  'Todavía no sabemos con qué inmobiliaria estás trabajando, así que no se consultó nada. ' +
  'Vuelve a entrar o cambia de inmobiliaria; esta pantalla está vacía porque no preguntamos, no porque no haya datos.'

/**
 * Traduce una respuesta que no fue 2xx a algo que se pueda leer.
 *
 * El 404 del micro no es «no existe ese ticket» a secas: en estas tres rutas el
 * flag apagado responde exactamente eso, y es de lejos el caso frecuente hoy.
 */
export function mensajeDeRespuestaFallida(res: Response, queEs: string): string {
  if (res.status === 404) return AGENTE_APAGADO
  if (res.status === 401 || res.status === 403) {
    return `Tu usuario no tiene permiso para ver ${queEs}. Pídele acceso a un administrador de tu inmobiliaria.`
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return 'El asistente no pudo responder en este momento. Es un problema nuestro, no de tus datos; vuelve a intentar en unos minutos.'
  }
  return `No pudimos traer ${queEs}. Vuelve a intentar en unos minutos.`
}

/**
 * 🔴 QA-IA-95 (05-10-2026, IA95-06): los hooks lanzan la respuesta fallida DENTRO del `try`, y este
 * `catch` la pisaba con «Revisa tu conexión»: con Fixi apagado (404 `feature_not_enabled`) la Bandeja
 * priorizada culpaba a la red. Una respuesta que SÍ llegó se dice con `mensajeDeRespuestaFallida`.
 */
export class RespuestaDelAgente extends Error {
  constructor(res: Response, queEs: string) {
    super(mensajeDeRespuestaFallida(res, queEs))
    this.name = 'RespuestaDelAgente'
  }
}

/** El `catch` de red: un `TypeError: Failed to fetch` tampoco explica nada solo. */
export function mensajeDeErrorDeRed(err: unknown, queEs: string): string {
  if (err instanceof RespuestaDelAgente) return err.message
  // El texto del error del navegador («Failed to fetch») no le dice nada a quien mira.
  return `No pudimos traer ${queEs}. Revisa tu conexión y vuelve a intentar.`
}
