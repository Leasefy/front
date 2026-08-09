'use client'

/**
 * Busca la grabación de una llamada.
 *
 * POR QUÉ EXISTE: hasta 2026-08-08 la pantalla decidía si había audio mirando
 * `hasRecording`, que sale de `agent.calls.recording_url` — una copia local que
 * sólo se llena si llegó el `end-of-call-report` de Vapi. El audio en cambio
 * vive en Vapi, y el proxy se lo pide EN VIVO por id de llamada.
 *
 * Las dos cosas se desincronizan: medido contra la base de desarrollo, 50 de 96
 * llamadas reales tenían la columna vacía y las 12 que muestreé SÍ tenían audio
 * en Vapi. La pantalla decía «no tiene grabación» sobre grabaciones que estaban
 * a un request de distancia, y ni siquiera lo intentaba.
 *
 * Así que acá se pregunta en vez de suponer. La columna sirve como pista para
 * listados; para reproducir, la verdad es la respuesta del proxy.
 *
 * La distinción entre 404 y cualquier otro error es deliberada: «no hay
 * grabación» y «no pudimos traerla» son cosas distintas para quien audita una
 * llamada, y confundirlas ya nos costó caro en otras pantallas.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'

export type RecordingState =
  | { status: 'probing' }
  | { status: 'ready'; objectUrl: string }
  | { status: 'absent' }
  | { status: 'failed' }

/**
 * Traduce el HTTP del proxy a un estado.
 *
 * El proxy responde 404 tanto si la llamada no existe en Vapi como si existe
 * sin grabación; en ambos casos no hay audio que ofrecer. Todo lo demás —502
 * por falta de credenciales o Vapi caído, 401, 500— es una falla nuestra y se
 * dice como tal.
 */
export function classifyRecordingStatus(httpStatus: number): 'absent' | 'failed' {
  return httpStatus === 404 ? 'absent' : 'failed'
}

export function useCallRecording(
  agencyId: string,
  callId: string,
): { state: RecordingState; retry: () => void } {
  const [state, setState] = useState<RecordingState>({ status: 'probing' })
  const [attempt, setAttempt] = useState(0)

  // Guarda anti-respuestas-fuera-de-orden: si se cambia de llamada rápido, la
  // respuesta lenta de la anterior no puede pisar a la nueva.
  const requestSeq = useRef(0)

  useEffect(() => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId || !callId) {
      setState({ status: 'failed' })
      return
    }

    const seq = ++requestSeq.current
    let cancelled = false
    let createdUrl = ''
    setState({ status: 'probing' })

    const vigente = () => !cancelled && seq === requestSeq.current

    void agentFetch(
      `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}/audio`,
    )
      .then(async (r) => {
        if (!vigente()) return
        if (!r.ok) {
          setState({ status: classifyRecordingStatus(r.status) })
          return
        }
        const blob = await r.blob()
        if (!vigente()) return
        // Un cuerpo vacío no es una grabación: sonaría como un audio de 0s.
        if (blob.size === 0) {
          setState({ status: 'absent' })
          return
        }
        createdUrl = URL.createObjectURL(blob)
        setState({ status: 'ready', objectUrl: createdUrl })
      })
      .catch(() => {
        if (!vigente()) return
        setState({ status: 'failed' })
      })

    return () => {
      // Invalida esta petición y suelta el blob para no filtrar memoria al
      // navegar entre llamadas.
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [agencyId, callId, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { state, retry }
}
