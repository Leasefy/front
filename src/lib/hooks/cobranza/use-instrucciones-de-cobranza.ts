'use client'

/**
 * use-instrucciones-de-cobranza.ts — lo que la inmobiliaria le pide a Mori, en
 * sus palabras (21-10-2026, Nico: «La IA lo traduce y la inmobiliaria
 * confirma»).
 *
 *   1. `revisar(texto)`   → «así lo entendió Mori» (no guarda nada).
 *   2. `confirmar(...)`   → guarda esa revisión con las respuestas a sus dudas,
 *                           menos lo que quitó.
 *   3. `deshacer()`       → vuelve a lo anterior (15 minutos después de guardar).
 *
 * Los tipos salen de `api/generated/agent`: el contrato es del micro.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import type { components } from '@/lib/api/generated/agent'

export type InstruccionesDeCobranza = components['schemas']['InstruccionesDeCobranza']
export type RevisionDeLasInstrucciones = components['schemas']['InstruccionesDeCobranzaRevision']
export type ReglaDeLaInmobiliaria = components['schemas']['ReglaDeCobranzaDeLaInmobiliaria']
export type DudaDeLaRevision = components['schemas']['DudaDeLasInstruccionesDeCobranza']

export interface UseInstruccionesDeCobranzaResult {
  datos: InstruccionesDeCobranza | null
  isLoading: boolean
  /** El error tal cual (lo pinta `FalloDeCarga`). */
  error: unknown
  recargar: () => void
  /** Tira el `ApiError` del micro; la pantalla lo traduce. */
  revisar: (texto: string) => Promise<RevisionDeLasInstrucciones>
  confirmar: (args: {
    texto: string
    revisionId: string | null
    quitar: string[]
    respuestas: Record<string, number>
  }) => Promise<InstruccionesDeCobranza>
  deshacer: () => Promise<InstruccionesDeCobranza>
}

export function useInstruccionesDeCobranza(): UseInstruccionesDeCobranzaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [datos, setDatos] = useState<InstruccionesDeCobranza | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [vuelta, setVuelta] = useState(0)

  const base = useCallback((): string | null => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return null
    return `${agentUrl}/api/agency/${agencyId}/cobranza/instrucciones`
  }, [agencyId])

  useEffect(() => {
    const url = base()
    if (!url) {
      setIsLoading(false)
      return
    }
    let vivo = true
    setIsLoading(true)
    void (async () => {
      try {
        const res = await agentFetch(url)
        if (!res.ok) throw await falloDelMicro(res)
        const json = (await res.json()) as InstruccionesDeCobranza
        if (vivo) {
          setDatos(json)
          setError(null)
        }
      } catch (err) {
        if (vivo) setError(err)
      } finally {
        if (vivo) setIsLoading(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [base, vuelta])

  const recargar = useCallback(() => setVuelta((v) => v + 1), [])

  const enviar = useCallback(
    async (sufijo: string, metodo: 'POST' | 'PUT', cuerpo?: unknown) => {
      const url = base()
      if (!url) throw new Error('El agente no está configurado.')
      const res = await agentFetch(`${url}${sufijo}`, {
        method: metodo,
        headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
      })
      if (!res.ok) throw await falloDelMicro(res)
      return res.json()
    },
    [base],
  )

  const revisar = useCallback(
    async (texto: string) => (await enviar('/interpretar', 'POST', { texto })) as RevisionDeLasInstrucciones,
    [enviar],
  )

  const confirmar = useCallback<UseInstruccionesDeCobranzaResult['confirmar']>(
    async (args) => {
      const json = (await enviar('', 'PUT', args)) as InstruccionesDeCobranza
      setDatos(json)
      return json
    },
    [enviar],
  )

  const deshacer = useCallback(async () => {
    try {
      const json = (await enviar('/deshacer', 'POST')) as InstruccionesDeCobranza
      setDatos(json)
      return json
    } catch (e) {
      // Ya pasaron los 15 minutos (o no había nada antes): se deja de ofrecer. El error sigue
      // subiendo para que la pantalla lo diga.
      if ((e as { code?: string }).code === 'NADA_QUE_DESHACER') {
        setDatos((d) => (d ? { ...d, puedeDeshacer: false } : d))
      }
      throw e
    }
  }, [enviar])

  return { datos, isLoading, error, recargar, revisar, confirmar, deshacer }
}
