import { LoadingBlock, ErrorBlock, EmptyBlock } from './states'

export interface Column<T> {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

/**
 * Generic zebra table with built-in loading / error / empty handling.
 * Columns are declared once per screen; rows come from the API envelope's `data`.
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
}: {
  columns: Column<T>[]
  rows: T[] | undefined
  getKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  error?: Error | null
  emptyTitle?: string
  emptyHint?: string
}) {
  if (isLoading) return <LoadingBlock />
  if (error) return <ErrorBlock error={error} />
  if (!rows || rows.length === 0) return <EmptyBlock title={emptyTitle} hint={emptyHint} />

  const alignClass = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm table-zebra">
        <thead>
          <tr className="border-b border-bg-border">
            {columns.map((c, i) => (
              <th
                key={i}
                className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap ${alignClass(c.align)}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={getKey(row, ri)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((c, ci) => (
                <td key={ci} className={`px-3 py-2.5 align-top ${alignClass(c.align)} ${c.className ?? ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
