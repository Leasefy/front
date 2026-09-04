/**
 * Table — THIN SHIM over @leasefy/cadence (alias de nombres shadcn → primitivas DS).
 *
 * DS: headers mono uppercase, hairline dividers, hover row. Los TH/TD del DS
 * aceptan además `numeric` / `muted` (superset de la API shadcn local).
 * TableCaption no existe en el DS y no tiene call sites en el mvp → se elimina.
 *
 * `Table` se reimplementa localmente (mismas clases que el DS) porque el
 * producto añadió comportamiento al wrapper de scroll que el DS no expone:
 *  - `overscroll-x-contain` en el contenedor: frena el gesto de «volver atrás» al
 *    llegar al borde horizontal en mobile, pero SÓLO en X. Con `overscroll-contain`
 *    (los dos ejes) una tabla SIN scroll propio igual se tragaba la rueda vertical y
 *    el contenedor de arriba nunca se movía — en el muro de migración, con el
 *    puntero sobre la tabla de columnas, no se podía bajar (Nico, 2026-09-01).
 *  - `stickyHeader` opt-in para contenedores con scroll vertical
 *
 * `TableHeader`/`TableFooter` envuelven THead/TFoot del DS para reemplazar el
 * tinte de header HARDCODEADO (`bg-[#FBFAF9]`, que NO se adapta a dark → barra
 * blanca estridente) por un token adaptativo: `bg-bg` en light (idéntico a hoy)
 * y `bg-surface-muted` en dark (gris sobrio que combina con el fondo oscuro).
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import { THead, TFoot } from "@leasefy/cadence"

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * Opt-in sticky header for vertically scrolling containers.
   * Default off — desktop rendering is unchanged unless explicitly enabled.
   */
  stickyHeader?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader = false, ...props }, ref) => (
    <div className="relative w-full overflow-auto overscroll-x-contain">
      <table
        ref={ref}
        className={cn(
          // mismas clases que el Table del DS (@leasefy/cadence)
          "w-full border-collapse text-body-sm",
          stickyHeader &&
            "[&_th]:sticky [&_th]:top-0 [&_th]:bg-bg dark:[&_th]:bg-surface-muted [&_th]:z-10",
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

/** Header strip — sober adaptive tint (light #FBFAF9 = bg-bg / dark surface-muted). */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <THead ref={ref} className={cn("bg-bg dark:bg-surface-muted", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

/** Totals row — same adaptive tint as the header (was hardcoded #FBFAF9). */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <TFoot ref={ref} className={cn("bg-bg dark:bg-surface-muted", className)} {...props} />
))
TableFooter.displayName = "TableFooter"

export {
  TBody as TableBody,
  TH as TableHead,
  TR as TableRow,
  TD as TableCell,
} from "@leasefy/cadence"

export type { THProps as TableHeadProps, TDProps as TableCellProps } from "@leasefy/cadence"

export { Table, TableHeader, TableFooter }
