'use client'

/**
 * CarrierRecentQuotesTable.tsx — Phase 35 plan 35-08 (Task 2)
 *
 * Last-50 quotes table for the per-carrier deep-dive page.
 *
 * CRITICAL (T-35-11): cedulaHashPrefix8 MUST be rendered via <Mask field="cedula"> only.
 * Never render cedulaHashPrefix8 as raw text in JSX.
 */

import Link from 'next/link'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { Badge } from '@/components/ui/badge'
import type { RecentQuote } from '@/lib/hooks/cotizador/use-carrier-recent-quotes'

// =============================================================================
// Helpers
// =============================================================================

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function VerdictBadge({ verdict, t }: { verdict: RecentQuote['verdict']; t: (key: string) => string }) {
  if (verdict === 'approved') {
    return <Badge variant="success">{t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.verdict.approved')}</Badge>
  }
  if (verdict === 'rejected') {
    return <Badge variant="destructive">{t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.verdict.rejected')}</Badge>
  }
  return <Badge variant="outline">{verdict}</Badge>
}

// =============================================================================
// Props
// =============================================================================

interface CarrierRecentQuotesTableProps {
  quotes: RecentQuote[] | null
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function CarrierRecentQuotesTable({ quotes, isLoading = false }: CarrierRecentQuotesTableProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 rounded bg-surface-muted animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-surface-muted animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-surface-muted animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 rounded bg-surface-muted animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-surface-muted animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 rounded bg-surface-muted animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-8 rounded bg-surface-muted animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.date')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.cedula')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-right">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.canon')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.verdict')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-right">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.prima')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-right">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.latency')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wide text-center">
                {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.cols.view')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotes.map((quote) => (
              <tr
                key={quote.id}
                className="hover:bg-surface-muted/50 transition-colors"
              >
                {/* Fecha/hora */}
                <td className="px-4 py-3 text-sm text-fg-muted whitespace-nowrap">
                  {new Date(quote.createdAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>

                {/* Cédula — T-35-11: MUST use <Mask> — never render cedulaHashPrefix8 as raw text */}
                <td className="px-4 py-3">
                  <Mask field="cedula" value={quote.cedulaHashPrefix8} />
                </td>

                {/* Canon */}
                <td className="px-4 py-3 text-sm text-fg-muted text-right whitespace-nowrap">
                  {formatCOP(quote.canonMensualCop)}
                </td>

                {/* Veredicto */}
                <td className="px-4 py-3">
                  <VerdictBadge verdict={quote.verdict} t={t} />
                </td>

                {/* Prima mensual */}
                <td className="px-4 py-3 text-sm text-fg-muted text-right font-mono tabular-nums whitespace-nowrap">
                  {quote.primaMensualCop != null ? formatCOP(quote.primaMensualCop) : '—'}
                </td>

                {/* Latencia */}
                <td className="px-4 py-3 text-sm text-fg-muted text-right font-mono tabular-nums whitespace-nowrap">
                  {quote.latencyMs != null ? `${quote.latencyMs}ms` : '—'}
                </td>

                {/* Ver link */}
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/panel/inmobiliaria/ai/asegurabilidad/${quote.id}`}
                    className="text-fg-muted hover:text-primary transition-colors inline-flex items-center justify-center"
                    aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.carrier.recentQuotes.viewAriaLabel')}
                  >
                    <ArrowSquareOut className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
