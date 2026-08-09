'use client'

/**
 * LlamadasTab — Phase 31 plan 31-09.
 *
 * md+: table of calls; sm: stacked card list. Row click → call detail page.
 */

import * as React from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useDebtorCalls } from '@/lib/hooks/cobranza/use-debtor-calls'
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

void React

interface LlamadasTabProps {
  debtorId: string
  /** Bump from parent (Phase 31 plan 31-11 realtime) to force a refetch. */
  refetchKey?: number
}

function formatDuration(sec: number | null): string {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function LlamadasTab({ debtorId, refetchKey = 0 }: LlamadasTabProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data, isLoading, error, refetch } = useDebtorCalls({ debtorId })

  // Realtime-driven refetch (D-31-18 single refetch per event).
  useEffect(() => {
    if (refetchKey > 0) void refetch()
  }, [refetchKey, refetch])

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.llamadas.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.llamadas.errorRetry')}
        </Button>
      </div>
    )
  }

  const calls = data?.calls ?? []
  if (calls.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.detail.llamadas.empty')}
        </p>
      </div>
    )
  }

  const navigate = (callId: string) => {
    router.push(`/panel/inmobiliaria/ai/cobranza/llamadas/${callId}`)
  }

  return (
    <>
      {/* md+ table */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <Table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          <TableHeader className="bg-neutral-50 dark:bg-neutral-950/50">
            <TableRow>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.startedAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.duration')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.outcome')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.qa')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.compliance')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {calls.map((c) => (
              <TableRow
                key={c.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(c.id)
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <TableCell className="px-3 py-2 text-xs text-fg">
                  {new Date(c.started_at).toLocaleString(locale)}
                </TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs">
                  {formatDuration(c.duration_seconds)}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="text-xs">{c.status ?? '—'}</span>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="text-xs font-mono">
                    {c.qa_score != null ? c.qa_score.toFixed(1) : '—'}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Badge variant={c.compliance_flags_count > 0 ? 'warning' : 'success'}>
                    {c.compliance_flags_count}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* sm cards */}
      <ul className="md:hidden space-y-2">
        {calls.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => navigate(c.id)}
              className="w-full text-left rounded-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {new Date(c.started_at).toLocaleString(locale)}
              </p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white mt-0.5">
                {c.status ?? '—'} · {formatDuration(c.duration_seconds)}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                QA {c.qa_score?.toFixed(1) ?? '—'} · {c.compliance_flags_count}{' '}
                {t('inmobiliaria.ai.cobranza.detail.llamadas.columns.compliance')}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
