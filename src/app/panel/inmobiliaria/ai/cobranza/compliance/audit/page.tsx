'use client'

/**
 * Compliance — Audit log (forensic read-only) — Phase 34 plan 34-07
 * (D-34-08, RESEARCH §6 risk-7).
 *
 * Filtered, PII-redacted audit log table with 4 combinable filters:
 *   - actor (agency members dropdown, cached once)
 *   - action (enum dropdown + free-text fallback for forward-compat values)
 *   - date range (from/to, default last 7 days)
 *   - search q (≥ 8 chars, matches cedula_hash_prefix8 OR entity_id UUID-prefix)
 *
 * CRITICAL forensic invariant (RESEARCH §6 risk-7 + threat T-34-07-01):
 *   - Mask is rendered with `onReveal={undefined}` everywhere on this page
 *   - NO PIIRevealContext.Provider in this subtree → if any descendant Mask
 *     tries to use the context, the safe `usePIIRevealContextSafe()` hook
 *     returns null and the Mask falls into no-reveal mode
 *   - Details are rendered via plain <pre>{JSON.stringify(...)}</pre> — NEVER
 *     via raw-HTML injection sinks (see T-34-07-02)
 *
 * Refs mvp:docs/DESIGN.md §4 (cards, tables, inputs), §16 (tabular-nums).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardText } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Badge, MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  useAuditLog,
  type AuditLogFilters,
} from '@/lib/hooks/cobranza/use-audit-log'
import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service'
import type { AgencyUser } from '@/lib/types/inmobiliaria'

// D-34-08 + 34-04 (extended): audit action enum dropdown values.
// Plan note: free-text override allowed for forward compat. Implemented via
// a "Other..." option that swaps the select for a text input.
const ACTION_OPTIONS = [
  'pii_reveal',
  'intervention',
  'force_stage',
  'escalation_resolve',
  'threshold_edit',
  'manual_wa_send',
  'manual_call_trigger',
  'opt_out_acknowledged',
  'subscription_update',
] as const

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayYmd(): string {
  return ymd(new Date())
}

function daysAgoYmd(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return ymd(d)
}

function AuditContent() {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? ''

  const [actor, setActor] = useState<string | undefined>(undefined)
  const [action, setAction] = useState<string | undefined>(undefined)
  const [actionMode, setActionMode] = useState<'enum' | 'custom'>('enum')
  const [from, setFrom] = useState<string>(daysAgoYmd(7))
  const [to, setTo] = useState<string>(todayYmd())
  const [qInput, setQInput] = useState<string>('')
  const qValid = qInput.length === 0 || qInput.length >= 8
  const [isExportingCsv, setIsExportingCsv] = useState(false)

  // Stable filter object: only re-fire fetch when ALL inputs stabilize
  const filters = useMemo<AuditLogFilters>(
    () => ({
      actor: actor && actor.length > 0 ? actor : undefined,
      action: action && action.length > 0 ? action : undefined,
      from,
      to,
      q: qValid && qInput.length >= 8 ? qInput : undefined,
    }),
    [actor, action, from, to, qInput, qValid],
  )

  const { items, isLoading, isLoadingMore, error, hasMore, loadMore } =
    useAuditLog(filters)

  // Load agency members once for the actor dropdown
  const [members, setMembers] = useState<AgencyUser[]>([])
  useEffect(() => {
    let cancelled = false
    inmobiliariaConfigApi
      .getUsers()
      .then((list: AgencyUser[]) => {
        if (!cancelled) setMembers(list)
      })
      .catch(() => {
        /* swallow — actor filter degrades to free-text */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onResetActor = useCallback(() => setActor(undefined), [])

  // Phase 38-07 (D-38-10): export CSV via fetch + blob + anchor download.
  // Cannot use a plain anchor download because the agent backend requires
  // Bearer-token auth (see src/lib/api/agent-auth.ts) — a bare <a download>
  // would not include the Authorization header. UX is identical (browser
  // save dialog) but the request is authenticated end-to-end.
  const exportCsv = useCallback(async () => {
    if (isExportingCsv) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return
    setIsExportingCsv(true)
    try {
      const qs = new URLSearchParams({ from, to })
      if (action) qs.set('kind', action)
      const url = `${agentUrl}/api/agency/${agencyId}/compliance/audit-log.csv?${qs.toString()}`
      const resp = await agentFetch(url)
      if (!resp.ok) throw new Error(`[exportCsv] backend returned ${resp.status}`)
      const blob = await resp.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `audit-log-${from}-to-${to}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('[exportCsv] failed:', err)
    } finally {
      setIsExportingCsv(false)
    }
  }, [isExportingCsv, agencyId, from, to, action])

  // Phase 38-05a: skeleton only as early-return on first load (no custom
  // filters set). EmptyState stays inline below so users keep access to
  // filter controls + can adjust criteria.
  const hasCustomFilters =
    filters.actor !== undefined || filters.action !== undefined || filters.q !== undefined
  if (isLoading && items.length === 0 && !hasCustomFilters) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 font-heading text-foreground mt-2">
            {t('inmobiliaria.ai.cobranza.compliance.subPages.auditTitle')}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale.startsWith('es')
              ? 'Vista forense de solo lectura — el PII nunca es revelable en esta página.'
              : 'Forensic read-only view — PII is never revealable on this page.'}
          </p>
        </div>
        {/* Phase 38-07 (D-38-10): export CSV button. Visible only when data
            exists per D-38-04 ("export CTA appears when data exists"). */}
        {items.length > 0 && agencyId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void exportCsv() }}
            disabled={isExportingCsv}
            hideArrow
            aria-label={t('inmobiliaria.ai.cobranza.compliance.audit.exportCsv')}
          >
            {isExportingCsv
              ? (locale.startsWith('es') ? 'Generando...' : 'Generating...')
              : t('inmobiliaria.ai.cobranza.compliance.audit.exportCsv')}
          </Button>
        )}
      </div>

      {/* Filters grid */}
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Actor */}
        <div>
          <label htmlFor="audit-actor" className="block mb-1">
            <MonoLabel className="text-xs text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.compliance.filters.actor')}
            </MonoLabel>
          </label>
          <Select
            value={actor ?? '__all__'}
            onValueChange={(v) => setActor(v === '__all__' ? undefined : v)}
          >
            <SelectTrigger id="audit-actor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{locale.startsWith('es') ? 'Todos' : 'All'}</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.email}>
                  {m.name} ({m.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actor && (
            <Button
              variant="link"
              size="sm"
              onClick={onResetActor}
              hideArrow
              className="mt-1 h-auto p-0 text-xs"
            >
              {locale.startsWith('es') ? 'limpiar' : 'clear'}
            </Button>
          )}
        </div>

        {/* Action */}
        <div>
          <label htmlFor="audit-action" className="block mb-1">
            <MonoLabel className="text-xs text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.compliance.filters.action')}
            </MonoLabel>
          </label>
          {actionMode === 'enum' ? (
            <Select
              value={action ?? '__all__'}
              onValueChange={(v) => {
                if (v === '__custom__') {
                  setActionMode('custom')
                  setAction(undefined)
                } else {
                  setAction(v === '__all__' ? undefined : v)
                }
              }}
            >
              <SelectTrigger id="audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{locale.startsWith('es') ? 'Todas' : 'All'}</SelectItem>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">
                  {locale.startsWith('es') ? 'Otro...' : 'Other...'}
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex gap-1">
              <Input
                id="audit-action"
                type="text"
                value={action ?? ''}
                onChange={(e) => setAction(e.target.value || undefined)}
                placeholder="custom_action"
                className="flex-1 font-mono"
              />
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setActionMode('enum')
                  setAction(undefined)
                }}
                hideArrow
                className="h-auto p-0 px-2 text-xs"
              >
                {locale.startsWith('es') ? 'lista' : 'list'}
              </Button>
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="sm:col-span-2 md:col-span-1">
          <MonoLabel className="block text-xs text-muted-foreground mb-1">
            {t('inmobiliaria.ai.cobranza.compliance.filters.dateRange')}
          </MonoLabel>
          <div className="flex gap-1">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 font-mono"
              aria-label="from"
            />
            <Input
              type="date"
              value={to}
              min={from}
              max={todayYmd()}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 font-mono"
              aria-label="to"
            />
          </div>
        </div>

        {/* Search q */}
        <div>
          <label htmlFor="audit-q" className="block mb-1">
            <MonoLabel className="text-xs text-muted-foreground">
              {t('inmobiliaria.ai.cobranza.compliance.filters.search')}
            </MonoLabel>
          </label>
          <Input
            id="audit-q"
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={locale.startsWith('es') ? 'mín. 8 chars' : 'min 8 chars'}
            className="w-full font-mono"
          />
          {qInput.length > 0 && qInput.length < 8 && (
            <p className="mt-1 text-xs text-warning">
              {locale.startsWith('es')
                ? 'Ingrese al menos 8 caracteres'
                : 'Enter at least 8 characters'}
            </p>
          )}
        </div>
      </div>

      {/* Loading state (only for filter-triggered refetch — first load handled by early return) */}
      {isLoading && items.length === 0 && hasCustomFilters && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" variant="default" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-danger-soft text-danger">
          Error: {error}
        </div>
      )}

      {/* Empty state — Phase 38-05a: EmptyState primitive */}
      {!isLoading && items.length === 0 && !error && (
        <EmptyState
          icon={ClipboardText}
          title={t('inmobiliaria.ai.cobranza.compliance.audit.empty.title')}
          description={t('inmobiliaria.ai.cobranza.compliance.audit.empty.description')}
        />
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>{locale.startsWith('es') ? 'Fecha' : 'Timestamp'}</TableHead>
                <TableHead>{locale.startsWith('es') ? 'Actor' : 'Actor'}</TableHead>
                <TableHead>{locale.startsWith('es') ? 'Acción' : 'Action'}</TableHead>
                <TableHead>{locale.startsWith('es') ? 'Entidad' : 'Entity'}</TableHead>
                <TableHead>{locale.startsWith('es') ? 'Detalles' : 'Details'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                // Detect cedula-shaped field in details (server already
                // redacts to "XXXXXXXX50" shape). Render via Mask so the
                // PII forensic invariant holds even for unexpected payload
                // shapes that include a raw cedula key.
                const details = row.details ?? {}
                const cedulaMasked =
                  typeof (details as Record<string, unknown>)['cedula_raw'] === 'string'
                    ? ((details as Record<string, unknown>)['cedula_raw'] as string)
                    : typeof (details as Record<string, unknown>)['cedula_masked'] === 'string'
                      ? ((details as Record<string, unknown>)['cedula_masked'] as string)
                      : null
                return (
                  <TableRow key={row.id} className="align-top">
                    <TableCell className="px-3 py-2 font-mono tabular-nums text-xs text-foreground whitespace-nowrap">
                      {new Date(row.occurred_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                      {row.actor_id}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant="primary">{row.action}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div>{row.entity_type}</div>
                      <div className="text-[11px] opacity-70">
                        {row.entity_id.slice(0, 8)}…
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 max-w-md">
                      {cedulaMasked && (
                        <div className="mb-1">
                          <Mask
                            field="cedula"
                            value={cedulaMasked}
                            onReveal={undefined}
                          />
                        </div>
                      )}
                      {/* Render details JSON as plain text inside <pre>.
                          NEVER use raw-HTML sinks — T-34-07-02. */}
                      <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {JSON.stringify(details, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="p-3 border-t border-border bg-muted/20 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                hideArrow
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

export default function AuditPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <AuditContent />
    </PageGuard>
  )
}
