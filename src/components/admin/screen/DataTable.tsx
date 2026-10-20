'use client'

import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { LoadingBlock, ErrorBlock, EmptyBlock } from './states'

export interface Column<T> {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

/**
 * La tabla del admin: la `Table` de la plataforma (Cadence: encabezados mono,
 * filetes finos, la fila se tiñe al pasar, aviso si no cabe y se corre) dentro
 * de UNA tarjeta, como las tablas del panel de la inmobiliaria: la barra de
 * filtros arriba (`barra`), la tabla —o su estado— y el paginador abajo (`pie`).
 *
 * Cargando, error y vacío van ADENTRO de la tarjeta: con un buscador en la
 * barra, un vacío que reemplazara la tarjeta entera se llevaría el texto que
 * la persona acaba de escribir.
 *
 * Las filas entran escalonadas cuando llegan los datos o cambia la página
 * (`TableBodyAnimado`, techo de 320 ms). Una fila con `onRowClick` se abre
 * también con Enter o Espacio.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  onRowClick,
  isLoading,
  error,
  emptyTitle = 'Sin resultados',
  emptyHint,
  emptyIcon,
  onReintentar,
  barra,
  pie,
  filaMarcada,
  className,
  'aria-label': ariaLabel,
}: {
  columns: Column<T>[]
  rows: T[] | undefined
  getKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  error?: Error | null
  emptyTitle?: string
  emptyHint?: string
  emptyIcon?: React.ReactNode
  onReintentar?: () => void
  /** Filtros o búsqueda, arriba y dentro de la misma tarjeta. */
  barra?: React.ReactNode
  /** El paginador, abajo y dentro de la misma tarjeta. */
  pie?: React.ReactNode
  /** La fila abierta en un cajón, marcada. */
  filaMarcada?: (row: T) => boolean
  className?: string
  'aria-label'?: string
}) {
  const alineacion = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  let cuerpo: React.ReactNode
  if (isLoading) cuerpo = <LoadingBlock suelto={false} />
  else if (error) cuerpo = <ErrorBlock error={error} onReintentar={onReintentar} suelto={false} />
  else if (!rows || rows.length === 0)
    cuerpo = <EmptyBlock title={emptyTitle} hint={emptyHint} icono={emptyIcon} suelto={false} />
  else
    cuerpo = (
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c, i) => (
              <TableHead key={i} className={cn('whitespace-nowrap', alineacion(c.align))}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBodyAnimado>
          {rows.map((row, ri) => (
            <TableRowAnimada
              key={getKey(row, ri)}
              selected={filaMarcada?.(row) ?? false}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                onRowClick &&
                  'cursor-pointer outline-none focus-visible:bg-surface-muted focus-visible:shadow-[inset_3px_0_0_var(--primary)]',
              )}
            >
              {columns.map((c, ci) => (
                <TableCell key={ci} className={cn('align-top', alineacion(c.align), c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRowAnimada>
          ))}
        </TableBodyAnimado>
      </Table>
    )

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      {barra ? <div className="border-b border-border p-4">{barra}</div> : null}
      {cuerpo}
      {pie ? <div className="border-t border-border bg-muted/10 px-4 py-3">{pie}</div> : null}
    </div>
  )
}
