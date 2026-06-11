'use client'

import { useI18n } from '@/lib/i18n'
import type { AssumptionRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// State pill semantic colors (mirrors SLA_COLORS pattern from CotizadorCarriersStatus)
// ---------------------------------------------------------------------------
const STATE_COLORS: Record<string, string> = {
  active:
    'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]',
  deprecated:
    'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D]',
  under_review:
    'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InsightsAssumptionTableProps {
  assumptions: AssumptionRow[] | null
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InsightsAssumptionTable({
  assumptions,
  isLoading,
}: InsightsAssumptionTableProps) {
  const { t } = useI18n()

  // Loading skeleton
  if (isLoading && assumptions === null) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded"
          />
        ))}
      </div>
    )
  }

  // Empty state
  if (!assumptions || assumptions.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        {t('inmobiliaria.ai.cotizador.insights.assumptions.empty')}
      </p>
    )
  }

  const rows = assumptions.slice(0, 20)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="pb-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.name')}
            </th>
            <th className="pb-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide hidden md:table-cell">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.description')}
            </th>
            <th className="pb-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.state')}
            </th>
            <th className="pb-2 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide hidden sm:table-cell">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.updatedAt')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row) => {
            const stateKey = row.status ?? 'active'
            const stateLabel =
              t(`inmobiliaria.ai.cotizador.insights.assumptions.states.${stateKey}`) ||
              stateKey
            const stateClass =
              STATE_COLORS[stateKey] ?? STATE_COLORS.active

            const updatedAt = row.validatedAt ?? row.createdAt
            const formattedDate = updatedAt
              ? new Date(updatedAt).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'

            return (
              <tr
                key={row.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
              >
                {/* Name / Statement */}
                <td className="py-2.5 pr-4 font-medium text-neutral-800 dark:text-neutral-200 max-w-[200px] truncate">
                  {row.statement || row.id}
                </td>
                {/* Description (hidden on mobile) — use source as description if available */}
                <td className="py-2.5 pr-4 text-neutral-500 dark:text-neutral-400 max-w-[220px] truncate hidden md:table-cell">
                  {row.source ?? '—'}
                </td>
                {/* State pill */}
                <td className="py-2.5 pr-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stateClass}`}
                  >
                    {stateLabel}
                  </span>
                </td>
                {/* Updated At (hidden on xs) */}
                <td className="py-2.5 text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap hidden sm:table-cell">
                  {formattedDate}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
