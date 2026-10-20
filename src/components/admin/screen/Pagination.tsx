'use client'

import { TablePagination } from '@/components/ui/pagination'

/**
 * El paginador del admin: el de las tablas de la plataforma (Cadence:
 * «Mostrando 1–50 de 312», páginas numeradas y flechas). El back del admin
 * cuenta las páginas desde 0 y el de Cadence desde 1: se traduce acá.
 *
 * Va en el `pie` del `DataTable`, dentro de la misma tarjeta. Con filas,
 * siempre se ve (aunque quepan en una página): es lo que dice cuántas hay.
 */
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}) {
  if (total <= 0) return null
  return (
    <TablePagination
      total={total}
      page={page + 1}
      pageSize={pageSize}
      onPageChange={(pagina) => onPage(pagina - 1)}
    />
  )
}
