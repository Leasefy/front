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
 *   qa.{overall,tone,          qaDimensions.{empatia,claridad,
 *       recovery,clarity}                    adherencia,objeciones}
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
 * Las dimensiones llegan 0-100. El agente hace la conversión desde la escala
 * del evaluador (enteros 0-5) en `shared/qa-dimensions.ts`; acá NO se
 * reescala nada.
 *
 * ── Nombres de las dimensiones ───────────────────────────────────────────────
 *
 * Segunda pasada del mismo bug: el contrato decía
 * `{ rapport, compliance, resolution, sentiment }` y el evaluador
 * (`qa-scorer.ts`) escribe `{ empatia, claridad, adherencia, objeciones }`.
 * Los cuatro campos llegaban en `null` y la tarjeta «Calidad de la llamada»
 * decía siempre «QA pendiente» aun con el puntaje en la base. Mandan los
 * nombres del evaluador: son las dimensiones que de verdad se miden en una
 * cobranza.
 *
 * Las llamadas viejas con las claves antiguas (siembra de demo del 2026-08-08)
 * llegan con las cuatro en `null` — el agente las ignora a propósito, ver
 * `src/server/routes/shared/qa-dimensions.ts`. La pantalla no se rompe: `null`
 * ya era un valor válido para las cuatro, y esas llamadas muestran
 * «QA pendiente», que es literalmente cierto.
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

/**
 * Dimensiones reales de QA, en escala 0-100. `overall` es el promedio.
 *
 * Las claves son las del evaluador. Las etiquetas en español las pone
 * `CallQAPanel` vía i18n: Empatía · Claridad · Adherencia al guion ·
 * Manejo de objeciones.
 */
export interface CallQAScores {
  overall: number | null
  empatia: number | null
  claridad: number | null
  adherencia: number | null
  objeciones: number | null
  /**
   * false = alguna regla dura de cumplimiento falló y `overall` quedó capado
   * a 40 (fórmula del evaluador: `min(calidad, 40)`). `null` = llamada
   * anterior a que el agente expusiera el campo.
   */
  compliance: boolean | null
  /** Slugs de las reglas violadas (`qa_details.violations` del agente). */
  violations: string[]
  /** Calidad conversacional 0-100 SIN capar (la suma de dimensiones). */
  quality: number | null
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

  const promedio = averageOf([d.empatia, d.claridad, d.adherencia, d.objeciones])
  const qa: CallQAScores = {
    // «General» es el puntaje OPERATIVO (combinado con cumplimiento), no el
    // promedio del juez: mostrar 80 cuando la base dice 40 era contar dos
    // verdades distintas con el mismo nombre (llamada 01a03712). El promedio
    // queda de respaldo para llamadas anteriores al campo.
    overall: raw.qaScore ?? promedio,
    empatia: d.empatia,
    claridad: d.claridad,
    adherencia: d.adherencia,
    objeciones: d.objeciones,
    compliance: raw.qaCompliance ?? null,
    violations: raw.qaViolations ?? [],
    quality: raw.qaQuality ?? promedio,
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
