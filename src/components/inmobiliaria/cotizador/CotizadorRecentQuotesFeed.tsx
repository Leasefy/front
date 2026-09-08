'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Tray } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { SinDatos } from '@/components/estado/SinDatos'
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

  // El vacío va sin padding propio: `SinDatos` trae el suyo y es el mismo
  // hueco que ocupa la lista.
  const vacio = !isLoading && quotes.length === 0

  return (
    <div
      className={`rounded-lg border border-border bg-surface overflow-hidden ${vacio ? '' : 'p-5'}`}
    >
      {/* Esqueleto con la forma de la lista: título + referencia + chip. */}
      {isLoading && quotes.length === 0 ? (
        <ul className="divide-y divide-border" role="status" aria-label="Cargando">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-surface-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-surface-muted animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-surface-muted animate-pulse" />
            </li>
          ))}
          <span className="sr-only">Cargando…</span>
        </ul>
      ) : vacio ? (
        // El vacío de la casa: círculo gris, título, una línea. Antes era un
        // par de <p> sueltos que no se parecían a ningún otro vacío del panel.
        <SinDatos
          queSon="cotizaciones"
          icono={Tray}
          titulo={t('inmobiliaria.ai.cotizador.overview.recentQuotes.empty')}
          descripcion={t('inmobiliaria.ai.cotizador.overview.recentQuotes.emptyHelper')}
        />
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
