'use client'

/**
 * Llamadas list page — real implementation.
 *
 * Backed by GET /api/agency/{agencyId}/cobranza/calls (not yet deployed).
 * Handles loading / empty / error states cleanly; lights up automatically
 * once the endpoint is live.
 *
 * Pattern mirrors: cartas/page.tsx + siniestros/page.tsx
 * Refs DESIGN.md §1 (sobrio + warm), §4 (cards rounded-xl), §11 (skeleton), §16 (tabular-nums).
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowClockwise, PhoneCall, Warning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  useCalls,
  type CallOutcomeFilter,
  type CallChannelFilter,
  type CallDirectionFilter,
} from '@/lib/hooks/cobranza/use-calls'

// ── Badge helpers ─────────────────────────────────────────────────────────────

function outcomeBadgeClasses(outcome: string | null): string {
  switch (outcome) {
    case 'completed':
      return 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800'
    case 'no_answer':
    case 'voicemail':
      return 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700'
    case 'wrong_party':
    case 'failed':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-800'
    case 'opt_out':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'
    case 'escalated':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-800'
    default:
      return 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700'
  }
}

function channelBadgeClasses(channel: string): string {
  switch (channel) {
    case 'voice':
      return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-800'
    case 'whatsapp':
      return 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800'
    case 'sms':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:ring-sky-800'
    case 'email':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'
    default:
      return 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700'
  }
}

// ── Filter chip helper ────────────────────────────────────────────────────────

function chipClasses(active: boolean): string {
  return active
    ? 'bg-violet-600 text-white border-violet-600'
    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-violet-400'
}

// ── Label maps ────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS: CallOutcomeFilter[] = [
  'completed',
  'no_answer',
  'voicemail',
  'wrong_party',
  'failed',
  'opt_out',
  'escalated',
]

const CHANNEL_OPTIONS: CallChannelFilter[] = ['voice', 'whatsapp', 'sms', 'email']

const DIRECTION_OPTIONS: CallDirectionFilter[] = ['outbound', 'inbound']

const OUTCOME_LABELS: Record<CallOutcomeFilter, { es: string; en: string }> = {
  completed: { es: 'Completada', en: 'Completed' },
  no_answer: { es: 'Sin respuesta', en: 'No answer' },
  voicemail: { es: 'Buzón de voz', en: 'Voicemail' },
  wrong_party: { es: 'Persona equivocada', en: 'Wrong party' },
  failed: { es: 'Fallida', en: 'Failed' },
  opt_out: { es: 'Opt-out', en: 'Opt-out' },
  escalated: { es: 'Escalada', en: 'Escalated' },
}

const CHANNEL_LABELS: Record<CallChannelFilter, { es: string; en: string }> = {
  voice: { es: 'Voz', en: 'Voice' },
  whatsapp: { es: 'WhatsApp', en: 'WhatsApp' },
  sms: { es: 'SMS', en: 'SMS' },
  email: { es: 'Email', en: 'Email' },
}

const DIRECTION_LABELS: Record<CallDirectionFilter, { es: string; en: string }> = {
  outbound: { es: 'Saliente', en: 'Outbound' },
  inbound: { es: 'Entrante', en: 'Inbound' },
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null, isEs: boolean): string {
  if (seconds == null) return '—'
  if (seconds < 60) return isEs ? `${seconds}s` : `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

function formatRelative(iso: string, locale: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 2) return locale.startsWith('es') ? 'Hace un momento' : 'Just now'
    if (minutes < 60) return locale.startsWith('es') ? `Hace ${minutes}m` : `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return locale.startsWith('es') ? `Hace ${hours}h` : `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return locale.startsWith('es') ? `Hace ${days}d` : `${days}d ago`
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

// ── Main content ──────────────────────────────────────────────────────────────

function LlamadasContent() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const isEs = locale.startsWith('es')

  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcomeFilter | undefined>()
  const [channelFilter, setChannelFilter] = useState<CallChannelFilter | undefined>()
  const [directionFilter, setDirectionFilter] = useState<CallDirectionFilter | undefined>()

  const { calls, isLoading, error, refetch } = useCalls({
    outcome: outcomeFilter,
    channel: channelFilter,
    direction: directionFilter,
  })

  const navigateToCall = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/ai/cobranza/llamadas/${id}`)
    },
    [router],
  )

  const hasFilters =
    outcomeFilter !== undefined || channelFilter !== undefined || directionFilter !== undefined

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (isLoading && calls.length === 0 && !error) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <header className="mb-5">
          <div className="h-7 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mt-2" />
        </header>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <tr key={`skel-${i}`}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    )
  }

  // ── Global empty state (no filters, no data, no error) ───────────────────────
  if (!isLoading && !hasFilters && calls.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={PhoneCall}
          title={t('inmobiliaria.ai.cobranza.llamadas.list.empty.title')}
          description={t('inmobiliaria.ai.cobranza.llamadas.list.empty.description')}
        />
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.llamadas.list.pageTitle')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('inmobiliaria.ai.cobranza.llamadas.list.pageSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted active:scale-[0.97] transition shrink-0"
          aria-label={isEs ? 'Actualizar' : 'Refresh'}
        >
          <ArrowClockwise className="w-3.5 h-3.5" aria-hidden="true" />
          {isEs ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Outcome filter */}
        <fieldset>
          <legend className="sr-only">
            {t('inmobiliaria.ai.cobranza.llamadas.list.filters.outcome')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {OUTCOME_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcomeFilter((prev) => (prev === o ? undefined : o))}
                aria-pressed={outcomeFilter === o}
                className={
                  'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                  chipClasses(outcomeFilter === o)
                }
              >
                {OUTCOME_LABELS[o][isEs ? 'es' : 'en']}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Channel filter */}
        <fieldset>
          <legend className="sr-only">
            {t('inmobiliaria.ai.cobranza.llamadas.list.filters.channel')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannelFilter((prev) => (prev === c ? undefined : c))}
                aria-pressed={channelFilter === c}
                className={
                  'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                  chipClasses(channelFilter === c)
                }
              >
                {CHANNEL_LABELS[c][isEs ? 'es' : 'en']}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Direction filter */}
        <fieldset>
          <legend className="sr-only">
            {t('inmobiliaria.ai.cobranza.llamadas.list.filters.direction')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {DIRECTION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirectionFilter((prev) => (prev === d ? undefined : d))}
                aria-pressed={directionFilter === d}
                className={
                  'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                  chipClasses(directionFilter === d)
                }
              >
                {DIRECTION_LABELS[d][isEs ? 'es' : 'en']}
              </button>
            ))}
          </div>
        </fieldset>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setOutcomeFilter(undefined)
              setChannelFilter(undefined)
              setDirectionFilter(undefined)
            }}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline self-center"
          >
            {isEs ? 'Limpiar filtros' : 'Clear filters'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 p-3 text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2 mb-4"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-950/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.debtor')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.channel')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.outcome')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.duration')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.initiatedAt')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.qaScore')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.flags')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {calls.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {isEs
                      ? 'Sin llamadas con los filtros seleccionados.'
                      : 'No calls match the selected filters.'}
                  </p>
                </td>
              </tr>
            )}
            {calls.map((call) => (
              <tr
                key={call.id}
                onClick={() => navigateToCall(call.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToCall(call.id)
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {/* Debtor (masked) */}
                <td className="px-3 py-2">
                  <div className="font-medium text-neutral-900 dark:text-white text-sm whitespace-nowrap">
                    {call.debtorNameMasked}
                  </div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono tabular-nums">
                    {call.debtorCedulaMasked}
                  </div>
                </td>

                {/* Channel + direction badges */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span
                      className={
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                        channelBadgeClasses(call.channel)
                      }
                    >
                      {CHANNEL_LABELS[call.channel]?.[isEs ? 'es' : 'en'] ?? call.channel}
                    </span>
                    <span className="inline-flex items-center text-xs text-neutral-400 dark:text-neutral-500">
                      {DIRECTION_LABELS[call.direction]?.[isEs ? 'es' : 'en'] ?? call.direction}
                    </span>
                  </div>
                </td>

                {/* Outcome badge */}
                <td className="px-3 py-2">
                  {call.outcome ? (
                    <span
                      className={
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                        outcomeBadgeClasses(call.outcome)
                      }
                    >
                      {OUTCOME_LABELS[call.outcome as CallOutcomeFilter]?.[isEs ? 'es' : 'en'] ??
                        call.outcome}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>
                  )}
                </td>

                {/* Duration */}
                <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums font-mono whitespace-nowrap">
                  {formatDuration(call.durationSeconds, isEs)}
                </td>

                {/* initiatedAt — relative time */}
                <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  {formatRelative(call.initiatedAt, locale)}
                </td>

                {/* QA score */}
                <td className="px-3 py-2 text-xs tabular-nums font-mono whitespace-nowrap">
                  {call.qaScore != null ? (
                    <span
                      className={
                        call.qaScore >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : call.qaScore >= 60
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {call.qaScore}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500">—</span>
                  )}
                </td>

                {/* Compliance flags */}
                <td className="px-3 py-2 text-xs tabular-nums font-mono whitespace-nowrap">
                  {call.complianceFlagsCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium">
                      <Warning className="w-3 h-3" weight="fill" aria-hidden="true" />
                      {call.complianceFlagsCount}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

export default function LlamadasListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <LlamadasContent />
    </PageGuard>
  )
}
