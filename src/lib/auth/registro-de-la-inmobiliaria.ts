'use client'

import { useEffect, useState } from 'react'
import { getOnboardingResumePoint } from '@/lib/api/onboarding-provisioning.service'
import { resumeOnboarding } from '@/lib/api/onboarding-session.service'

/**
 * 🔴 ¿Esta persona terminó el registro de su inmobiliaria?
 *
 * El orden de una inmobiliaria nueva es UNO y no se salta: registro (el
 * asistente: Agencia → Miembros → Habeas Data → «Crear mi inmobiliaria») →
 * migración → segundo factor → recorrido. La agencia y la membresía ADMIN
 * nacen ANTES del asistente, en «Antes de comenzar» (`POST
 * /users/me/onboarding`), así que «tiene membresía activa» NO quiere decir
 * «terminó el registro». Quien quedó a medias va a `/onboarding/inmobiliaria`,
 * que retoma en su paso; nunca al panel ni al segundo factor.
 *
 * Nico, 01-10-2026: «luego de crear la cuenta, entramos desde un correo, nos
 * llevó al seleccionar rol y nos llevó luego de un rato a esta pantalla,
 * literal ingresó a la plataforma». La agencia («Periquito company LTDA» en
 * dev) quedó `provisioningStatus: FAILED` y `agentSessionId: null` —el back
 * no alcanzó el micro en 6 intentos—, y este veredicto la contaba como
 * «miembro invitado, no hay asistente que retomar»: el panel la dejaba pasar.
 * Una agencia CON `provisioningStatus` y SIN sesión del asistente es justo
 * lo contrario: el asistente ni siquiera empezó.
 *
 * Las dos fuentes, encadenadas:
 *   1. `GET /users/me/onboarding/session` (back).
 *      - Sin agencia (`provisioningStatus: null`): no hay registro de
 *        inmobiliaria que terminar → `terminado`, sin recordarlo.
 *      - Agencia sin `agentSessionId` (traspaso al micro PENDING, caído o
 *        FAILED) → `a-medias`: `/onboarding/inmobiliaria` lo resuelve (ACTIVE
 *        reintenta el traspaso con «Antes de comenzar»; FAILED dice que
 *        escriba a soporte). En el panel no tiene nada que hacer.
 *   2. `GET {agent}/onboarding/session/{id}/resume` (micro): `'complete'` =
 *      terminado (desde el 30-09 el micro sólo llega ahí al apretar «Crear mi
 *      inmobiliaria»); cualquier otro paso = `a-medias`.
 *
 * Cualquier fallo de red, del back o del micro es `no-se`: fail-open, no se
 * expulsa a nadie por no poder preguntar (y no se recuerda: la próxima
 * entrada vuelve a preguntar). Sólo `terminado` se recuerda, por usuario.
 */

export type VeredictoDelRegistro = 'terminado' | 'a-medias' | 'no-se'
export type EstadoDelRegistro = 'verificando' | VeredictoDelRegistro

/** Ni el back ni el micro pueden dejar a la persona mirando un cargador para siempre. */
export const ESPERA_MAXIMA_DEL_REGISTRO_MS = 8000

/**
 * Clave nueva el 01-10: la de antes (`leasefy-asistente-listo:`) se escribía
 * también para quien todavía no tenía inmobiliaria; con ella guardada, el
 * registro que empezara después no se volvía a preguntar.
 */
const CLAVE = (userId: string) => `leasefy-registro-terminado:${userId}`

export function registroYaVerificado(userId: string): boolean {
  try {
    return window.localStorage.getItem(CLAVE(userId)) === '1'
  } catch {
    return false
  }
}

function recordarTerminado(userId: string): void {
  try {
    window.localStorage.setItem(CLAVE(userId), '1')
  } catch {
    /* sin caché se vuelve a preguntar la próxima vez, y ya */
  }
}

/**
 * Lo que se pregunta, con una distinción más que el veredicto: `sin-agencia`
 * se comporta como `terminado` pero NO se recuerda — quien todavía no tiene
 * inmobiliaria puede crearla después, y un «terminado» guardado antes le
 * abriría el panel con el registro a medias.
 */
type Respuesta = VeredictoDelRegistro | 'sin-agencia'

/** Pregunta, sin caché. Nunca lanza. */
export async function preguntarPorElRegistro(): Promise<Respuesta> {
  let punto
  try {
    punto = await getOnboardingResumePoint()
  } catch {
    return 'no-se'
  }

  if (punto.agentSessionId == null) {
    return punto.provisioningStatus == null ? 'sin-agencia' : 'a-medias'
  }
  // Un traspaso que no terminó (o que falló) es registro sin terminar,
  // traiga o no un id de sesión.
  if (punto.provisioningStatus === 'FAILED' || punto.provisioningStatus === 'PENDING') {
    return 'a-medias'
  }

  try {
    const sesion = await resumeOnboarding(punto.agentSessionId)
    return sesion.currentStep === 'complete' ? 'terminado' : 'a-medias'
  } catch {
    // Red, 401, 404 (sesión limpiada), 5xx.
    return 'no-se'
  }
}

function conTope(promesa: Promise<Respuesta>): Promise<Respuesta> {
  return new Promise((resolver) => {
    const tope = setTimeout(() => resolver('no-se'), ESPERA_MAXIMA_DEL_REGISTRO_MS)
    void promesa.then((v) => {
      clearTimeout(tope)
      resolver(v)
    })
  })
}

/**
 * El veredicto para `userId`, preguntado una vez por montaje. Con `activo` en
 * false (o sin usuario) no pregunta nada y responde `terminado`: no hay
 * registro de inmobiliaria del que hablar. Un `terminado` ya recordado sale
 * en el primer render, sin cargador.
 */
export function useRegistroDeLaInmobiliaria(
  userId: string | null,
  activo = true,
): EstadoDelRegistro {
  const debePreguntar = activo && userId != null
  const [veredicto, setVeredicto] = useState<{ para: string; es: VeredictoDelRegistro } | null>(
    null,
  )

  useEffect(() => {
    if (!debePreguntar || !userId || registroYaVerificado(userId)) return
    let vivo = true
    void conTope(preguntarPorElRegistro()).then((respuesta) => {
      if (!vivo) return
      if (respuesta === 'terminado') recordarTerminado(userId)
      setVeredicto({ para: userId, es: respuesta === 'sin-agencia' ? 'terminado' : respuesta })
    })
    return () => {
      vivo = false
    }
  }, [debePreguntar, userId])

  if (!debePreguntar || !userId) return 'terminado'
  if (veredicto?.para === userId) return veredicto.es
  if (registroYaVerificado(userId)) return 'terminado'
  return 'verificando'
}

/** Adónde va quien tiene el registro a medias. */
export const RUTA_DEL_ASISTENTE = '/onboarding/inmobiliaria'
