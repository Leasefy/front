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
  pending: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]',
  partial: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]',
  final: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]',
  error: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D]',
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
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5">
      {/* Loading skeleton */}
      {isLoading && quotes.length === 0 ? (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : quotes.length === 0 ? (
        /* Empty state */
        <div className="py-10 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-neutral-500">
            {t('inmobiliaria.ai.cotizador.overview.recentQuotes.empty')}
          </p>
          <p className="text-xs text-neutral-400 max-w-xs">
            {t('inmobiliaria.ai.cotizador.overview.recentQuotes.emptyHelper')}
          </p>
        </div>
      ) : (
        /* Quotes list */
        <ul
          aria-live="polite"
          aria-relevant="additions"
          className="divide-y divide-neutral-100 dark:divide-neutral-800"
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
                  href={`/panel/inmobiliaria/ai/cotizador/${q.id}`}
                  className="flex items-center justify-between py-3 px-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-md transition-colors"
                  aria-label={t('inmobiliaria.ai.cotizador.overview.recentQuotes.ariaRow')
                    .replace('{{name}}', q.cedulaHashPrefix8)
                    .replace('{{city}}', q.ciudad)
                    .replace('{{status}}', q.status)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {q.cedulaHashPrefix8}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {q.ciudad} · ${formatCOP(q.canonCop)}/mes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={q.status} t={t} />
                    <span className="text-xs text-neutral-400">
                      {q.approvedCount}/{q.totalCarriers}
                    </span>
                    <ArrowRight className="h-4 w-4 text-neutral-400" />
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
