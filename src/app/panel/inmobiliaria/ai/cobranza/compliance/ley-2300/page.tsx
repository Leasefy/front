'use client'

/**
 * Compliance — Ley 2300 outside-hours attempts — Phase 34 plan 34-07.
 *
 * Paginated table of outside-hours communication attempts (server unions
 * outbound `cadence_skip` + inbound `inbound_outside_hours` rows per 34-04).
 *
 * Columns: timestamp, debtor (Mask), channel, direction. 50/page cursor.
 *
 * Refs mvp:docs/DESIGN.md §4 (cards, tables), §16 (tabular-nums).
 */

import { useCallback, useEffect, useState } from 'react'
import { Gavel } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'

interface Attempt {
  event_id: string
  debtor_id_masked: string
  channel: string
  timestamp: string
  direction: 'inbound' | 'outbound'
}

interface AttemptsResponse {
  items: Attempt[]
  next_cursor: string | null
}

function Ley2300Content() {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [items, setItems] = useState<Attempt[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }
      try {
        const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/ley-2300/attempts${qs}`,
          { headers: agentAuthHeaders() },
        )
        if (!res.ok) throw new Error(`${res.status}`)
        const json = (await res.json()) as AttemptsResponse
        setItems((prev) => (append ? [...prev, ...(json.items ?? [])] : json.items ?? []))
        setNextCursor(json.next_cursor ?? null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch_failed')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [agencyId],
  )

  useEffect(() => {
    if (!agencyId) return
    setIsLoading(true)
    void fetchPage(null, false)
  }, [agencyId, fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    await fetchPage(nextCursor, true)
  }, [nextCursor, isLoadingMore, fetchPage])

  // Phase 38-05a: page-level skeleton during first load
  if (isLoading && items.length === 0) return <PageSkeleton variant="list" />

  // Phase 38-05a: page-level EmptyState for "no infractions" celebratory case
  if (!isLoading && items.length === 0 && !error) {
    return (
      <EmptyState
        icon={Gavel}
        title={t('inmobiliaria.ai.cobranza.compliance.ley2300.empty.title')}
        description={t('inmobiliaria.ai.cobranza.compliance.ley2300.empty.description')}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/cobranza/compliance"
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.workspace.agente.cobranza'), href: '/panel/inmobiliaria/ai/cobranza' },
            { label: t('inmobiliaria.ai.cobranza.compliance.pageTitle'), href: '/panel/inmobiliaria/ai/cobranza/compliance' },
            { label: t('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title') },
          ]}
        />
        <h1 className="text-h2 font-heading text-foreground mt-2">
          {t('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title')}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 border border-[#C4503B]/30 dark:border-[#C4503B]/40 p-3 text-sm text-[#C4503B] dark:text-[#E0664D]">
          Error: {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto overscroll-contain">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Fecha' : 'Timestamp'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Deudor' : 'Debtor'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Canal' : 'Channel'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Dirección' : 'Direction'}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.event_id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono tabular-nums text-xs text-foreground">
                    {new Date(row.timestamp).toLocaleString(locale)}
                  </td>
                  <td className="px-3 py-2">
                    <Mask field="cedula" value={row.debtor_id_masked} onReveal={undefined} />
                  </td>
                  <td className="px-3 py-2 text-foreground">{row.channel}</td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase',
                        row.direction === 'inbound'
                          ? 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/30 dark:text-[#1A40FF]'
                          : 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/30 dark:text-[#B7791F]',
                      ].join(' ')}
                    >
                      {row.direction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {nextCursor && (
            <div className="p-3 border-t border-border bg-muted/20 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="text-xs px-4 py-2 rounded-sm border border-border hover:bg-muted disabled:opacity-50 transition font-medium"
              >
                {isLoadingMore
                  ? locale.startsWith('es') ? 'Cargando...' : 'Loading...'
                  : locale.startsWith('es') ? 'Cargar más' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Ley2300Page() {
  return (
    <PageGuard module="cobranza" action="view">
      <Ley2300Content />
    </PageGuard>
  )
}
