'use client'

/**
 * Compliance — Ley 2300 outside-hours attempts — Phase 34 plan 34-07.
 *
 * Paginated table of outside-hours communication attempts (server unions
 * outbound `cadence_skip` + inbound `inbound_outside_hours` rows per 34-04).
 *
 * Columns: timestamp, debtor (referencia corta), channel, direction. 50/page cursor.
 *
 * Refs mvp:docs/DESIGN.md §4 (cards, tables), §16 (tabular-nums).
 */

import { useCallback, useEffect, useState } from 'react'
import { Gavel } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import {
  normalizeAttempts,
  nextCursorOf,
  type Attempt,
  type ComplianceLogResponse,
  type RawAttempt,
} from '@/lib/hooks/cobranza/compliance-entries'

// El contrato real del agente y su normalización viven en un solo lugar:
// `compliance-entries.ts`. Acá se leían `json.items` / `json.next_cursor`, que
// el agente NO manda — la lista salía vacía siempre y esta pantalla decía «Sin
// infracciones detectadas» con datos del otro lado.

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
        const json = (await res.json()) as ComplianceLogResponse<RawAttempt>
        const page = normalizeAttempts(json)
        setItems((prev) => (append ? [...prev, ...page] : page))
        setNextCursor(nextCursorOf(json))
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
        <h1 className="text-h2 font-heading text-foreground mt-2">
          {t('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title')}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl bg-danger-soft text-danger">
          Error: {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border">
              <TableRow>
                <TableHead>
                  {locale.startsWith('es') ? 'Fecha' : 'Timestamp'}
                </TableHead>
                <TableHead>
                  {locale.startsWith('es') ? 'Deudor' : 'Debtor'}
                </TableHead>
                <TableHead>
                  {locale.startsWith('es') ? 'Canal' : 'Channel'}
                </TableHead>
                <TableHead>
                  {locale.startsWith('es') ? 'Dirección' : 'Direction'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.eventId} className="border-b border-border last:border-0">
                  <TableCell className="px-3 py-2 font-mono tabular-nums text-xs text-foreground">
                    {new Date(row.timestamp).toLocaleString(locale)}
                  </TableCell>
                  {/* Referencia, no cédula: `<Mask>` espera un valor ya
                      enmascarado y acá recibía el UUID crudo de la fila. */}
                  <TableCell className="px-3 py-2 font-mono text-xs text-fg-muted">
                    {row.debtorRef}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-foreground">{row.channel ?? '—'}</TableCell>
                  <TableCell className="px-3 py-2">
                    <Badge
                      variant={row.direction === 'inbound' ? 'default' : 'warning'}
                      className="uppercase"
                    >
                      {row.direction}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

export default function Ley2300Page() {
  return (
    <PageGuard module="cobranza" action="view">
      <Ley2300Content />
    </PageGuard>
  )
}
