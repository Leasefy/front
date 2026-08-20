'use client'

/**
 * ExpandableTable.tsx — la tabla de comparables con fila expandible.
 *
 * Cada fila que trae `detail` (los factores de ajuste) se abre bajo la fila con
 * `AnimatePresence` (alto auto). El estado vive acá, en cliente; los datos son
 * el `TableBlock` serializable que llega del servidor.
 *
 * Papel y búsqueda: el desglose de una fila cerrada NO está en el DOM (es una
 * decisión de lectura, no del documento), pero SÍ hay una copia siempre
 * abierta y sólo-impresión (`.report-print-only`) debajo de la tabla, para que
 * «plegado ≠ ausente» se cumpla en la hoja de impresión sin JS.
 *
 * El botón de expandir vive DENTRO de la primera celda —no en una columna
 * extra— así la tabla conserva exactamente las columnas del modelo.
 */

import { Fragment, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatScalar, isNumericFormat } from '@/lib/avaluo/reporte/report-format'
import type { Scalar, TableBlock } from '@/lib/avaluo/reporte/report-model'

/**
 * Celda. Los bps de la tabla NO se colorean por signo: «ajuste bruto» es una
 * suma de valores absolutos y siempre da positivo. El color por signo queda
 * para los chips de factores del desglose, que sí son ajustes con signo.
 */
function Cell({ scalar }: { scalar: Scalar }) {
  const numeric = isNumericFormat(scalar.format) && !scalar.missing
  return (
    <span
      {...(scalar.pii ? { 'data-pii-field': '' } : {})}
      className={cn(
        numeric && 'whitespace-nowrap font-mono tabular-nums',
        scalar.missing && 'font-mono text-[11px] uppercase tracking-[0.06em] text-warning',
      )}
    >
      {formatScalar(scalar)}
    </span>
  )
}

function FactorChips({ detail }: { detail: TableBlock }) {
  const factorKey = detail.columns[0]?.key
  const valueKey = detail.columns[1]?.key
  if (factorKey === undefined || valueKey === undefined) return null
  return (
    <div className="flex flex-wrap gap-2">
      {detail.rows.map((row) => {
        const factor = row.cells[factorKey]
        const value = row.cells[valueKey]
        if (factor === undefined || value === undefined) return null
        const raw = typeof value.raw === 'number' ? value.raw : 0
        return (
          <span
            key={row.key}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-fg"
          >
            {formatScalar(factor)}
            <b
              className={cn(
                'whitespace-nowrap font-mono font-semibold tabular-nums',
                raw > 0 && 'text-success',
                raw < 0 && 'text-danger',
              )}
            >
              {formatScalar(value)}
            </b>
          </span>
        )
      })}
    </div>
  )
}

export function ExpandableTable({ block }: { block: TableBlock }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const reduced = useReducedMotion()
  const columns = block.columns
  const hasDetail = block.rows.some((row) => row.detail !== null)

  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <div
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="overflow-x-auto rounded-md border border-border"
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  scope="col"
                  numeric={column.align === 'right'}
                  className={cn('whitespace-nowrap', column.align === 'right' && 'text-right')}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row) => {
              const expanded = open.has(row.key)
              const detailId = `detalle-${row.key}`
              return (
                <Fragment key={row.key}>
                  <TableRow
                    data-expanded={expanded ? 'true' : undefined}
                    className={cn(
                      'transition-colors',
                      row.detail !== null && 'cursor-pointer hover:bg-surface-hover',
                      expanded && 'bg-primary-soft',
                    )}
                    onClick={row.detail === null ? undefined : () => toggle(row.key)}
                  >
                    {columns.map((column, index) => {
                      const cell = row.cells[column.key]
                      return (
                        <TableCell
                          key={column.key}
                          numeric={column.align === 'right'}
                          className={cn('whitespace-nowrap', column.align === 'right' && 'text-right')}
                        >
                          {index === 0 && row.detail !== null ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={detailId}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggle(row.key)
                              }}
                              className="inline-flex items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <CaretDown
                                aria-hidden="true"
                                className={cn(
                                  'size-3.5 shrink-0 text-fg-subtle transition-transform duration-200',
                                  expanded && 'rotate-180 text-primary',
                                )}
                              />
                              {cell === undefined ? '—' : <Cell scalar={cell} />}
                            </button>
                          ) : cell === undefined ? (
                            '—'
                          ) : (
                            <Cell scalar={cell} />
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                  {row.detail !== null && (
                    <tr aria-hidden={!expanded} className="border-0">
                      <td colSpan={columns.length} className="p-0">
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              id={detailId}
                              key="detail"
                              initial={reduced ? false : { height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="border-b border-border-faint bg-surface-muted px-4 py-3 pl-9">
                                <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
                                  Factores de ajuste
                                </p>
                                <FactorChips detail={row.detail} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {block.caption !== null && <p className="text-caption text-fg-muted">{block.caption}</p>}

      {hasDetail && (
        <>
          <p className="text-[12px] text-fg-subtle">
            Abrí una fila para ver sus factores de ajuste. La tabla se desliza en horizontal.
          </p>
          {/* Copia sólo-impresión: en papel el desglose va SIEMPRE abierto. */}
          <div className="report-print-only space-y-2" aria-hidden="true">
            {block.rows.map((row) =>
              row.detail === null ? null : (
                <div key={`print-${row.key}`} className="rounded-md border border-border-faint px-3 py-2">
                  <p className="font-mono text-[11px] text-fg-muted">
                    Factores de ajuste · {row.key}
                  </p>
                  <FactorChips detail={row.detail} />
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  )
}
