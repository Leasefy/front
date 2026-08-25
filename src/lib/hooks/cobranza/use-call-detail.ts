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
import {
  complianceEventLabel,
  complianceEventSeverity,
  type ComplianceSeverity,
} from '@/lib/cobranza/compliance-vocab'
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
 * Evento de cumplimiento ocurrido durante la llamada.
 *
 * Sale de `agent.compliance_events`, que es donde el agente los escribe de
 * verdad. Antes esto leía `calls.compliance_flags` —columna que nadie escribe,
 * vacía en las 129 llamadas— así que el panel no mostró nunca nada.
 *
 * `at` es la hora absoluta del evento: con eso el transcript puede ubicarlo en
 * el turno que estaba ocurriendo, sin inventar un `atSec: 0` que resaltaría el
 * segundo cero de toda llamada.
 */
export interface CallComplianceEvent {
  id: string
  code: string
  label: string
  severity: ComplianceSeverity
  at: string
  channel: string | null
}

export interface CallStateTraceRow {
  id: string
  fromStage: string | null
  toStage: string
  reason: string
  actor: string
  at: string
}

/**
 * Desglose de costo, tipado DESDE el contrato — no a mano.
 *
 * `platformUsd` (la tarifa del proveedor de voz) suele ser el componente más
 * grande; en la llamada real que verifiqué, 0.0812 de 0.1405. Repartirlo entre
 * las otras categorías haría que las partes no sumen el total.
 */
export type CallCostBreakdown = CallDetailApiResponse['costBreakdown']

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
  complianceEvents: CallComplianceEvent[]
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
    complianceEvents: (raw.complianceEvents ?? []).map((e) => ({
      id: e.id,
      code: e.code,
      label: complianceEventLabel(e.code),
      severity: complianceEventSeverity(e.code),
      at: e.at,
      channel: e.channel,
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
