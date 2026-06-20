'use client'

/**
 * Hooks del agente de Retención ("Laura"). Patrón calcado de
 * `useCarteraOverview`: useAuth → agencyId, fetch con bearer, estados
 * { data, isLoading, error, refetch }. Mock-first vía el cliente (`usingMock`).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { fetchBandeja, fetchCaseBundle, fetchDashboard } from '@/lib/api/retencion'
import type {
  BandejaResult,
  BandejaTab,
  CaseBundle,
  RetencionDashboard,
} from '@/lib/types/retencion'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  usingMock: boolean
}

const TIMEOUT_MS = 12_000

export function useRetencionDashboard() {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [state, setState] = useState<AsyncState<RetencionDashboard>>({
    data: null,
    isLoading: true,
    error: null,
    usingMock: false,
  })
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    setState((s) => ({ ...s, isLoading: true }))
    try {
      const { data, usingMock } = await fetchDashboard(agencyId ?? 'demo', controller.signal)
      if (controller.signal.aborted) return
      setState({ data, isLoading: false, error: null, usingMock })
    } catch (err) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, isLoading: false, error: err instanceof Error ? err.message : 'error' }))
    } finally {
      clearTimeout(timer)
    }
  }, [agencyId])

  useEffect(() => {
    void refetch()
    return () => abortRef.current?.abort()
  }, [refetch])

  return { ...state, refetch }
}

export function useRetencionBandeja(tab: BandejaTab | 'todos' = 'todos') {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [state, setState] = useState<AsyncState<BandejaResult>>({
    data: null,
    isLoading: true,
    error: null,
    usingMock: false,
  })
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    setState((s) => ({ ...s, isLoading: true }))
    try {
      const { data, usingMock } = await fetchBandeja(agencyId ?? 'demo', tab, controller.signal)
      if (controller.signal.aborted) return
      setState({ data, isLoading: false, error: null, usingMock })
    } catch (err) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, isLoading: false, error: err instanceof Error ? err.message : 'error' }))
    } finally {
      clearTimeout(timer)
    }
  }, [agencyId, tab])

  useEffect(() => {
    void refetch()
    return () => abortRef.current?.abort()
  }, [refetch])

  return { ...state, refetch }
}

export function useRetencionCaso(caseId: string) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [state, setState] = useState<AsyncState<CaseBundle>>({
    data: null,
    isLoading: true,
    error: null,
    usingMock: false,
  })
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    if (!caseId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    setState((s) => ({ ...s, isLoading: true }))
    try {
      const { data, usingMock } = await fetchCaseBundle(agencyId ?? 'demo', caseId, controller.signal)
      if (controller.signal.aborted) return
      setState({ data, isLoading: false, error: null, usingMock })
    } catch (err) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, isLoading: false, error: err instanceof Error ? err.message : 'error' }))
    } finally {
      clearTimeout(timer)
    }
  }, [agencyId, caseId])

  useEffect(() => {
    void refetch()
    return () => abortRef.current?.abort()
  }, [refetch])

  return { ...state, refetch }
}
