/**
 * aprobacion-local — el puente entre el resultado y el resto del recorrido.
 *
 * El resultado de `/aprobacion` vivía en el estado de React: la persona lo
 * veía, navegaba, y desaparecía. Y la mayoría llega por un link de WhatsApp
 * **sin cuenta**, así que después tampoco había a quién preguntarle. El
 * recorrido se cortaba justo donde empieza a valer: pasar de "estás aprobado"
 * al catálogo que sí le sirve.
 *
 * Acá se guarda, en el navegador de la persona, lo que ya ganó — para que el
 * catálogo pueda personalizarse aunque todavía no se haya registrado.
 *
 * Tres reglas que no se rompen:
 *
 * 1. **Solo se guarda lo que es verdad.** El funnel no devuelve tope ni
 *    vigencia: acá van en `null`. No se inventan.
 * 2. **Un resultado de demo NO se guarda.** `stubMode` significa "esto no es
 *    real"; persistirlo dejaría al catálogo afirmando una aprobación falsa en
 *    pantallas que ya no avisan que era una demostración.
 * 3. **Caduca.** Sin fecha del backend se le pone un límite local de retención,
 *    para que una consulta vieja no siga decidiendo qué ve la persona meses
 *    después. Es un límite de caché, no una vigencia: la vigencia la manda el
 *    backend y hoy no la manda.
 *
 * La sesión siempre gana: si hay cuenta, el backend es la fuente de verdad y
 * esto queda como respaldo (ver `use-aprobacion`).
 */

import type { Aprobacion } from './aprobacion.service'
import { aseguradoraDisplayName, type PreApprovalResult } from './funnel.service'

/** Prefijo legacy pre-rebrand. No renombrar: rompería lo ya guardado. */
const CLAVE = 'arriendo-facil-aprobacion'

/**
 * Sube cuando cambie la forma de lo guardado. Un registro con versión distinta
 * se descarta en silencio en vez de intentar leerse mal.
 */
const VERSION = 1

/** Cuánto se conserva localmente. Retención, no vigencia (ver cabecera). */
export const RETENCION_DIAS = 30

interface RegistroGuardado {
  version: number
  /** ISO-8601 del momento en que se guardó. */
  guardadoEn: string
  aprobacion: Aprobacion
}

/**
 * Traduce la respuesta del funnel al modelo con el que trabaja el recorrido.
 *
 * `partial` entra como **aprobado con condición**, no como un estado aparte:
 * a alguien que le dicen "sí, pero con codeudor" ya lo aprobaron, y puede
 * postularse. La condición la resuelve el asesor, no una pantalla que lo frene.
 */
export function aprobacionDesdeFunnel(
  result: PreApprovalResult,
  opts: { canonConsultadoCop?: number | null; ahora?: Date } = {},
): Aprobacion {
  const aprobado = result.asegurabilidad === 'yes' || result.asegurabilidad === 'partial'
  const ahora = opts.ahora ?? new Date()

  return {
    estado: aprobado ? 'aprobado' : 'rechazado',
    /*
     * El máximo afianzable ES el tope. Llega cuando la persona consulta **sin
     * propiedad**: ahí la aseguradora no responde sí/no, responde hasta cuánto.
     * Ese es el caso que vuelve verdaderamente personal al catálogo, porque un
     * techo sirve para filtrar y un canon consultado no.
     *
     * Hoy el agente no lo manda todavía → `null`, y la UI lo dice.
     */
    topeAprobadoCop:
      typeof result.maxAfianzableCop === 'number' && Number.isFinite(result.maxAfianzableCop)
        ? result.maxAfianzableCop
        : null,
    aseguradoras: result.aseguradoras.map((a) => ({
      nombre: aseguradoraDisplayName(a.aseguradora),
      aprobada: true,
    })),
    // Tampoco devuelve vigencia. Sin fecha, `estaVigente` la da por válida —
    // que es lo correcto: no se le quita a alguien algo que ya ganó por un
    // dato que el backend todavía no manda.
    vigenteHasta: null,
    resueltoEn: ahora.toISOString(),
    condicionada:
      result.asegurabilidad === 'partial' ||
      result.aseguradoras.some((a) => a.status === 'conditional'),
    canonConsultadoCop:
      typeof opts.canonConsultadoCop === 'number' && Number.isFinite(opts.canonConsultadoCop)
        ? opts.canonConsultadoCop
        : null,
  }
}

function disponible(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * Guarda el resultado para que sobreviva a la navegación.
 *
 * Devuelve `false` cuando no se guardó, y eso incluye el caso importante: un
 * resultado de demostración. No es un fallo — es la regla 2.
 */
export function guardarAprobacionLocal(
  result: PreApprovalResult,
  opts: { canonConsultadoCop?: number | null; ahora?: Date } = {},
): boolean {
  if (result.stubMode) return false
  if (!disponible()) return false

  const registro: RegistroGuardado = {
    version: VERSION,
    guardadoEn: (opts.ahora ?? new Date()).toISOString(),
    aprobacion: aprobacionDesdeFunnel(result, opts),
  }

  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(registro))
    return true
  } catch {
    // Modo incógnito, cuota llena, storage bloqueado. Perder el respaldo no
    // puede tumbar la pantalla de resultado que la persona está viendo.
    return false
  }
}

/**
 * Lee la aprobación guardada. `null` si no hay, si está corrupta, si es de otra
 * versión, o si ya pasó la retención.
 */
export function leerAprobacionLocal(ahora: Date = new Date()): Aprobacion | null {
  if (!disponible()) return null

  let crudo: string | null
  try {
    crudo = window.localStorage.getItem(CLAVE)
  } catch {
    return null
  }
  if (!crudo) return null

  try {
    const registro = JSON.parse(crudo) as Partial<RegistroGuardado>
    if (registro.version !== VERSION) return null
    if (!registro.aprobacion || typeof registro.guardadoEn !== 'string') return null

    const guardado = new Date(registro.guardadoEn)
    if (Number.isNaN(guardado.getTime())) return null

    const dias = (ahora.getTime() - guardado.getTime()) / (24 * 60 * 60 * 1000)
    if (dias > RETENCION_DIAS || dias < 0) return null

    return registro.aprobacion
  } catch {
    return null
  }
}

/** Borra el respaldo. Se usa al cerrar sesión y al pedir una consulta nueva. */
export function borrarAprobacionLocal(): void {
  if (!disponible()) return
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    /* nada que hacer, y nada que romper */
  }
}
