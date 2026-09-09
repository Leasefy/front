'use client'

import { ListChecks } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { SinDatos } from '@/components/estado/SinDatos'
import type { AssumptionRow } from '@/lib/hooks/cotizador/use-insights'

// ---------------------------------------------------------------------------
// State pill semantic → Badge variant
// ---------------------------------------------------------------------------
const STATE_VARIANT: Record<string, 'success' | 'destructive' | 'warning'> = {
  active: 'success',
  deprecated: 'destructive',
  under_review: 'warning',
}

const COLUMNAS = 4

/** Filas esqueleto con las mismas columnas que la tabla real. */
function FilasDeCarga() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i} className="animate-pulse" aria-hidden="true">
          {Array.from({ length: COLUMNAS }).map((__, j) => (
            <TableCell key={j} className="px-4 py-3">
              <div className="h-4 w-20 rounded bg-surface-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
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

  const cargando = Boolean(isLoading) && assumptions === null
  const rows = (assumptions ?? []).slice(0, 20)

  // La tabla de la casa: la carga y el vacío viven dentro del cuerpo, con la
  // cabecera siempre visible para que se sepa qué columnas van a llegar.
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.name')}
            </TableHead>
            <TableHead className="px-4 py-3 hidden md:table-cell">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.description')}
            </TableHead>
            <TableHead className="px-4 py-3">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.state')}
            </TableHead>
            <TableHead className="px-4 py-3 hidden sm:table-cell">
              {t('inmobiliaria.ai.cotizador.insights.assumptions.columns.updatedAt')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando ? (
            <FilasDeCarga />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                <SinDatos
                  queSon="supuestos"
                  icono={ListChecks}
                  titulo={t('inmobiliaria.ai.cotizador.insights.assumptions.empty')}
                  descripcion="Cuando el modelo registre un supuesto sobre una aseguradora, aparece acá con su estado."
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
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
                  <TableCell className="px-4 py-2.5 font-medium text-fg max-w-[200px] truncate">
                    {row.statement || row.id}
                  </TableCell>
                  {/* Description (hidden on mobile) — use source as description if available */}
                  <TableCell className="px-4 py-2.5 text-fg-muted max-w-[220px] truncate hidden md:table-cell">
                    {row.source ?? '—'}
                  </TableCell>
                  {/* State pill */}
                  <TableCell className="px-4 py-2.5">
                    <Badge variant={stateVariant}>{stateLabel}</Badge>
                  </TableCell>
                  {/* Updated At (hidden on xs) */}
                  <TableCell className="px-4 py-2.5 text-xs text-fg-muted whitespace-nowrap hidden sm:table-cell">
                    {formattedDate}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </section>
  )
}
