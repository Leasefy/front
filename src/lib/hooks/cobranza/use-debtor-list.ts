'use client'

/**
 * use-debtor-list.ts — Phase 31 plan 31-08 (COBR-UI-02, D-31-13/14/15).
 *
 * Cursor-paginated debtors list hook. Supersedes the 31-07 smoke stub.
 *
 * Pattern: mirrors Phase 29 `use-cartera-overview.ts` (useState + useEffect +
 * setInterval, no SWR — SWR is not yet a mvp dep per Phase 29 inheritance).
 *
 * Behavior:
 *  - First page: GET …/cobranza/debtors?<filters>
 *  - loadMore: GET …/cobranza/debtors?<filters>&cursor=<prev.nextCursor>
 *  - Changing any filter resets pages = [], cursor = null, re-fetches page 1
 *  - Polls page 1 every 30s; polling REPLACES page 1 only (operator scroll
 *    position preserved across already-loaded subsequent pages)
 *  - isLoading=true only on the very first load; subsequent filter changes
 *    use isLoadingMore
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { paths } from '@/lib/api/generated/agent'

// ── Derived types ───────────────────────────────────────────────────────────

type DebtorListOp = paths['/api/agency/{agencyId}/cobranza/debtors']['get']

export type DebtorListQuery = NonNullable<DebtorListOp['parameters']['query']>

export type DebtorListResponse =
  DebtorListOp['responses']['200']['content']['application/json']

export type DebtorListItem = DebtorListResponse['items'][number]

export interface UseDebtorListFilters {
  /** stage CSV ("S1,S2") or undefined for all */
  stage?: string
  /** channel CSV ("voice,whatsapp") */
  channel?: string
  daysMin?: number | null
  daysMax?: number | null
  /** Free text — name LIKE — OR a `HEX:<8hex>` cédula-prefix payload */
  search?: string
}

export interface UseDebtorListResult {
  /** Flat concatenation of page rows (page 1 + appended loadMore pages). */
  pages: DebtorListItem[]
  /** First-page load. */
  isLoading: boolean
  /** loadMore() in flight. */
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  generatedAt: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildQs(filters: UseDebtorListFilters, cursor: string | null): string {
  const qs = new URLSearchParams()
  if (filters.stage) qs.set('stage', filters.stage)
  if (filters.channel) qs.set('channel', filters.channel)
  if (filters.daysMin !== undefined && filters.daysMin !== null)
    qs.set('daysMin', String(filters.daysMin))
  if (filters.daysMax !== undefined && filters.daysMax !== null)
    qs.set('daysMax', String(filters.daysMax))
  if (filters.search) qs.set('search', filters.search)
  if (cursor) qs.set('cursor', cursor)
  return qs.toString()
}

/** Stable serialization of filters for useEffect dep arrays. */
function serializeFilters(f: UseDebtorListFilters): string {
  return JSON.stringify({
    stage: f.stage ?? '',
    channel: f.channel ?? '',
    daysMin: f.daysMin ?? null,
    daysMax: f.daysMax ?? null,
    search: f.search ?? '',
  })
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useDebtorList(filters: UseDebtorListFilters = {}): UseDebtorListResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [pages, setPages] = useState<DebtorListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const filtersKey = serializeFilters(filters)
  const loadMoreInFlight = useRef<boolean>(false)
  const hasLoadedFirstPage = useRef<boolean>(false)

  /**
   * Con qué filtros se pidió la respuesta que estamos esperando.
   *
   * Sin esto la pantalla mentía: al marcar una etapa quedaban SIETE filas de
   * esa etapa arriba y las 45 de antes abajo, con el chip marcado. No era el
   * filtro roto — era el sondeo de 30s (y la petición anterior en vuelo)
   * llegando DESPUÉS de la filtrada. Como para entonces `hasLoadedFirstPage`
   * ya era true, la rama de «refresco» las fusionaba en vez de reemplazarlas.
   *
   * La regla: una respuesta sólo se aplica si sigue siendo la vigente. Una
   * respuesta vieja no es un dato viejo, es un dato de OTRA pregunta.
   */
  const filtrosVigentes = useRef<string>(filtersKey)
  filtrosVigentes.current = filtersKey

  // ── Page 1 fetch (initial + filter change + polling) ──────────────────────
  const fetchFirstPage = useCallback(async (): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorList] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    const qs = buildQs(filters, null)
    const suffix = qs ? `?${qs}` : ''
    // Con qué pregunta sale esta petición. Si al volver ya no es la vigente,
    // se descarta entera: aplicarla a medias es lo que hacía que el filtro
    // pareciera roto.
    const preguntaDeEstaPeticion = filtersKey
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/debtors${suffix}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as DebtorListResponse
      if (filtrosVigentes.current !== preguntaDeEstaPeticion) return
      // Polling refresh REPLACES page 1 only. Since each filter change resets
      // pages anyway, "replace page 1" === "set pages to the new page-1 items
      // and keep nextCursor of page 1" — subsequent pages survive because the
      // operator's loadMore() merges them in a separate state path below.
      // For the very first load and filter-change reset, this is the only
      // page in `pages` so we set directly. For polling, we replace the
      // initial slice while preserving subsequent loaded pages.
      setPages((prev) => {
        if (!hasLoadedFirstPage.current) {
          return json.items
        }
        // Polling refresh: fresh page-1 is authoritative; re-append only the
        // already-loaded subsequent-page rows that are NOT in the new page-1,
        // deduped by stable debtor id (key={d.id} in the table). Robust to
        // page-1 size drift (debtor paid / added / stage-changed) and reordering
        // — slicing by the incoming length duplicated or dropped rows.
        const firstIds = new Set(json.items.map((it) => it.id))
        const tail = prev.filter((row) => !firstIds.has(row.id))
        return [...json.items, ...tail]
      })
      setNextCursor(json.nextCursor)
      setGeneratedAt(json.generatedAt)
      setError(null)
      hasLoadedFirstPage.current = true
    } catch (err) {
      // Un fallo de una pregunta que ya nadie hizo no es un error que mostrar.
      if (filtrosVigentes.current !== preguntaDeEstaPeticion) return
      setError(err instanceof Error ? err.message : 'Failed to fetch debtors list')
    } finally {
      if (filtrosVigentes.current === preguntaDeEstaPeticion) setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, filtersKey])

  // ── Filter change / mount: reset and refetch ──────────────────────────────
  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    setIsLoading(true)
    hasLoadedFirstPage.current = false
    setPages([])
    setNextCursor(null)
    void fetchFirstPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, filtersKey])

  // ── 30s polling of page 1 only (tab-visibility-gated) ─────────────────────
  useVisibilityPolling(() => void fetchFirstPage(), 30_000, Boolean(agencyId))

  // ── loadMore: append next cursor page ─────────────────────────────────────
  const loadMore = useCallback(async (): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return
    if (!nextCursor) return
    if (loadMoreInFlight.current) return

    loadMoreInFlight.current = true
    setIsLoadingMore(true)
    const preguntaDeEstaPeticion = filtersKey
    try {
      const qs = buildQs(filters, nextCursor)
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/debtors?${qs}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as DebtorListResponse
      // Una página siguiente del filtro anterior se pegaría al final de la
      // lista nueva: filas que no cumplen el filtro, sin explicación.
      if (filtrosVigentes.current !== preguntaDeEstaPeticion) return
      setPages((prev) => [...prev, ...json.items])
      setNextCursor(json.nextCursor)
      setError(null)
    } catch (err) {
      if (filtrosVigentes.current !== preguntaDeEstaPeticion) return
      setError(err instanceof Error ? err.message : 'Failed to load more debtors')
    } finally {
      setIsLoadingMore(false)
      loadMoreInFlight.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, nextCursor, filtersKey])

  return {
    pages,
    isLoading,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
    refetch: fetchFirstPage,
    generatedAt,
  }
}
