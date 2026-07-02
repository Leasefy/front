'use client'

import { useI18n } from '@/lib/i18n'
import {
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui'
import type { AssumptionRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// State pill semantic → Badge variant
// ---------------------------------------------------------------------------
const STATE_VARIANT: Record<string, 'success' | 'destructive' | 'warning'> = {
  active: 'success',
  deprecated: 'destructive',
  under_review: 'warning',
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
            className="h-10 bg-surface-muted rounded"
          />
        ))}
      </div>
    )
  }

  // Empty state
  if (!assumptions || assumptions.length === 0) {
    return (
      <p className="text-sm text-fg-muted text-center py-6">
        {t('inmobiliaria.ai.cotizador.insights.assumptions.empty')}
      </p>
    )
  }

  const rows = assumptions.slice(0, 20)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pr-4">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.name')}
            </TableHead>
            <TableHead className="pr-4 hidden md:table-cell">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.description')}
            </TableHead>
            <TableHead className="pr-4">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.state')}
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.updatedAt')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const stateKey = row.status ?? 'active'
            const stateLabel =
              t(`inmobiliaria.ai.cotizador.insights.assumptions.states.${stateKey}`) ||
              stateKey
            const stateVariant = STATE_VARIANT[stateKey] ?? 'success'

            const updatedAt = row.validatedAt ?? row.createdAt
            const formattedDate = updatedAt
              ? new Date(updatedAt).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'

            return (
              <TableRow key={row.id}>
                {/* Name / Statement */}
                <TableCell className="py-2.5 pr-4 font-medium text-fg max-w-[200px] truncate">
                  {row.statement || row.id}
                </TableCell>
                {/* Description (hidden on mobile) — use source as description if available */}
                <TableCell className="py-2.5 pr-4 text-fg-muted max-w-[220px] truncate hidden md:table-cell">
                  {row.source ?? '—'}
                </TableCell>
                {/* State pill */}
                <TableCell className="py-2.5 pr-4">
                  <Badge variant={stateVariant}>{stateLabel}</Badge>
                </TableCell>
                {/* Updated At (hidden on xs) */}
                <TableCell className="py-2.5 text-xs text-fg-muted whitespace-nowrap hidden sm:table-cell">
                  {formattedDate}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
