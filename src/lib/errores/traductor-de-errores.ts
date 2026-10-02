/**
 * EL traductor de errores del front: la fuente de verdad (02-10-2026).
 *
 * Nico: «No hay ningún sistema de errores completo trabajado». El caso que lo
 * disparó: en el onboarding del inquilino, un presupuesto de once cifras daba
 * un 500 en el back y la pantalla decía «Revisa tu conexión». Era falso dos
 * veces: el dato estaba mal y la conexión estaba perfecta.
 *
 * ── El contrato con el back y el micro ─────────────────────────────────────
 *
 *     { statusCode, code, message: string | string[],
 *       campos?: [{ campo, regla, mensaje, valor? }],
 *       servicio?, referencia?, …extras }
 *
 * (dueño: `back/src/common/errores/contrato-de-error.ts`; el micro lo copia en
 * `src/server/lib/sobre-de-error.ts`). `ApiError` deja el cuerpo entero en
 * `detalle`; acá se lee venga como venga (por forma, sin importar la clase).
 *
 * ── 🔴 La regla de oro ──────────────────────────────────────────────────────
 *
 *  · «Conexión» SÓLO cuando no hubo respuesta: el `fetch` no salió (status 0)
 *    o el navegador está sin red.
 *  · Un 4xx dice QUÉ está mal (lo que mandó el back; por campo si trae `campos`).
 *  · Un 5xx dice que algo falló DE NUESTRO LADO, sin culpar a la persona, con
 *    la `referencia` (o el `code`) para soporte.
 *  · Una caída (502/503 `SERVICIO_NO_DISPONIBLE`, Leasefy entero sin
 *    responder) sigue con sus textos de `src/lib/conexion/`.
 *
 * `mensajeDelFallo`, `errorEnCristiano`, `descripcionDelError` y
 * `motivosDelError` delegan acá. Un formulario usa `aplicarErroresDelServidor`
 * (`errores-en-el-formulario.ts`), que también sale de acá.
 */

import { CODIGO_LEASEFY_NO_RESPONDE } from '@/lib/conexion/estado-de-conexion'
import { mensajeDeCaida } from '@/lib/conexion/servicio-no-disponible'
import { leerElError } from '@/lib/conexion/leer-el-error'
import {
  CODIGO_LIMITE_DEL_PLAN,
  CODIGO_NOMINA_NO_HABILITADA,
  CODIGO_PLAN_REQUERIDO,
} from './codigos-del-plan'

// ── El contrato ──────────────────────────────────────────────────────────────

export const CODIGO_DATOS_INVALIDOS = 'DATOS_INVALIDOS'

export interface CampoConError {
  /** Ruta del dato en el cuerpo que se mandó: `budgetMax`, `agency.nit`. */
  campo: string
  /** `requerido`, `maximo`, `formato`, `no_permitido`, `unico`… */
  regla: string
  /** Frase completa, en español, para poner debajo del campo. */
  mensaje: string
  valor?: number | boolean
}

export type TipoDeFallo =
  /** No hubo respuesta: el pedido no salió (sin red, CORS, DNS). */
  | 'sinRespuesta'
  /** Leasefy entero no respondió (balanceador, base caída). */
  | 'leasefyNoResponde'
  /** Se cayó UNA parte (503 `SERVICIO_NO_DISPONIBLE`, 5xx con `servicio`). */
  | 'servicioCaido'
  /** 400/422: lo que se mandó no cumple. Puede traer `campos`. */
  | 'datos'
  /** 409: choca con lo que ya hay (duplicado, estado que no lo permite). */
  | 'conflicto'
  | 'noExiste'
  | 'sinPermiso'
  | 'sesion'
  | 'limitado'
  /** Otro 4xx que explica algo. */
  | 'rechazo'
  /** 5xx de verdad: es nuestro. */
  | 'nuestro'
  /** Un `Error` que no vino de una respuesta HTTP. */
  | 'desconocido'

export interface FalloLeido {
  tipo: TipoDeFallo
  /** Status HTTP; 0 = no hubo respuesta; `null` = no vino de HTTP. */
  status: number | null
  code?: string
  /** La referencia de soporte de un 5xx (`referencia` del back, `requestId` del micro). */
  referencia?: string
  /** Los mensajes del back, sueltos (un 400 de validación trae varios). */
  mensajes: string[]
  /** Los problemas por campo, si el back los mandó. */
  campos: CampoConError[]
}

// ── Leer el error, venga como venga ─────────────────────────────────────────

function comoObjeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Los sitios donde puede estar el cuerpo: el error, `detalle` (ApiError), `body`. */
function sitiosDelCuerpo(error: unknown): Record<string, unknown>[] {
  const directo = comoObjeto(error)
  if (!directo) return []
  return [directo, comoObjeto(directo.detalle), comoObjeto(directo.body)].filter(
    (s): s is Record<string, unknown> => s !== null,
  )
}

function esCampoConError(v: unknown): v is CampoConError {
  const o = comoObjeto(v)
  return Boolean(o && typeof o.campo === 'string' && typeof o.mensaje === 'string' && o.mensaje.trim())
}

/**
 * Los `campos` del contrato. Vacío si el error no los trae (un back viejo, un
 * 5xx, un fallo de red).
 */
export function camposDelError(error: unknown): CampoConError[] {
  for (const sitio of sitiosDelCuerpo(error)) {
    const campos = sitio.campos
    if (Array.isArray(campos)) {
      return campos.filter(esCampoConError).map((c) => ({
        campo: c.campo,
        regla: typeof c.regla === 'string' ? c.regla : 'otro',
        mensaje: c.mensaje.trim(),
        ...(typeof c.valor === 'number' || typeof c.valor === 'boolean' ? { valor: c.valor } : {}),
      }))
    }
  }
  return []
}

function referenciaDelError(error: unknown): string | undefined {
  for (const sitio of sitiosDelCuerpo(error)) {
    if (typeof sitio.referencia === 'string' && sitio.referencia) return sitio.referencia
  }
  for (const sitio of sitiosDelCuerpo(error)) {
    // El 500 del micro trae `requestId` (UUID): los 8 primeros, como el back.
    if (typeof sitio.requestId === 'string' && sitio.requestId) return sitio.requestId.slice(0, 8)
  }
  return undefined
}

/**
 * El largo máximo de un `message` que se le muestra a una persona (02-10-2026).
 *
 * Era 300 y se quedaba corto: los 409 de caja (`recibos-de-caja.service.ts`,
 * `sincronizar-cuota-con-cobro.ts`) explican mes, inmueble, inquilino, cifras
 * y qué hacer, y con nombres reales pasan de 300. Medidos con títulos de 100
 * y nombres de 60 caracteres: `CUOTA_Y_COBRO_NO_CUADRAN` (el cobro de otro
 * contrato) ≈ 510, el 400 del pago de una aseguradora que excede lo vencido
 * ≈ 560; con los topes de las columnas (título 200, nombre 100) ≈ 690. El
 * traductor los descartaba y `RegistrarPagoModal` tenía que mostrar el mensaje
 * crudo. 800 los cubre; lo que lo protege de un volcado no es el largo, son
 * las reglas de abajo.
 */
export const LARGO_MAXIMO_DE_UN_MENSAJE = 800

/**
 * Lo que delata un volcado aunque venga en una sola línea y sea corto: una
 * traza (`at fn (/app/x.js:10:5)`), una ruta de `node_modules`, un archivo con
 * su línea, una consulta de Prisma o un JSON.
 */
const PARECE_UNA_TRAZA = [
  /\bat\s+\S.*:\d+:\d+\)?/,
  /node_modules[\\/]/,
  /\.(?:[cm]?[jt]sx?|java|py):\d+/,
  /Invalid `/,
  /prisma\.\w+\.\w+\(/,
  /^[[{]/,
]

/** Una etiqueta de HTML en cualquier parte («<html>», «</div>», «<!DOCTYPE»). */
const TRAE_HTML = /<\/?[a-z!][^>]*>/i

/** Un `message` que es un volcado, un HTML o un código no le sirve a nadie. */
function esLegible(m: string): boolean {
  const t = m.trim()
  return (
    t.length > 0 &&
    t.length <= LARGO_MAXIMO_DE_UN_MENSAJE &&
    !/[\n\r]/.test(t) &&
    !t.startsWith('<') &&
    !TRAE_HTML.test(t) &&
    !PARECE_UNA_TRAZA.some((r) => r.test(t)) &&
    !/^Error \d{3}$/.test(t) &&
    !/^[1-5]\d\d$/.test(t)
  )
}

/**
 * Los mensajes sueltos de un `ApiError` (un 400 de validación trae varios).
 * Por forma y no con `instanceof`: este archivo no importa `@/lib/api/client`,
 * así las suites que lo mockean sin la clase no se rompen al pasar por acá.
 */
function mensajesSueltos(error: Error): string[] | null {
  const lista = (error as { messages?: unknown }).messages
  return Array.isArray(lista) && lista.length > 0 ? lista.map((m) => String(m).trim()).filter(Boolean) : null
}

function mensajesDe(error: unknown): string[] {
  if (error instanceof Error) {
    const sueltos = mensajesSueltos(error)
    if (sueltos) return sueltos
  }
  if (error instanceof Error) return error.message ? [error.message.trim()] : []
  for (const sitio of sitiosDelCuerpo(error)) {
    if (Array.isArray(sitio.message)) return sitio.message.map(String).filter(Boolean)
    if (typeof sitio.message === 'string' && sitio.message) return [sitio.message]
    if (typeof sitio.error === 'string' && sitio.error) return [sitio.error]
  }
  return []
}

/** Lo que dicen los navegadores cuando el pedido no llegó a salir. */
const RED_CAIDA = ['failed to fetch', 'networkerror', 'load failed', 'network request failed']

function statusDe(error: unknown): number | null {
  const { status } = leerElError(error)
  if (typeof status === 'number') return status
  if (error instanceof TypeError && RED_CAIDA.some((s) => error.message.toLowerCase().includes(s))) {
    return 0
  }
  // Las llamadas al micro que hacen `throw new Error(String(res.status))`: el
  // texto ES el status (mismo criterio que `clasificar.ts`).
  if (error instanceof Error && /^[1-5]\d\d$/.test(error.message.trim())) return Number(error.message.trim())
  return null
}

export function leerFallo(error: unknown): FalloLeido {
  const status = statusDe(error)
  const { code } = leerElError(error)
  const base = {
    status,
    code,
    referencia: referenciaDelError(error),
    mensajes: mensajesDe(error),
    campos: camposDelError(error),
  }

  if (status === 0) return { ...base, tipo: 'sinRespuesta' }
  if (code === CODIGO_LEASEFY_NO_RESPONDE) return { ...base, tipo: 'leasefyNoResponde' }
  if (mensajeDeCaida(error)) return { ...base, tipo: 'servicioCaido' }
  if (status === null) return { ...base, tipo: 'desconocido' }
  if (status === 400 || status === 422) return { ...base, tipo: 'datos' }
  if (status === 409) return { ...base, tipo: 'conflicto' }
  if (status === 404 || status === 410) return { ...base, tipo: 'noExiste' }
  if (status === 403 || status === 402) return { ...base, tipo: 'sinPermiso' }
  if (status === 401) return { ...base, tipo: 'sesion' }
  if (status === 429) return { ...base, tipo: 'limitado' }
  if (status >= 500) return { ...base, tipo: 'nuestro' }
  return { ...base, tipo: 'rechazo' }
}

// ── Qué se le dice a la persona ─────────────────────────────────────────────

export const MENSAJE_SIN_INTERNET =
  'No tienes conexión a internet. Lo que escribiste sigue aquí: vuelve a intentar cuando tengas señal.'

export const MENSAJE_SIN_RESPUESTA =
  'No pudimos comunicarnos con Leasefy. Revisa tu conexión a internet e intenta de nuevo.'

const NO_ES_TUYO = 'No es nada que hayas hecho; prueba de nuevo en un momento.'

/** Los textos de relleno de un 5xx que no dicen nada (el back y el micro). */
const RELLENOS_DE_5XX = /^(error interno del servidor\.?|internal server error\.?|an error occurred|bad gateway|service unavailable|gateway timeout)$/i

/** El mensaje de un fallo sin respuesta: «conexión» sólo acá. */
export function mensajeSinRespuesta(): string {
  return typeof navigator !== 'undefined' && navigator.onLine === false
    ? MENSAJE_SIN_INTERNET
    : MENSAJE_SIN_RESPUESTA
}

/**
 * Un 5xx: algo falló de nuestro lado. Si el back escribió un mensaje a
 * propósito (una `HttpException` 5xx con texto para la persona), ése; si no,
 * el general. Siempre con la referencia, si la hay.
 */
export function mensajeDeUnFalloNuestro(fallo: FalloLeido, accion?: string): string {
  const propio = fallo.mensajes.find((m) => esLegible(m) && !RELLENOS_DE_5XX.test(m.trim()))
  const texto =
    propio ??
    (accion
      ? `No pudimos ${accion}: algo falló de nuestro lado. ${NO_ES_TUYO}`
      : `Algo falló de nuestro lado. ${NO_ES_TUYO}`)
  return conReferencia(texto, fallo)
}

/** La coletilla de soporte de un 5xx: la `referencia` (o un `code` propio). */
export function conReferencia(texto: string, fallo: FalloLeido): string {
  if (fallo.tipo !== 'nuestro') return texto
  const ref = fallo.referencia ?? (fallo.code && fallo.code !== 'ERROR_INTERNO' ? fallo.code : undefined)
  return ref ? `${texto} Si sigue pasando, escríbenos con la referencia ${ref}.` : texto
}

/**
 * Una frase en español para cada `code` que el front trata aparte (02-10-2026).
 *
 * El `message` del back gana cuando se puede leer: es más preciso («límite de
 * AGENTES de tu plan»). La frase del código es para cuando no: un back viejo,
 * un mensaje vacío o en inglés, un volcado.
 */
export const FRASES_DE_LOS_CODIGOS: Readonly<Record<string, string>> = {
  [CODIGO_PLAN_REQUERIDO]:
    'Tu inmobiliaria no tiene un plan activo. Elige o renueva tu plan para seguir usando el panel.',
  [CODIGO_LIMITE_DEL_PLAN]: 'Llegaste al límite de tu plan. Sube de plan para agregar más.',
  [CODIGO_NOMINA_NO_HABILITADA]:
    'El módulo de Nómina no está habilitado para tu inmobiliaria. Es un módulo de pago: lo activa Leasefy cuando se contrata.',
  RECORDATORIO_RECIENTE: 'Ya se envió un recordatorio de firma en las últimas 24 horas.',
}

/** La frase de un `code`, o `undefined` si el código no tiene una propia. */
export function fraseDelCodigo(code: string | undefined): string | undefined {
  return code && Object.prototype.hasOwnProperty.call(FRASES_DE_LOS_CODIGOS, code)
    ? FRASES_DE_LOS_CODIGOS[code]
    : undefined
}

export interface OpcionesDelMensaje {
  /** Lo que se dice si el error no trae nada legible (un 4xx vacío, algo raro). */
  porDefecto?: string
  /**
   * Lo que se estaba haciendo, en infinitivo: «guardar tu perfil». Un 5xx dice
   * «No pudimos guardar tu perfil: algo falló de nuestro lado…».
   */
  accion?: string
}

/**
 * La línea para un toast o para el pie de un formulario, con la regla de oro.
 * Un 400 con varios problemas los lista con « · ».
 */
export function mensajeParaLaPersona(error: unknown, { porDefecto, accion }: OpcionesDelMensaje = {}): string {
  const caida = mensajeDeCaida(error)
  if (caida) return caida
  const fallo = leerFallo(error)
  const general = porDefecto ?? 'No pudimos completar esto. Prueba de nuevo en un momento.'
  switch (fallo.tipo) {
    case 'sinRespuesta':
      return mensajeSinRespuesta()
    case 'nuestro':
      return mensajeDeUnFalloNuestro(fallo, accion)
    case 'desconocido': {
      const m = fallo.mensajes.find(esLegible)
      // Un `TypeError` de JavaScript («x is not a function») es nuestro, no un texto para nadie.
      if (!m || error instanceof TypeError) return general
      return m
    }
    default: {
      const legibles = fallo.mensajes.filter(esLegible)
      if (legibles.length) return Array.from(new Set(legibles)).join(' · ')
      const delCodigo = fraseDelCodigo(fallo.code)
      if (delCodigo) return delCodigo
      const deCampos = fallo.campos.map((c) => c.mensaje)
      if (deCampos.length) return Array.from(new Set(deCampos)).join(' · ')
      return general
    }
  }
}

/** ¿El error vino sin respuesta (red)? Lo que la franja global ya avisa. */
export function esSinRespuesta(error: unknown): boolean {
  return leerFallo(error).tipo === 'sinRespuesta'
}
