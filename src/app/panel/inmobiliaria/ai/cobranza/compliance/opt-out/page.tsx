'use client'

/**
 * Compliance — Opt-out registry — Phase 34 plan 34-07.
 *
 * Paginated table of opt-out requests with "Marcar acuse" button on pending
 * rows. Button gated by `usePermissionsContext().canAccess('cobranza',
 * 'configure')` per Phase 34-06 canonical pattern (NOT useAgentPerms which
 * does not exist in the mvp repo).
 *
 * Backend RBAC in 34-04 is authoritative — the client gate is a hint.
 *
 * Refs mvp:docs/DESIGN.md §4 (cards), §16 (tabular-nums).
 */

import { useCallback, useEffect, useState } from 'react'
import { Check, BellSlash } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'

interface OptOutEntry {
  event_id: string
  debtor_id_masked: string
  requested_at: string
  source: string
  acknowledged_at: string | null
}

interface OptOutResponse {
  items: OptOutEntry[]
  next_cursor: string | null
}

function OptOutContent() {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const { canAccess } = usePermissionsContext()
  const agencyId = agency?.id ?? null
  const hasConfigPerm = canAccess('cobranza', 'configure')

  const [items, setItems] = useState<OptOutEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [acking, setAcking] = useState<Set<string>>(new Set())

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
          `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/opt-out${qs}`,
          { headers: agentAuthHeaders() },
        )
        if (!res.ok) throw new Error(`${res.status}`)
        const json = (await res.json()) as OptOutResponse
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

  const acknowledge = useCallback(
    async (eventId: string) => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return
      setAcking((prev) => new Set(prev).add(eventId))
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/opt-out/${eventId}/acknowledge`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
          },
        )
        if (res.ok) {
          // Refresh first page; cursor reset
          setNextCursor(null)
          await fetchPage(null, false)
        } else {
          setError(t('inmobiliaria.ai.cobranza.compliance.optOut.errors.ackFailed'))
        }
      } catch {
        setError(t('inmobiliaria.ai.cobranza.compliance.optOut.errors.ackFailed'))
      } finally {
        setAcking((prev) => {
          const n = new Set(prev)
          n.delete(eventId)
          return n
        })
      }
    },
    [agencyId, fetchPage, t],
  )

  // Phase 38-05a: page-level skeleton during first load
  if (isLoading && items.length === 0) return <PageSkeleton variant="list" />

  // Phase 38-05a: page-level EmptyState when no opt-outs
  if (!isLoading && items.length === 0 && !error) {
    return (
      <EmptyState
        icon={BellSlash}
        title={t('inmobiliaria.ai.cobranza.compliance.optOut.empty.title')}
        description={t('inmobiliaria.ai.cobranza.compliance.optOut.empty.description')}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-h2 font-heading text-foreground mt-2">
          {t('inmobiliaria.ai.cobranza.compliance.subPages.optOutTitle')}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl bg-danger-soft text-danger">
          Error: {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto overscroll-contain">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border">
              <TableRow>
                <TableHead>
                  {locale.startsWith('es') ? 'Solicitado' : 'Requested'}
                </TableHead>
                <TableHead>
                  {locale.startsWith('es') ? 'Deudor' : 'Debtor'}
                </TableHead>
                <TableHead>
                  {locale.startsWith('es') ? 'Fuente' : 'Source'}
                </TableHead>
                <TableHead>
                  {locale.startsWith('es') ? 'Acuse' : 'Acknowledged'}
                </TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const isAcked = row.acknowledged_at !== null
                const isAcking = acking.has(row.event_id)
                return (
                  <TableRow key={row.event_id} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2 font-mono tabular-nums text-xs text-foreground">
                      {new Date(row.requested_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Mask field="cedula" value={row.debtor_id_masked} onReveal={undefined} />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-foreground">{row.source}</TableCell>
                    <TableCell className="px-3 py-2 font-mono tabular-nums text-xs">
                      {isAcked ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          {new Date(row.acknowledged_at as string).toLocaleDateString(locale)}
                        </span>
                      ) : (
                        <span className="text-warning">
                          {locale.startsWith('es') ? 'Pendiente' : 'Pending'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {!isAcked && hasConfigPerm && (
                        <Button
                          variant="outline"
                          size="sm"
                          hideArrow
                          onClick={() => void acknowledge(row.event_id)}
                          disabled={isAcking}
                        >
                          {isAcking
                            ? locale.startsWith('es') ? '...' : '...'
                            : locale.startsWith('es')
                              ? 'Marcar acuse'
                              : t('inmobiliaria.ai.cobranza.compliance.actions.acknowledge')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
          {nextCursor && (
            <div className="p-3 border-t border-border bg-muted/20 text-center">
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore
                  ? locale.startsWith('es') ? 'Cargando...' : 'Loading...'
                  : locale.startsWith('es') ? 'Cargar más' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OptOutPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <OptOutContent />
    </PageGuard>
  )
}
