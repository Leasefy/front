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
import Link from 'next/link'
import { CaretLeft, ClipboardText } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
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

  const [actor, setActor] = useState<string | undefined>(undefined)
  const [action, setAction] = useState<string | undefined>(undefined)
  const [actionMode, setActionMode] = useState<'enum' | 'custom'>('enum')
  const [from, setFrom] = useState<string>(daysAgoYmd(7))
  const [to, setTo] = useState<string>(todayYmd())
  const [qInput, setQInput] = useState<string>('')
  const qValid = qInput.length === 0 || qInput.length >= 8

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
      <div>
        <Link
          href="/panel/inmobiliaria/ai/cobranza/compliance"
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
        >
          <CaretLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {t('inmobiliaria.ai.cobranza.compliance.pageTitle')}
        </Link>
        <h1 className="text-h2 font-heading text-foreground mt-2">
          {t('inmobiliaria.ai.cobranza.compliance.subPages.auditTitle')}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale.startsWith('es')
            ? 'Vista forense de solo lectura — el PII nunca es revelable en esta página.'
            : 'Forensic read-only view — PII is never revealable on this page.'}
        </p>
      </div>

      {/* Filters grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Actor */}
        <div>
          <label
            htmlFor="audit-actor"
            className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1"
          >
            {t('inmobiliaria.ai.cobranza.compliance.filters.actor')}
          </label>
          <select
            id="audit-actor"
            value={actor ?? ''}
            onChange={(e) => setActor(e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm"
          >
            <option value="">{locale.startsWith('es') ? 'Todos' : 'All'}</option>
            {members.map((m) => (
              <option key={m.id} value={m.email}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
          {actor && (
            <button
              type="button"
              onClick={onResetActor}
              className="mt-1 text-xs text-primary hover:underline"
            >
              {locale.startsWith('es') ? 'limpiar' : 'clear'}
            </button>
          )}
        </div>

        {/* Action */}
        <div>
          <label
            htmlFor="audit-action"
            className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1"
          >
            {t('inmobiliaria.ai.cobranza.compliance.filters.action')}
          </label>
          {actionMode === 'enum' ? (
            <select
              id="audit-action"
              value={action ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '__custom__') {
                  setActionMode('custom')
                  setAction(undefined)
                } else {
                  setAction(v || undefined)
                }
              }}
              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm"
            >
              <option value="">{locale.startsWith('es') ? 'Todas' : 'All'}</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="__custom__">
                {locale.startsWith('es') ? 'Otro...' : 'Other...'}
              </option>
            </select>
          ) : (
            <div className="flex gap-1">
              <input
                id="audit-action"
                type="text"
                value={action ?? ''}
                onChange={(e) => setAction(e.target.value || undefined)}
                placeholder="custom_action"
                className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  setActionMode('enum')
                  setAction(undefined)
                }}
                className="text-xs text-primary hover:underline px-2"
              >
                {locale.startsWith('es') ? 'lista' : 'list'}
              </button>
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="sm:col-span-2 md:col-span-1">
          <label className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1">
            {t('inmobiliaria.ai.cobranza.compliance.filters.dateRange')}
          </label>
          <div className="flex gap-1">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm font-mono"
              aria-label="from"
            />
            <input
              type="date"
              value={to}
              min={from}
              max={todayYmd()}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm font-mono"
              aria-label="to"
            />
          </div>
        </div>

        {/* Search q */}
        <div>
          <label
            htmlFor="audit-q"
            className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1"
          >
            {t('inmobiliaria.ai.cobranza.compliance.filters.search')}
          </label>
          <input
            id="audit-q"
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={locale.startsWith('es') ? 'mín. 8 chars' : 'min 8 chars'}
            className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm font-mono"
          />
          {qInput.length > 0 && qInput.length < 8 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
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
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 p-3 text-sm text-rose-700 dark:text-rose-400">
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
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Fecha' : 'Timestamp'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Actor' : 'Actor'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Acción' : 'Action'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Entidad' : 'Entity'}
                </th>
                <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  {locale.startsWith('es') ? 'Detalles' : 'Details'}
                </th>
              </tr>
            </thead>
            <tbody>
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
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 align-top"
                  >
                    <td className="px-3 py-2 font-mono tabular-nums text-xs text-foreground whitespace-nowrap">
                      {new Date(row.occurred_at).toLocaleString(locale)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                      {row.actor_id}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div>{row.entity_type}</div>
                      <div className="text-[11px] opacity-70">
                        {row.entity_id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-md">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {hasMore && (
            <div className="p-3 border-t border-border bg-muted/20 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="text-xs font-mono uppercase tracking-wide px-4 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50 transition"
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

export default function AuditPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <AuditContent />
    </PageGuard>
  )
}
