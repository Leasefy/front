'use client'

/**
 * Hooks de Vinci (retención): la inmobiliaria sale de la sesión (`useAuth`),
 * cada lectura tiene su { data, isLoading, error, refetch } y un corte de
 * tiempo. Sin datos de ejemplo: si el agente falla, `error` lo dice.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { fetchDecisiones, fetchMetricas, fetchOfertas, fetchPlan, fetchRiesgo, fetchUmbral } from '@/lib/api/retencion'
import type { DecisionDeVinci, MetricasDeVinci, OfertaDeVinci, PlanConTareas, RiesgoDeVinci, UmbralDeVinci } from '@/lib/types/retencion'

/** Medir en vivo la inmobiliaria de Nico tarda ≈6 s desde dev: el corte deja margen. */
const CORTE_MS = 30_000

export interface Carga<T> {
  data: T | null
  isLoading: boolean
  error: unknown
  refetch: () => Promise<void>
}

function useCarga<T>(leer: ((agencyId: string, signal: AbortSignal) => Promise<T>) | null, clave: string): Carga<T> {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [estado, setEstado] = useState<{ data: T | null; isLoading: boolean; error: unknown }>({
    data: null,
    isLoading: Boolean(leer),
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  const leerRef = useRef(leer)
  leerRef.current = leer

  const refetch = useCallback(async () => {
    const f = leerRef.current
    if (!agencyId || !f) {
      setEstado((s) => ({ ...s, isLoading: false }))
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(() => controller.abort(), CORTE_MS)
    setEstado((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const data = await f(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setEstado({ data, isLoading: false, error: null })
    } catch (error) {
      if (abortRef.current !== controller) return
      setEstado((s) => ({ ...s, isLoading: false, error }))
    } finally {
      clearTimeout(timer)
    }
  }, [agencyId, clave]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refetch()
    return () => abortRef.current?.abort()
  }, [refetch])

  return { ...estado, refetch }
}

/** Quién está en riesgo. `fresco` = medir ahora en vez de leer lo del barrido de la mañana. */
export function useRiesgoDeVinci(fresco = false): Carga<RiesgoDeVinci> {
  return useCarga((id, s) => fetchRiesgo(id, { fresco }, s), `riesgo:${fresco}`)
}

export function useMetricasDeVinci(): Carga<MetricasDeVinci> {
  return useCarga((id, s) => fetchMetricas(id, s), 'metricas')
}

/** Sólo para el administrador: a otro rol ni se le pide (el micro respondería 403). */
export function useUmbralDeVinci(esAdministrador: boolean): Carga<UmbralDeVinci> {
  return useCarga(esAdministrador ? (id, s) => fetchUmbral(id, s) : null, `umbral:${esAdministrador}`)
}

export function useOfertasDelCaso(caseId: string): Carga<OfertaDeVinci[]> {
  return useCarga((id, s) => fetchOfertas(id, caseId, s), `ofertas:${caseId}`)
}

export function useDecisionesDeVinci(opts: { reviewableOnly?: boolean; caseId?: string; limit?: number } = {}): Carga<DecisionDeVinci[]> {
  return useCarga((id, s) => fetchDecisiones(id, opts, s), `decisiones:${JSON.stringify(opts)}`)
}

export function usePlanDelCaso(planId: string | null): Carga<PlanConTareas> {
  return useCarga(planId ? (id, s) => fetchPlan(id, planId, s) : null, `plan:${planId}`)
}
