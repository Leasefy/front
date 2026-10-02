'use client'

// Phase 33 plan 33-04 (COTI-UI-04, D-33-01, D-33-05, D-33-07, D-33-13)
// Custom hook wrapping POST /api/agency/:id/cotizador/ask-why.
// No SWR library installed in mvp — manual useState pattern with 5 typed
// error branches (429/404/timeout/5xx/400) plus network error (TypeError).
//
// Security note (T-33-04-03): the daily cap is enforced server-side; this
// hook only surfaces the 429 error. Bypassing the disabled submit in the UI
// still results in 429 from the backend.

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import { falloDeLaRespuesta } from '@/lib/hooks/cotizador/fallo-de-la-respuesta'
import {
  camposDelError,
  leerFallo,
  mensajeParaLaPersona,
  type CampoConError,
} from '@/lib/errores/traductor-de-errores'

export type AskWhyVariable = 'canon' | 'ciudad' | 'tipo' | 'codeudores'

export interface AskWhyNewValue {
  canon?: number
  ciudad?: string
  tipo?: string
  codeudores?: number
}

export interface AskWhyResult {
  narrative_es: string
  cost_usd: number
  hypothetical_carriers: CarrierState[]
}

/**
 * El fallo de la pregunta, con lo que se le dice a la persona (02-10-2026).
 *
 * `code` decide qué pinta el modal (el banner del tope, el reintento, el
 * 404 que cierra). `mensaje` es la frase en español, ya pasada por el
 * traductor con la regla de oro: «conexión» sólo cuando no hubo respuesta;
 * un 4xx dice qué está mal (el `message` del sobre del micro, nunca su
 * `error` en inglés ni «HTTP 400»); un 5xx dice «de nuestro lado» con la
 * referencia. `fallo` es el error entero, para quien quiera repartirlo.
 */
export type AskWhyError = (
  | { code: 429; cap: number; used: number; resets_at: string }
  | { code: 404 }
  | { code: 'timeout' }
  | { code: 500 | 'network' }
  /**
   * Un 4xx que no es el tope ni el 404 (400, 422, 403, 409…). `message` es la
   * misma frase de `mensaje` (se conserva el nombre de siempre); `campos`,
   * lo que el micro dijo por campo.
   */
  | { code: 400; message: string; campos: CampoConError[]; status: number }
) & { mensaje: string; fallo?: unknown }

/** Lo que se estaba haciendo, para el texto de un 5xx («No pudimos …: algo falló de nuestro lado»). */
const ACCION = 'explicar ese cambio'

/** Un 4xx que no trae nada legible. */
const POR_DEFECTO_4XX = 'No pudimos explicar ese cambio. Revisa el valor e intenta de nuevo.'

/**
 * El tope diario sin el sobre (un micro viejo): «Usaste las N preguntas de
 * hoy». Con el sobre, gana su `message`.
 */
function mensajeDelTope(cap: number): string {
  return cap > 0
    ? `Usaste las ${cap} preguntas de hoy. Vuelve a preguntar mañana.`
    : 'Llegaste al tope de preguntas de hoy. Vuelve a preguntar mañana.'
}

function esFalloDeLaPregunta(v: unknown): v is AskWhyError {
  return Boolean(v && typeof v === 'object' && 'code' in v && typeof (v as { mensaje?: unknown }).mensaje === 'string')
}

/** El fallo de una respuesta que no salió bien, ya tipado para el modal. */
async function falloDeLaPregunta(res: Response): Promise<AskWhyError> {
  const fallo = await falloDeLaRespuesta(res)
  const cuerpo = (fallo.detalle ?? {}) as { cap?: unknown; used?: unknown; resets_at?: unknown }
  if (res.status === 429) {
    const cap = typeof cuerpo.cap === 'number' ? cuerpo.cap : 0
    return {
      code: 429,
      cap,
      used: typeof cuerpo.used === 'number' ? cuerpo.used : 0,
      resets_at: typeof cuerpo.resets_at === 'string' ? cuerpo.resets_at : '',
      mensaje: mensajeParaLaPersona(fallo, { porDefecto: mensajeDelTope(cap) }),
      fallo,
    }
  }
  if (res.status === 404) {
    return {
      code: 404,
      mensaje: mensajeParaLaPersona(fallo, { porDefecto: 'Esta cotización ya no está disponible.' }),
      fallo,
    }
  }
  if (res.status >= 400 && res.status < 500) {
    const mensaje = mensajeParaLaPersona(fallo, { porDefecto: POR_DEFECTO_4XX, accion: ACCION })
    return { code: 400, message: mensaje, mensaje, campos: camposDelError(fallo), status: res.status, fallo }
  }
  // Un 5xx (o algo raro): de nuestro lado, con la referencia si el micro la mandó.
  return { code: 500, mensaje: mensajeParaLaPersona(fallo, { accion: ACCION }), fallo }
}

export interface AskWhyPayload {
  quote_id: string
  variable: AskWhyVariable
  new_value: AskWhyNewValue[AskWhyVariable]
}

const REQUEST_TIMEOUT_MS = 10_000

export function useAskWhy(agencyId: string | null): {
  mutate: (payload: AskWhyPayload) => Promise<AskWhyResult>
  isLoading: boolean
  error: AskWhyError | null
  reset: () => void
} {
  useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AskWhyError | null>(null)
  const inflightRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setError(null)
  }, [])

  const mutate = useCallback(
    async (payload: AskWhyPayload): Promise<AskWhyResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agencyId || !agentUrl) {
        // No es la conexión: a este panel le falta la pieza (la URL del
        // micro o la inmobiliaria). Es nuestro, no de quien pregunta.
        const sinConfigurar: AskWhyError = {
          code: 500,
          mensaje: 'Las explicaciones del cotizador no están disponibles en este momento. No es nada que hayas hecho.',
        }
        setError(sinConfigurar)
        throw sinConfigurar
      }

      // Abort any previous in-flight request before starting a new one.
      inflightRef.current?.abort()
      const controller = new AbortController()
      inflightRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      setIsLoading(true)
      setError(null)

      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cotizador/ask-why`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
            signal: controller.signal,
          },
        )

        if (!res.ok) {
          // El sobre del micro (`code`, `message`, `campos`, `referencia`),
          // por el traductor. Antes un 400 decía su `error` en inglés
          // («invalid_variable») y cualquier otro 4xx caía en «error genérico».
          const typed = await falloDeLaPregunta(res)
          setError(typed)
          throw typed
        }

        const json: AskWhyResult = await res.json()
        return json
      } catch (caught) {
        // Already-typed AskWhyError thrown above — re-throw without re-handling.
        // Se reconoce por `mensaje`, no por `code`: el `DOMException` de un
        // `abort()` también trae `code` (20) y se relanzaba crudo, sin que el
        // modal se enterara del corte por tiempo.
        if (esFalloDeLaPregunta(caught)) {
          throw caught
        }
        // AbortError = either explicit abort or timeout.
        if (caught instanceof Error && caught.name === 'AbortError') {
          const typed: AskWhyError = {
            code: 'timeout',
            mensaje: 'La explicación tardó demasiado en llegar. Prueba de nuevo en un momento.',
            fallo: caught,
          }
          setError(typed)
          throw typed
        }
        // «Conexión» SÓLO si el pedido no salió (el `TypeError` del fetch).
        // Cualquier otra cosa —una respuesta que no se pudo leer— es nuestra.
        // (El texto de un error de JavaScript —«Unexpected end of JSON
        // input»— no es para nadie: va la frase de «nuestro lado».)
        const typed: AskWhyError =
          leerFallo(caught).tipo === 'sinRespuesta'
            ? { code: 'network', mensaje: mensajeParaLaPersona(caught), fallo: caught }
            : {
                code: 500,
                mensaje: `No pudimos ${ACCION}: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.`,
                fallo: caught,
              }
        setError(typed)
        throw typed
      } finally {
        clearTimeout(timeoutId)
        if (inflightRef.current === controller) {
          inflightRef.current = null
        }
        setIsLoading(false)
      }
    },
    [agencyId],
  )

  return { mutate, isLoading, error, reset }
}
