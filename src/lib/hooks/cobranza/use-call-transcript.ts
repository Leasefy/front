'use client'

/**
 * use-call-transcript.ts — turnos de una llamada para el panel de réplica.
 *   GET /api/agency/{agencyId}/cobranza/calls/{callId}/transcript
 *
 * ── Por qué hay normalizador ─────────────────────────────────────────────────
 *
 * La versión anterior declaraba el contrato a mano y ningún campo coincidía:
 *
 *   el front decía          el agente manda
 *   ─────────────────       ──────────────────────────────
 *   id                      index (número de turno)
 *   startSec / endSec       startedAt / endedAt (ISO)
 *   complianceFlagIds       complianceFlags
 *   speaker: operador|      speaker: operator|agent|customer
 *            deudor|bot
 *
 * `turn.complianceFlagIds.map(...)` sobre `undefined` tumbaba la pantalla
 * entera. No se veía porque `agent.call_turns` estaba VACÍA: el componente
 * nunca llegaba a recorrer los turnos. Apenas se sembraron datos reales,
 * apareció. Es el caso de manual de «una pantalla vacía puede ser un contrato
 * roto».
 *
 * ── Los segundos ─────────────────────────────────────────────────────────────
 *
 * El panel navega el audio por segundo (`onSeek`), pero el backend manda una
 * marca de tiempo absoluta por turno y NO el fin (la tabla no tiene columna).
 * El segundo relativo se calcula contra el primer turno; la duración de cada
 * turno se infiere del comienzo del siguiente.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { paths } from '@/lib/api/generated/agent'

// ── Contrato ──────────────────────────────────────────────────────────────────

export type TranscriptApiResponse =
  paths['/api/agency/{agencyId}/cobranza/calls/{callId}/transcript']['get']['responses'][200]['content']['application/json']

type TranscriptApiTurn = TranscriptApiResponse['turns'][number]

/** Los tres tokens que emite `normalizeSpeaker` del agente. */
export type TranscriptSpeaker = 'operator' | 'agent' | 'customer' | string

export interface TranscriptTurn {
  id: string
  speaker: TranscriptSpeaker
  /** Segundos desde el inicio de la llamada — para saltar en el audio. */
  startSec: number
  /** Fin inferido del comienzo del turno siguiente; el último no tiene. */
  endSec: number | null
  /** Ya viene redactado por el backend (T-31-PII). NO loguearlo. */
  text: string
  complianceFlagIds: string[]
}

export interface CallTranscriptResponse {
  turns: TranscriptTurn[]
  totalTurns: number
  generatedAt: string
}

// ── Normalizador ──────────────────────────────────────────────────────────────

function segundosDesde(base: number, iso: string): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.round((t - base) / 1000))
}

export function normalizeTranscript(raw: TranscriptApiResponse): CallTranscriptResponse {
  const turnos: TranscriptApiTurn[] = raw.turns ?? []

  // Origen de tiempos: el primer turno. Si no hay turnos no hay nada que ubicar.
  const base = turnos.length > 0 ? new Date(turnos[0].startedAt).getTime() : 0
  const baseValida = Number.isFinite(base) && !Number.isNaN(base)

  const turns: TranscriptTurn[] = turnos.map((t, i) => {
    const startSec = baseValida ? segundosDesde(base, t.startedAt) : 0
    const siguiente = turnos[i + 1]
    const endSec =
      t.endedAt != null
        ? segundosDesde(base, t.endedAt)
        : siguiente
          ? segundosDesde(base, siguiente.startedAt)
          : null

    return {
      // La tabla no expone el uuid del turno; `index` es único dentro de la
      // llamada y es lo que el backend usa para ordenarlos.
      id: `turno-${t.index}`,
      speaker: t.speaker,
      startSec,
      endSec,
      text: t.text ?? '',
      // El backend NO tiene marcas de cumplimiento por turno (viven a nivel de
      // llamada). Array vacío, no `undefined` — que era justo lo que reventaba.
      complianceFlagIds: t.complianceFlags ?? [],
    }
  })

  return {
    turns,
    totalTurns: raw.totalTurns ?? turns.length,
    generatedAt: raw.generatedAt,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseCallTranscriptArgs {
  callId: string
}

export interface UseCallTranscriptResult {
  data: CallTranscriptResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCallTranscript({
  callId,
}: UseCallTranscriptArgs): UseCallTranscriptResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CallTranscriptResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCallTranscript] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !callId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}/transcript`,
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as TranscriptApiResponse
      // T-31-PII: el texto NO va a analytics ni a reporters. Sólo a estado.
      setData(normalizeTranscript(json))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transcript')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, callId])

  useEffect(() => {
    if (!agencyId || !callId) return
    void fetchData()
  }, [fetchData, agencyId, callId])

  useVisibilityPolling(fetchData, 30_000, Boolean(agencyId && callId))

  return { data, isLoading, error, refetch: fetchData }
}
