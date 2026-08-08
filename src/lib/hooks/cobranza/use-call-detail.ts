'use client'

/**
 * use-call-detail.ts — detalle de UNA llamada.
 *   GET /api/agency/{agencyId}/cobranza/calls/{callId}
 *
 * ── Por qué este archivo tiene un normalizador ───────────────────────────────
 *
 * La versión anterior declaraba el contrato a mano y casi ningún campo existía:
 *
 *   el front decía            el agente manda
 *   ─────────────────────     ──────────────────────────────────────────
 *   qa.{overall,tone,          qaDimensions.{rapport,compliance,
 *       recovery,clarity}                    resolution,sentiment}
 *   durationSec                durationSeconds
 *   cost                       costBreakdown
 *   debtorNameRedacted         (no existe — el detalle NO expone PII del deudor)
 *   complianceFlags: objetos   complianceFlags: string[]
 *   stateTrace.{actor,at}      stateTrace.{actorType,createdAt}
 *
 * Resultado: `data.qa.overall` sobre `undefined` → TypeError → toda la pantalla
 * al error boundary («Algo salió mal en este workspace»), en el 100% de las
 * llamadas. `tsc` en verde todo el tiempo, porque un tipo inventado es
 * internamente coherente.
 *
 * Ahora los tipos salen del contrato generado (`pnpm api:gen`) y un
 * normalizador traduce a la forma que consumen los paneles, así el fixture
 * deja de compilar si el contrato cambia.
 *
 * ── Escala de QA ─────────────────────────────────────────────────────────────
 *
 * Las dimensiones vienen 0-100 (la base lo garantiza:
 * `calls_qa_score_decimal_range`). El código viejo las trataba como 0-1 y las
 * multiplicaba por 100, así que un 88 real se dibujaba como 8800%.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { paths } from '@/lib/api/generated/agent'

// ── Contrato ──────────────────────────────────────────────────────────────────

export type CallDetailApiResponse =
  paths['/api/agency/{agencyId}/cobranza/calls/{callId}']['get']['responses'][200]['content']['application/json']

/** El resumen del CallSummarizer. `null` cuando la llamada no tiene. */
export type CallAiSummaryDetail = CallDetailApiResponse['summary']

export type CallOutcome = string

/** Dimensiones reales de QA, en escala 0-100. `overall` es el promedio. */
export interface CallQAScores {
  overall: number | null
  rapport: number | null
  compliance: number | null
  resolution: number | null
  sentiment: number | null
}

/**
 * El agente manda `complianceFlags` como slugs sueltos: no hay id, ni
 * severidad, ni segundo del audio donde ocurrió. Se conserva la forma que
 * consumen los paneles pero con los campos que NO existen marcados como
 * opcionales — inventarles un `atSec: 0` haría que el transcript resaltara
 * el segundo cero de toda llamada con una alerta.
 */
export interface CallComplianceFlag {
  id: string
  code: string
  label: string
  severity?: 'info' | 'warning' | 'critical'
  atSec?: number
}

export interface CallStateTraceRow {
  id: string
  fromStage: string | null
  toStage: string
  reason: string
  actor: string
  at: string
}

export interface CallCostBreakdown {
  llmUsd: number
  voiceUsd: number
  whatsappUsd: number
  totalUsd: number
}

export interface CallDetail {
  id: string
  debtorId: string | null
  debtorNameMasked: string
  debtorCedulaMasked: string
  direction: string
  channel: string
  status: string
  outcome: CallOutcome | null
  initiatedAt: string
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
  qa: CallQAScores
  complianceFlags: CallComplianceFlag[]
  summary: CallAiSummaryDetail
  hasRecording: boolean
  hasTranscript: boolean
  stateTrace: CallStateTraceRow[]
  cost: CallCostBreakdown
  generatedAt: string
}

// ── Normalizador ──────────────────────────────────────────────────────────────

/** Promedio de las dimensiones presentes. `null` si no hay ninguna. */
function averageOf(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function normalizeCallDetail(raw: CallDetailApiResponse): CallDetail {
  const d = raw.qaDimensions

  const qa: CallQAScores = {
    overall: averageOf([d.rapport, d.compliance, d.resolution, d.sentiment]),
    rapport: d.rapport,
    compliance: d.compliance,
    resolution: d.resolution,
    sentiment: d.sentiment,
  }

  return {
    id: raw.id,
    debtorId: raw.debtorId,
    debtorNameMasked: raw.debtorNameMasked,
    debtorCedulaMasked: raw.debtorCedulaMasked,
    direction: raw.direction,
    channel: raw.channel,
    status: raw.status,
    outcome: raw.outcome,
    initiatedAt: raw.initiatedAt,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    durationSeconds: raw.durationSeconds,
    qa,
    complianceFlags: (raw.complianceFlags ?? []).map((code, i) => ({
      // El slug es lo único que hay: sirve de id porque no se repite dentro
      // de una llamada, y el índice desempata si algún día se repitiera.
      id: `${code}-${i}`,
      code,
      label: code,
    })),
    summary: raw.summary,
    hasRecording: raw.hasRecording,
    hasTranscript: raw.hasTranscript,
    stateTrace: (raw.stateTrace ?? []).map((row) => ({
      id: row.id,
      fromStage: row.fromStage,
      toStage: row.toStage,
      reason: row.reason,
      actor: row.actorType,
      at: row.createdAt,
    })),
    cost: raw.costBreakdown,
    generatedAt: raw.generatedAt,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseCallDetailArgs {
  callId: string
}

export interface UseCallDetailResult {
  data: CallDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCallDetail({ callId }: UseCallDetailArgs): UseCallDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CallDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCallDetail] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !callId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as CallDetailApiResponse
      setData(normalizeCallDetail(json))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch call detail')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, callId])

  useEffect(() => {
    if (!agencyId || !callId) {
      setIsLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, agencyId, callId])

  useVisibilityPolling(fetchData, 30_000, Boolean(agencyId && callId))

  return { data, isLoading, error, refetch: fetchData }
}
