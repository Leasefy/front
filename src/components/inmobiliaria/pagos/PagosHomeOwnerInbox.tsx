'use client'

/**
 * PagosHomeOwnerInbox — Pagos IA Home, widget HOME-04.
 *
 * Table of owners with payouts to process. Columns:
 *   propietario / inmuebles / valor a pagar / estado (badge) / acción (button).
 * Built on the DS `Table` primitive. Action button is labeled from each row's
 * `suggestedAction`. Empty state uses the shared EmptyState primitive.
 *
 * Pure presentational: receives the owner-inbox payload + loading/error flags.
 *
 * El endpoint devuelve la lista completa de propietarios, sin tope: el recorte
 * es de presentación y va con `useTablePagination` + el pie del design system.
 */

import { useMemo } from 'react'
import { UsersThree, Warning } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { OwnerInbox } from '@/lib/api/pagos-home.types'

export interface PagosHomeOwnerInboxProps {
  data: OwnerInbox | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export function PagosHomeOwnerInbox({
  data,
  isLoading,
  error,
  onRetry,
}: PagosHomeOwnerInboxProps) {
  const { t, formatCurrency } = useI18n()

  // `data` puede venir en null mientras carga o si falló. Se estabiliza acá
  // para no crear un array nuevo en cada render.
  const rows = useMemo(() => data?.rows ?? [], [data])

  // Sin `resetKey`: el widget no tiene filtros ni búsqueda. Los hooks van antes
  // de cualquier return condicional (carga / error / vacío).
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(rows)

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">
          {t('inmobiliaria.ai.pagos_home.ownerInbox.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.ai.pagos_home.ownerInbox.subtitle')}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <OwnerInboxSkeleton />
        ) : error && !isLoading ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4"
          >
            <span className="inline-flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
              <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
              {t('inmobiliaria.ai.pagos_home.errors.loading')}: {error}
            </span>
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 text-xs font-medium text-rose-600 dark:text-rose-400 underline hover:no-underline"
            >
              {t('inmobiliaria.ai.pagos_home.errors.retry')}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersThree}
            title={t('inmobiliaria.ai.pagos_home.ownerInbox.empty.title')}
            description={t('inmobiliaria.ai.pagos_home.ownerInbox.empty.description')}
          />
        ) : (
          <>
            <Table data-testid="owner-inbox-table">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('inmobiliaria.ai.pagos_home.ownerInbox.columns.propietario')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('inmobiliaria.ai.pagos_home.ownerInbox.columns.inmuebles')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('inmobiliaria.ai.pagos_home.ownerInbox.columns.valorAPagar')}
                  </TableHead>
                  <TableHead>
                    {t('inmobiliaria.ai.pagos_home.ownerInbox.columns.estado')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('inmobiliaria.ai.pagos_home.ownerInbox.columns.accion')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((row) => (
                  <TableRow key={row.ownerProfileId}>
                    <TableCell className="font-medium text-foreground">{row.ownerName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.inmueblesCount}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCurrency(row.valorAPagarCop)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" hideArrow>
                        {row.suggestedAction}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pie: sólo si hay más de una página. */}
            {shouldPaginate && (
              <div className="border-t border-border pt-3 mt-3">
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function OwnerInboxSkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          data-testid="owner-inbox-skeleton"
          className="h-10 rounded bg-muted"
        />
      ))}
    </div>
  )
}
