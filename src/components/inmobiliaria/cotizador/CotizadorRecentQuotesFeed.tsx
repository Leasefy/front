'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCOP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning-soft text-warning',
  partial: 'bg-primary-soft text-primary',
  final: 'bg-success-soft text-success',
  error: 'bg-danger-soft text-danger',
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  // Map API status values to i18n keys
  const statusKeyMap: Record<string, string> = {
    pending: 'inmobiliaria.ai.cotizador.overview.recentQuotes.statusPending',
    partial: 'inmobiliaria.ai.cotizador.overview.recentQuotes.statusPartial',
    final: 'inmobiliaria.ai.cotizador.overview.recentQuotes.statusComplete',
    error: 'inmobiliaria.ai.cotizador.overview.recentQuotes.statusError',
  }
  const key = statusKeyMap[status] ?? statusKeyMap.error
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.error}`}
    >
      {t(key)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CotizadorRecentQuotesFeedProps {
  quotes: CotizadorOverviewResponse['lastQuotes']
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CotizadorRecentQuotesFeed({
  quotes,
  isLoading = false,
}: CotizadorRecentQuotesFeedProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Loading skeleton */}
      {isLoading && quotes.length === 0 ? (
        <ul className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-surface-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-surface-muted animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-surface-muted animate-pulse" />
            </li>
          ))}
        </ul>
      ) : quotes.length === 0 ? (
        /* Empty state */
        <div className="py-10 flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm font-medium text-fg">
            {t('inmobiliaria.ai.cotizador.overview.recentQuotes.empty')}
          </p>
          <p className="text-xs text-fg-muted max-w-xs">
            {t('inmobiliaria.ai.cotizador.overview.recentQuotes.emptyHelper')}
          </p>
        </div>
      ) : (
        /* Quotes list */
        <ul
          aria-live="polite"
          aria-relevant="additions"
          className="divide-y divide-border"
        >
          <AnimatePresence initial={false}>
            {quotes.map((q) => (
              <motion.li
                key={q.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Link
                  href={`/panel/inmobiliaria/postulaciones/asegurabilidad/${q.id}`}
                  className="flex items-center justify-between py-3 px-1 hover:bg-surface-muted rounded-md transition-colors"
                  aria-label={t('inmobiliaria.ai.cotizador.overview.recentQuotes.ariaRow')
                    .replace('{{name}}', `Ref. ${q.cedulaHashPrefix8}`)
                    .replace('{{city}}', q.ciudad)
                    .replace('{{status}}', q.status)}
                >
                  {/* Identidad visual primaria = ciudad + canon (humano); el hash
                      de cédula es solo una referencia técnica → "Ref. {hash}" */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-fg">
                      {q.ciudad} · ${formatCOP(q.canonCop)}/mes
                    </span>
                    <span className="text-xs font-mono text-fg-muted">
                      Ref. {q.cedulaHashPrefix8}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={q.status} t={t} />
                    <span className="text-xs text-fg-muted tabular-nums">
                      {q.approvedCount}/{q.totalCarriers}
                    </span>
                    <ArrowRight className="h-4 w-4 text-fg-subtle" />
                  </div>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
