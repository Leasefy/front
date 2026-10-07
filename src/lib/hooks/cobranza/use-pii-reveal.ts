'use client'

/**
 * use-pii-reveal.ts — Phase 31 plan 31-09 (D-31-06/07/11).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/reveal-pii with
 * { field } and writes the resulting { token, expires_at, value } into the
 * PIIRevealContext. The server writes one audit_log row per reveal (D-31-07)
 * — by design, requesting a fresh token after expiry writes a second row.
 *
 * Does NOT touch localStorage/sessionStorage (D-31-06 enforcement; see also
 * the grep gate documented in 31-09-PLAN.md).
 */

import { useCallback, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  usePIIRevealContext,
  type PIIFieldKey,
  type RevealEntry,
} from '@/lib/context/PIIRevealContext'

interface RevealApiResponse {
  token: string
  expires_at: string
  value: string
}

export interface UsePIIRevealResult {
  mint: () => Promise<boolean>
  isMinting: boolean
  /**
   * Por qué no se pudo revelar, ya en español (`mensajeParaLaPersona`): un 403
   * dice su `message`, un 5xx que fue nuestro (con la referencia), «conexión»
   * sólo si el `fetch` no salió. Antes era el status crudo («403»).
   */
  error: string | null
  /** El error tal cual (el `ApiError` del micro o el de la red), si lo hubo. */
  fallo: unknown
  /** Borra el error (al volver a abrir el diálogo). */
  reset: () => void
  revealed: RevealEntry | undefined
}

const OPCIONES_DEL_MENSAJE = {
  porDefecto: 'No pudimos mostrar el dato.',
  accion: 'mostrar el dato',
}

export function usePIIReveal(args: { field: PIIFieldKey }): UsePIIRevealResult {
  const { field } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const { debtorId, getRevealed, setRevealed } = usePIIRevealContext()
  const [isMinting, setIsMinting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [fallo, setFallo] = useState<unknown>(null)

  const reset = useCallback(() => {
    setError(null)
    setFallo(null)
  }, [])

  const registrarFallo = useCallback((e: unknown) => {
    setFallo(e)
    setError(mensajeParaLaPersona(e, OPCIONES_DEL_MENSAJE))
  }, [])

  const mint = useCallback(async (): Promise<boolean> => {
    setError(null)
    setFallo(null)
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('El agente de cobranza no está configurado para tu inmobiliaria.')
      return false
    }
    if (!agencyId) {
      setError('No encontramos tu inmobiliaria. Vuelve a entrar al panel.')
      return false
    }
    setIsMinting(true)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/reveal-pii`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ field }),
        },
      )
      if (!res.ok) {
        registrarFallo(await falloDelMicro(res))
        return false
      }
      const json = (await res.json()) as RevealApiResponse
      const expiresAt = new Date(json.expires_at).getTime()
      setRevealed(field, {
        token: json.token,
        value: json.value,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 5 * 60_000,
      })
      return true
    } catch (err) {
      // Un `fetch` que no salió llega tal cual: el traductor lo lee como conexión.
      registrarFallo(err)
      return false
    } finally {
      setIsMinting(false)
    }
  }, [agencyId, debtorId, field, setRevealed, registrarFallo])

  return {
    mint,
    isMinting,
    error,
    fallo,
    reset,
    revealed: getRevealed(field),
  }
}
