/**
 * Se cayó UNA parte de Leasefy: el asistente, los pagos, el correo…
 *
 * ── Por qué existe (01-10-2026) ────────────────────────────────────────────
 *
 * Con el micro de agentes caído, el registro le mostraba a la persona «Código
 * 503» y un «No pudimos abrir tu registro». No sabía si era ella, si había
 * perdido lo escrito ni si valía la pena volver a intentar. Ésta es la capa 2:
 * el back SÍ contestó, pero para decir que una pieza de la que depende no
 * responde.
 *
 * ── El contrato con el back ────────────────────────────────────────────────
 *
 * Todo 503 de NUESTRO back que signifique «se cayó una parte» trae
 *
 *     { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio?, message }
 *
 * Los proxies de avalúos y del cotizador mandan ese mismo cuerpo con 502, y
 * un 5xx con otro `code` puede traer `servicio` cuando fue una caída
 * (`WOMPI_NO_RESPONDIO`) — ver `esServicioNoDisponible`. Un 503 con OTRO
 * `code` y sin `servicio` (`FALTA_UNA_MIGRACION`,
 * `CENTRO_DE_PROCESOS_SIN_MIGRACION`) no es una caída y no se trata como tal.
 * Y la base caída (`servicio: 'base'`) no es «una parte»: sin Postgres no
 * funciona nada, así que va por la capa 1 (la franja global).
 *
 * `GET /health/servicios` (público) dice, por servicio, si está caído y si
 * el equipo ya está avisado:
 *
 *     { revisadoEn, servicios: [{ servicio, estado: 'arriba'|'caido', desde, equipoAvisado }] }
 *
 * «Nuestro equipo ya está avisado» se dice SÓLO si ese endpoint lo confirma
 * para ese servicio. Si falla o no existe (un back viejo), no se promete nada.
 */

import { useEffect, useState } from 'react'
import { CODIGO_LEASEFY_NO_RESPONDE, MENSAJE_LEASEFY_NO_RESPONDE } from './estado-de-conexion'
import { esCincoCientos, leerElError } from './leer-el-error'

export const CODIGO_SERVICIO_NO_DISPONIBLE = 'SERVICIO_NO_DISPONIBLE'

export type ServicioId =
  | 'asistente'
  | 'avaluos'
  | 'pagos'
  | 'correo'
  | 'whatsapp'
  | 'archivos'
  | 'base'
  | 'colas'
  | 'ia'
  | 'facturacion-electronica'
  | 'firma'

/** Cómo se llama cada parte en pantalla, con su artículo. */
const SERVICIOS: Record<ServicioId, { nombre: string; plural?: true }> = {
  asistente: { nombre: 'el asistente de Leasefy' },
  avaluos: { nombre: 'los avalúos', plural: true },
  pagos: { nombre: 'los pagos con Wompi', plural: true },
  correo: { nombre: 'el envío de correos' },
  whatsapp: { nombre: 'WhatsApp' },
  archivos: { nombre: 'los archivos', plural: true },
  base: { nombre: 'la base de datos' },
  colas: { nombre: 'el procesamiento en segundo plano' },
  ia: { nombre: 'la inteligencia artificial' },
  'facturacion-electronica': { nombre: 'la facturación electrónica' },
  firma: { nombre: 'la firma de documentos' },
}

export function esServicioConocido(valor: unknown): valor is ServicioId {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(SERVICIOS, valor)
}

/** «los pagos con Wompi», o `null` si el servicio no se conoce. */
export function nombreDelServicio(servicio: string | null | undefined): string | null {
  return esServicioConocido(servicio) ? SERVICIOS[servicio].nombre : null
}

// ── Reconocer el error ──────────────────────────────────────────────────────

/**
 * ¿Se cayó una parte? Dos formas, las dos confirmadas por el back el 01-10:
 *
 *   · 502 o 503 con `code: 'SERVICIO_NO_DISPONIBLE'`. Los proxies de avalúos
 *     y del cotizador siguen contestando 502 (la página de avalúos mira ese
 *     status), pero con el cuerpo del contrato.
 *   · cualquier 5xx que traiga `servicio`, aunque su `code` sea otro: el 502
 *     `WOMPI_NO_RESPONDIO` de dispersiones lo trae sólo cuando fue una caída
 *     de Wompi, y no un «no» suyo.
 *
 * Un 503 con OTRO code y sin `servicio` (`FALTA_UNA_MIGRACION`,
 * `CENTRO_DE_PROCESOS_SIN_MIGRACION`) no es una caída.
 *
 * Ojo: la base caída también cumple, pero no se dice como «una parte» — ver
 * `esCaidaDeLaBase`, que quien decide el texto mira ANTES.
 */
export function esServicioNoDisponible(error: unknown): boolean {
  const { status, code, servicio } = leerElError(error)
  if ((status === 502 || status === 503) && code === CODIGO_SERVICIO_NO_DISPONIBLE) return true
  return esCincoCientos(status) && typeof servicio === 'string' && servicio.length > 0
}

/** Qué parte se cayó, si el back lo dijo y es una que conocemos. */
export function servicioDelError(error: unknown): ServicioId | null {
  if (!esServicioNoDisponible(error)) return null
  const { servicio } = leerElError(error)
  return esServicioConocido(servicio) ? servicio : null
}

/**
 * ¿Lo caído es la base de datos? Sin Postgres no funciona nada, así que no se
 * dice como «se cayó una parte» sino como capa 1: Leasefy no está
 * respondiendo (la franja global). Ver `estado-de-conexion.ts`.
 */
export function esCaidaDeLaBase(error: unknown): boolean {
  return esServicioNoDisponible(error) && leerElError(error).servicio === 'base'
}

// ── Qué se le dice a la persona ─────────────────────────────────────────────

export interface TextoDeServicioNoDisponible {
  titulo: string
  detalle: string
}

export interface OpcionesDelTexto {
  /** Sólo `true` si `/health/servicios` lo confirmó para ESTE servicio. */
  equipoAvisado?: boolean
  /**
   * La frase que tranquiliza, cuando la de siempre no es cierta en esa
   * pantalla. Por defecto: «Lo demás de Leasefy sigue funcionando.» (y «Lo que
   * ya guardaste está a salvo.» si lo caído es la base, porque ahí lo demás
   * casi nunca funciona).
   */
  tranquilidad?: string
}

const NO_ES_TUYO = 'No es nada que hayas hecho; vuelve a intentar en unos minutos.'
const EQUIPO_AVISADO = 'Nuestro equipo ya está avisado.'

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function tituloDe(servicio: ServicioId | null | undefined): string {
  if (!esServicioConocido(servicio)) return 'Esta parte de Leasefy no está respondiendo'
  const { nombre, plural } = SERVICIOS[servicio]
  return `${conMayuscula(nombre)} no ${plural ? 'están disponibles' : 'está disponible'} en este momento`
}

export function textoDeServicioNoDisponible(
  servicio: ServicioId | null | undefined,
  { equipoAvisado = false, tranquilidad }: OpcionesDelTexto = {},
): TextoDeServicioNoDisponible {
  const calma =
    tranquilidad ??
    (servicio === 'base' ? 'Lo que ya guardaste está a salvo.' : 'Lo demás de Leasefy sigue funcionando.')
  const partes = [calma, NO_ES_TUYO]
  if (equipoAvisado) partes.push(EQUIPO_AVISADO)
  return { titulo: tituloDe(servicio), detalle: partes.join(' ') }
}

/**
 * Una sola línea, para un toast o para el `message` del `ApiError`: nombra lo
 * caído y dice qué hacer. Sin «equipo avisado»: eso pide preguntarle al back,
 * y un toast no espera.
 */
export function textoParaUnAviso(servicio: ServicioId | null | undefined): string {
  return `${tituloDe(servicio)}. ${NO_ES_TUYO}`
}

/**
 * Lo que deben decir los ayudantes de mensajes de error (`mensajeDelFallo`,
 * `errorEnCristiano`, `descripcionDelError`…) cuando el error es una caída:
 * el texto de capa 2 si se cayó una parte, el de capa 1 si no respondió
 * Leasefy entero. `null` si no es una caída: el ayudante sigue como siempre.
 */
export function mensajeDeCaida(error: unknown): string | null {
  // La base caída es «Leasefy no responde», no una parte: va primero.
  if (esCaidaDeLaBase(error)) return MENSAJE_LEASEFY_NO_RESPONDE
  if (esServicioNoDisponible(error)) return textoParaUnAviso(servicioDelError(error))
  if (leerElError(error).code === CODIGO_LEASEFY_NO_RESPONDE) return MENSAJE_LEASEFY_NO_RESPONDE
  return null
}

// ── ¿El equipo ya sabe? ─────────────────────────────────────────────────────

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export interface EstadoDelServicio {
  servicio: string
  estado: 'arriba' | 'caido'
  desde: string | null
  equipoAvisado: boolean
}

export interface EstadoDeLosServicios {
  revisadoEn: string | null
  servicios: EstadoDelServicio[]
}

/**
 * La respuesta, sólo si tiene la forma del contrato. Un back viejo que
 * devuelva otra cosa (o el 404 de la ruta que no existe) es `null`: no se
 * promete nada.
 */
function comoEstadoDeLosServicios(json: unknown): EstadoDeLosServicios | null {
  if (!json || typeof json !== 'object') return null
  const lista = (json as { servicios?: unknown }).servicios
  if (!Array.isArray(lista)) return null
  const servicios: EstadoDelServicio[] = []
  for (const s of lista) {
    if (!s || typeof s !== 'object') continue
    const f = s as Record<string, unknown>
    if (typeof f.servicio !== 'string') continue
    if (f.estado !== 'arriba' && f.estado !== 'caido') continue
    servicios.push({
      servicio: f.servicio,
      estado: f.estado,
      desde: typeof f.desde === 'string' ? f.desde : null,
      // Sólo un `true` explícito: cualquier otra cosa no es una promesa.
      equipoAvisado: f.equipoAvisado === true,
    })
  }
  const revisadoEn = (json as { revisadoEn?: unknown }).revisadoEn
  return { revisadoEn: typeof revisadoEn === 'string' ? revisadoEn : null, servicios }
}

/**
 * Una pantalla con un error de servicio suele tener VARIOS carteles a la vez
 * (cada tarjeta que no cargó). Todos preguntan lo mismo, así que comparten una
 * sola respuesta durante este rato —también la falla: a un back que no tiene
 * la ruta no se le pregunta diez veces seguidas—.
 */
const VIGENCIA_MS = 30_000
const TOPE_MS = 5_000
let ultimaConsulta: { en: number; promesa: Promise<EstadoDeLosServicios | null> } | null = null

export function consultarEstadoDeLosServicios(
  fetchImpl: typeof fetch | undefined = typeof fetch !== 'undefined' ? fetch : undefined,
): Promise<EstadoDeLosServicios | null> {
  if (ultimaConsulta && Date.now() - ultimaConsulta.en < VIGENCIA_MS) return ultimaConsulta.promesa
  const promesa = (async () => {
    if (!fetchImpl) return null
    const corte = new AbortController()
    const reloj = setTimeout(() => corte.abort(), TOPE_MS)
    try {
      const r = await fetchImpl(`${BACKEND}/health/servicios`, {
        method: 'GET',
        cache: 'no-store',
        signal: corte.signal,
      })
      if (!r.ok) return null
      return comoEstadoDeLosServicios(await r.json())
    } catch {
      return null
    } finally {
      clearTimeout(reloj)
    }
  })()
  ultimaConsulta = { en: Date.now(), promesa }
  return promesa
}

/** Sólo para las pruebas. */
export function olvidarEstadoDeLosServicios(): void {
  ultimaConsulta = null
}

/**
 * Lo que `/health/servicios` dice de ESTE servicio. Pregunta sólo cuando hay
 * un servicio que preguntar —o sea, cuando hay un error de ese servicio en
 * pantalla—; con `null` no sale ninguna petición. Mientras no hay respuesta, o
 * si la consulta falla, devuelve `null`: no se promete nada.
 */
export function useEstadoDelServicio(
  servicio: ServicioId | null | undefined,
): EstadoDelServicio | null {
  const [respuesta, setRespuesta] = useState<{
    de: ServicioId
    estado: EstadoDelServicio | null
  } | null>(null)

  useEffect(() => {
    if (!servicio) return
    let vigente = true
    void consultarEstadoDeLosServicios().then((todos) => {
      if (!vigente) return
      setRespuesta({
        de: servicio,
        estado: todos?.servicios.find((s) => s.servicio === servicio) ?? null,
      })
    })
    return () => {
      vigente = false
    }
  }, [servicio])

  // Una respuesta de OTRO servicio (el error cambió) no vale para éste.
  if (!servicio || respuesta?.de !== servicio) return null
  return respuesta.estado
}
