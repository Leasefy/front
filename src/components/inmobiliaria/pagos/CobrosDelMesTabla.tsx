'use client'

/**
 * CobrosDelMesTabla — los cobros de un mes en LA tabla de la casa.
 *
 * Nico (2026-09-03), sobre el Resumen de Pagos IA: «aquí tampoco está la tabla
 * que usamos nosotros». Lo que había era `CobroTable` (framer-motion por fila,
 * orden por columna, menú de acciones, vacío propio) — otra tabla. Esta usa
 * las mismas primitivas que Agenda, Inquilinos y el resto del panel:
 * `Table` + `useTablePagination` + `TablePagination`, sin título encima («no
 * nombramos las tablas»), y con el vacío DENTRO del `<TableBody>` para que los
 * encabezados de columna se sigan viendo.
 *
 * Sólo pinta. Cargando y fallo los resuelve `EstadoDeDatos` en el panel; acá
 * llegan las filas ya resueltas (todas las del mes) y se paginan de a 10.
 */

import type { KeyboardEvent } from 'react'
import { Receipt } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { SinDatos } from '@/components/estado/SinDatos'
import { useTablePagination } from '@/lib/hooks/use-table-pagination'
import { cn } from '@/lib/utils'
import { mesEnTitulo, nombreDelMes } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria'

/** Estado → variant del Badge (tokens del DS, cero hex). Mismo mapa que CobroTable. */
const ESTADO_VARIANT: Record<CobroStatus, 'warning' | 'success' | 'default' | 'destructive'> = {
  pending: 'warning',
  paid: 'success',
  partial: 'default',
  late: 'destructive',
  defaulted: 'destructive',
}

/**
 * La dirección del inmueble.
 *
 * El tipo `Cobro` declara `propertyAddress`, pero la tabla `cobros` del back
 * NO tiene esa columna: `GET /inmobiliaria/cobros` la trae dentro de
 * `consignacion.propertyAddress` (el include del `findAll`). Se leen las dos
 * fuentes para no pintar «undefined» ni mentir con un vacío.
 */
function direccionDe(c: Cobro): string | null {
  const anidada = (c as Cobro & { consignacion?: { propertyAddress?: string | null } })
    .consignacion?.propertyAddress
  return c.propertyAddress || anidada || null
}

/**
 * `dueDate` es `@db.Date` y llega como 'YYYY-MM-DDT00:00:00.000Z'. Pasarlo por
 * `new Date(iso)` y formatearlo en Colombia (UTC-5) lo corre al día anterior:
 * se lee la fecha como ETIQUETA (año, mes, día) y se construye en hora local.
 */
function fechaLocal(iso: string, locale: 'es' | 'en'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export interface CobrosDelMesTablaProps {
  /** TODAS las filas del mes; la tabla pagina sola. */
  cobros: readonly Cobro[]
  /** 'YYYY-MM'. Cambiar de mes vuelve a la página 1. */
  mes: string
  /** El CTA del vacío: generar los cobros de este mes. */
  onGenerar: () => void
  /** Clic en una fila. Si no se pasa, las filas no son interactivas. */
  onCobroClick?: (cobro: Cobro) => void
}

const COLUMNAS = 7

export function CobrosDelMesTabla({ cobros, mes, onGenerar, onCobroClick }: CobrosDelMesTablaProps) {
  const { t, locale, formatCurrency } = useI18n()
  const titulo = mesEnTitulo(mes)

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(cobros, { initialPageSize: 10, resetKey: mes })

  const onTecla = (c: Cobro) => (ev: KeyboardEvent<HTMLTableRowElement>) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      onCobroClick?.(c)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-surface"
      data-testid="pagos-cobros-tabla"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{t('inmobiliaria.cobros.table.tenant')}</TableHead>
            <TableHead className="whitespace-nowrap">
              {t('inmobiliaria.ai.pagos_home.detail.contexto.property')}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('inmobiliaria.ai.pagos_home.detail.contexto.periodo')}
            </TableHead>
            <TableHead className="whitespace-nowrap" numeric>
              {t('inmobiliaria.cobros.table.total')}
            </TableHead>
            <TableHead className="whitespace-nowrap" numeric>
              {t('inmobiliaria.cobros.table.paid')} / {t('inmobiliaria.cobros.table.pending').toLowerCase()}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('inmobiliaria.ai.pagos_home.detail.contexto.dueDate')}
            </TableHead>
            <TableHead className="whitespace-nowrap">{t('inmobiliaria.cobros.table.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cobros.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                {/* Sin filtros en este bloque (el mes no es un filtro, es el
                    alcance): un vacío acá es «todavía no se generaron», y lo
                    útil es generarlos desde acá. Mismo diálogo que el botón
                    de arriba. */}
                <SinDatos
                  queSon={t('inmobiliaria.ai.pagos_home.resumen.cobros.queSon')}
                  icono={Receipt}
                  titulo={t('inmobiliaria.ai.pagos_home.resumen.cobros.vacioTitulo', { mes: titulo })}
                  descripcion={t('inmobiliaria.ai.pagos_home.resumen.cobros.vacioDescripcion', {
                    mes: titulo,
                  })}
                  crear={{
                    label: t('inmobiliaria.ai.pagos_home.resumen.cobros.generarCta', { mes: titulo }),
                    onClick: onGenerar,
                  }}
                />
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((c) => {
              const direccion = direccionDe(c)
              const interactiva = Boolean(onCobroClick)
              return (
                <TableRow
                  key={c.id}
                  onClick={interactiva ? () => onCobroClick?.(c) : undefined}
                  onKeyDown={interactiva ? onTecla(c) : undefined}
                  tabIndex={interactiva ? 0 : undefined}
                  className={cn(interactiva && 'cursor-pointer')}
                  data-testid="cobro-fila"
                >
                  <TableCell>
                    <p className="truncate font-medium text-fg">{c.tenantName || '—'}</p>
                    {c.tenantPhone && (
                      <p className="truncate text-caption text-fg-muted">{c.tenantPhone}</p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate text-fg">{c.propertyTitle}</p>
                    {direccion && <p className="truncate text-caption text-fg-muted">{direccion}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-fg-muted">
                    {nombreDelMes(c.month, locale === 'es' ? 'es' : 'en', 'short')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums" numeric>
                    <span className="font-medium text-fg">{formatCurrency(c.totalWithFees)}</span>
                    {c.lateFee > 0 && (
                      <p className="text-caption text-danger">+ {formatCurrency(c.lateFee)}</p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums" numeric>
                    <span className={cn('font-medium', c.paidAmount > 0 ? 'text-success' : 'text-fg-muted')}>
                      {formatCurrency(c.paidAmount)}
                    </span>
                    <p
                      className={cn(
                        'text-caption',
                        c.pendingAmount > 0 && c.daysLate > 0 ? 'text-danger' : 'text-fg-muted',
                      )}
                    >
                      {formatCurrency(c.pendingAmount)}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                    {fechaLocal(c.dueDate, locale === 'es' ? 'es' : 'en')}
                    {c.daysLate > 0 && (
                      <p className="text-caption text-danger">
                        {c.daysLate} {c.daysLate === 1 ? 'día' : 'días'}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={ESTADO_VARIANT[c.status] ?? 'secondary'}>
                      {t(`inmobiliaria.cobros.status.${c.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Pie siempre que haya filas (criterio del hook): con una sola página
          igual dice «1–3 de 3» y deja elegir cuántas ver. Sin filas, nada. */}
      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3" data-testid="pagos-cobros-pie">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
