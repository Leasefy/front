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
import { PhoneCall, Warning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
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
import { Chip } from '@leasefy/cadence'
import {
  useCalls,
  type CallOutcomeFilter,
  type CallChannelFilter,
  type CallDirectionFilter,
} from '@/lib/hooks/cobranza/use-calls'

// ── Badge helpers ─────────────────────────────────────────────────────────────

function outcomeBadgeVariant(
  outcome: string | null,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  // Semantic status tints vía tokens del DS (contrato §8)
  switch (outcome) {
    case 'completed':
      return 'success'
    case 'no_answer':
    case 'voicemail':
      return 'secondary'
    case 'wrong_party':
    case 'failed':
      return 'destructive'
    case 'opt_out':
      return 'warning'
    case 'escalated':
      return 'default'
    default:
      return 'secondary'
  }
}

// Channel is metadata, not a state signal — gray-first per brand contract §2.
function channelBadgeVariant(_channel: string): 'secondary' {
  return 'secondary'
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

  useAutoRefresh(refetch)

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
          <Table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
            <TableBody className="divide-y divide-neutral-100 dark:divide-neutral-800 animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.llamadas.list.pageTitle')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.llamadas.list.pageSubtitle')}
          </p>
        </div>
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
              <Chip
                key={o}
                size="sm"
                selected={outcomeFilter === o}
                onClick={() => setOutcomeFilter((prev) => (prev === o ? undefined : o))}
              >
                {OUTCOME_LABELS[o][isEs ? 'es' : 'en']}
              </Chip>
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
              <Chip
                key={c}
                size="sm"
                selected={channelFilter === c}
                onClick={() => setChannelFilter((prev) => (prev === c ? undefined : c))}
              >
                {CHANNEL_LABELS[c][isEs ? 'es' : 'en']}
              </Chip>
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
              <Chip
                key={d}
                size="sm"
                selected={directionFilter === d}
                onClick={() => setDirectionFilter((prev) => (prev === d ? undefined : d))}
              >
                {DIRECTION_LABELS[d][isEs ? 'es' : 'en']}
              </Chip>
            ))}
          </div>
        </fieldset>

        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => {
              setOutcomeFilter(undefined)
              setChannelFilter(undefined)
              setDirectionFilter(undefined)
            }}
            className="self-center px-0 h-auto"
          >
            {isEs ? 'Limpiar filtros' : 'Clear filters'}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center gap-2 mb-4"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <Table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          <TableHeader className="bg-neutral-50 dark:bg-neutral-950/50">
            <TableRow>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.debtor')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.channel')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.outcome')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.duration')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.initiatedAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.qaScore')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.llamadas.list.columns.flags')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {calls.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-12 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {isEs
                      ? 'Sin llamadas con los filtros seleccionados.'
                      : 'No calls match the selected filters.'}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {calls.map((call) => (
              <TableRow
                key={call.id}
                onClick={() => navigateToCall(call.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToCall(call.id)
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {/* Debtor (masked) */}
                <TableCell className="px-3 py-2">
                  <div className="font-medium text-neutral-900 dark:text-white text-sm whitespace-nowrap">
                    {call.debtorNameMasked}
                  </div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                    {call.debtorCedulaMasked}
                  </div>
                </TableCell>

                {/* Channel + direction badges */}
                <TableCell className="px-3 py-2 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Badge variant={channelBadgeVariant(call.channel)}>
                      {CHANNEL_LABELS[call.channel]?.[isEs ? 'es' : 'en'] ?? call.channel}
                    </Badge>
                    <span className="inline-flex items-center text-xs text-neutral-400 dark:text-neutral-500">
                      {DIRECTION_LABELS[call.direction]?.[isEs ? 'es' : 'en'] ?? call.direction}
                    </span>
                  </div>
                </TableCell>

                {/* Outcome badge */}
                <TableCell className="px-3 py-2">
                  {call.outcome ? (
                    <Badge variant={outcomeBadgeVariant(call.outcome)}>
                      {OUTCOME_LABELS[call.outcome as CallOutcomeFilter]?.[isEs ? 'es' : 'en'] ??
                        call.outcome}
                    </Badge>
                  ) : (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>
                  )}
                </TableCell>

                {/* Duration */}
                <TableCell className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
                  {formatDuration(call.durationSeconds, isEs)}
                </TableCell>

                {/* initiatedAt — relative time */}
                <TableCell className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  {formatRelative(call.initiatedAt, locale)}
                </TableCell>

                {/* QA score */}
                <TableCell className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                  {call.qaScore != null ? (
                    <span
                      className={
                        call.qaScore >= 80
                          ? 'text-success'
                          : call.qaScore >= 60
                            ? 'text-warning'
                            : 'text-danger'
                      }
                    >
                      {call.qaScore}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500">—</span>
                  )}
                </TableCell>

                {/* Compliance flags */}
                <TableCell className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                  {call.complianceFlagsCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-warning font-medium">
                      <Warning className="w-3 h-3" weight="fill" aria-hidden="true" />
                      {call.complianceFlagsCount}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
