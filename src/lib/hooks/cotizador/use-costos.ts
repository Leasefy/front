'use client'

/**
 * use-costos.ts — Phase 35 plan 35-10 (D-35-08)
 *
 * Dual-interval polling hook for the cost dashboard page.
 *   - fetchSummary: GET /costos/summary  — polled every 30s (KPI strip refresh rate)
 *   - fetchSeries:  GET /costos/series   — polled every 60s (aggregate chart refresh rate)
 *
 * Both fetch cycles are INDEPENDENT — separate useState/useCallback/useEffect/setInterval pairs.
 * agencyId sourced exclusively from useAuth().agency?.id (JWT-derived). Never from URL/body (T-35-15).
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// =============================================================================
// Interfaces — declared inline (types not yet in generated OpenAPI types)
// =============================================================================

export interface CostSourceRow {
  key: string
  label: string
  populated: boolean
  notes: string | null
}

export interface CostosSummaryResponse {
  kpis: {
    costPerQuoteUsd: number | null      // null when no quotes processed
    monthlyBurnUsd: number | null
    forecast30dUsd: number | null       // null when <7d of data (T-35-09)
  }
  sources: {
    anthropicTotal: number
    carrierApiTotal: number
    sekureCommissionTotal: number
    datacreditoTotal: number
  }
  costSources: CostSourceRow[]
  generatedAt: string
}

export interface CostSeriesRow {
  period: string
  anthropic: number
  carrier_api: number
  sekure_commission: number
  datacredito: number
  total: number
  isForecast?: boolean
}

export interface CostSeriesResponse {
  rows: CostSeriesRow[]
}

// =============================================================================
// Interval constants (D-35-08)
// =============================================================================

// =============================================================================
// 🔴 22-09 · Lo que el agente MANDA no es lo que estas interfaces dicen.
//
// Estas interfaces se escribieron a mano «porque los tipos aún no estaban en el
// OpenAPI generado», y el agente se construyó distinto: los totales vienen
// sueltos arriba (`anthropicTotal`…, como texto), los KPI también, y cada
// fuente trae `source`, no `key`/`label`. La serie no acepta `group_by=month`
// (sólo `day | carrier | source`) y respondía 400. Resultado en el QA del
// 22-09: Asegurabilidad → Costos se caía con `Cannot read properties of
// undefined (reading 'replace')` al primer dato.
//
// La pantalla conserva su forma; la traducción vive acá, contra la forma real
// (la de `src/lib/api/generated/agent.ts`: `CostosSummaryResponse`).
// =============================================================================

/** La respuesta de `/costos/summary` tal como la manda el agente. */
export interface ResumenDeCostosDelAgente {
  costPerQuoteUsd: number
  monthlyBurnUsd: number
  forecast30dUsd: number | null
  anthropicTotal: string
  carrierApiTotal: string
  sekureCommissionTotal: string
  datacreditoTotal: string
  costSources: Array<{ source: string; populated: boolean; computationStrategyNote: string | null }>
  generatedAt: string
}

/** Una fila de `/costos/series?group_by=day` tal como la manda el agente. */
export interface DiaDeCostosDelAgente {
  day: string
  anthropicCostUsd: string
  carrierApiCostUsd: string
  sekureCommissionUsd: string
  datacreditoCostUsd: string
  totalCostUsd: string
  quoteCount: number
}

const NOMBRE_DE_LA_FUENTE: Record<string, string> = {
  anthropic: 'IA (Anthropic)',
  carrier_api: 'API de las aseguradoras',
  sekure_commission: 'Comisión de Sekure',
  datacredito: 'Datacrédito',
}

const numero = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

export function resumenDesdeElAgente(r: ResumenDeCostosDelAgente): CostosSummaryResponse {
  return {
    kpis: {
      // Sin cotizaciones el costo por cotización no existe: no es un cero.
      costPerQuoteUsd: Number.isFinite(r.costPerQuoteUsd) ? r.costPerQuoteUsd : null,
      monthlyBurnUsd: Number.isFinite(r.monthlyBurnUsd) ? r.monthlyBurnUsd : null,
      forecast30dUsd: r.forecast30dUsd ?? null,
    },
    sources: {
      anthropicTotal: numero(r.anthropicTotal),
      carrierApiTotal: numero(r.carrierApiTotal),
      sekureCommissionTotal: numero(r.sekureCommissionTotal),
      datacreditoTotal: numero(r.datacreditoTotal),
    },
    costSources: (r.costSources ?? []).map((f) => ({
      key: f.source,
      label: NOMBRE_DE_LA_FUENTE[f.source] ?? f.source,
      populated: f.populated,
      notes: f.computationStrategyNote,
    })),
    generatedAt: r.generatedAt,
  }
}

/** El rótulo de mes que usa `MonthlyCostTrendChart` («May 26»). */
function rotuloDelMes(dia: string): string {
  const [anio, mes] = dia.slice(0, 7).split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, 15))
  return `${fecha.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${String(anio).slice(2)}`
}

/** Suma los días del agente por mes, en orden. */
export function serieMensualDesdeDias(dias: DiaDeCostosDelAgente[]): CostSeriesResponse {
  const porMes = new Map<string, CostSeriesRow>()
  for (const d of [...dias].sort((a, b) => a.day.localeCompare(b.day))) {
    const clave = d.day.slice(0, 7)
    const fila = porMes.get(clave) ?? {
      period: rotuloDelMes(d.day),
      anthropic: 0,
      carrier_api: 0,
      sekure_commission: 0,
      datacredito: 0,
      total: 0,
    }
    fila.anthropic += numero(d.anthropicCostUsd)
    fila.carrier_api += numero(d.carrierApiCostUsd)
    fila.sekure_commission += numero(d.sekureCommissionUsd)
    fila.datacredito += numero(d.datacreditoCostUsd)
    fila.total += numero(d.totalCostUsd)
    porMes.set(clave, fila)
  }
  return { rows: [...porMes.values()] }
}

const KPI_POLL_INTERVAL_MS = 30_000     // 30s — KPI strip
const CHART_POLL_INTERVAL_MS = 60_000   // 60s — charts / aggregates

// =============================================================================
// Hook: useCostos
// =============================================================================

export function useCostos(): {
  summaryData: CostosSummaryResponse | null
  seriesData: CostSeriesResponse | null
  isLoadingSummary: boolean
  isLoadingSeries: boolean
  summaryError: string | null
  seriesError: string | null
  refetchSummary: () => Promise<void>
  refetchSeries: () => Promise<void>
} {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  // ---------------------------------------------------------------------------
  // Summary state (30s polling)
  // ---------------------------------------------------------------------------

  const [summaryData, setSummaryData] = useState<CostosSummaryResponse | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCostos] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoadingSummary(false)
      return
    }
    if (!agencyId) {
      setIsLoadingSummary(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/costos/summary`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ResumenDeCostosDelAgente
      setSummaryData(resumenDesdeElAgente(json))
      setSummaryError(null)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to fetch cost summary')
    } finally {
      setIsLoadingSummary(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoadingSummary(false); return }
    void fetchSummary()
    const id = setInterval(() => void fetchSummary(), KPI_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchSummary, agencyId])

  // ---------------------------------------------------------------------------
  // Series state (60s polling)
  // ---------------------------------------------------------------------------

  const [seriesData, setSeriesData] = useState<CostSeriesResponse | null>(null)
  const [isLoadingSeries, setIsLoadingSeries] = useState(true)
  const [seriesError, setSeriesError] = useState<string | null>(null)

  const fetchSeries = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setIsLoadingSeries(false)
      return
    }
    if (!agencyId) {
      setIsLoadingSeries(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/costos/series?group_by=day`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as { rows?: DiaDeCostosDelAgente[] }
      setSeriesData(serieMensualDesdeDias(json.rows ?? []))
      setSeriesError(null)
    } catch (err) {
      setSeriesError(err instanceof Error ? err.message : 'Failed to fetch cost series')
    } finally {
      setIsLoadingSeries(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoadingSeries(false); return }
    void fetchSeries()
    const id = setInterval(() => void fetchSeries(), CHART_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchSeries, agencyId])

  return {
    summaryData,
    seriesData,
    isLoadingSummary,
    isLoadingSeries,
    summaryError,
    seriesError,
    refetchSummary: fetchSummary,
    refetchSeries: fetchSeries,
  }
}
