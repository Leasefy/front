/**
 * Table — THIN SHIM over @leasefy/cadence (alias de nombres shadcn → primitivas DS).
 *
 * DS: headers mono uppercase, hairline dividers, hover row. Los TH/TD del DS
 * aceptan además `numeric` / `muted` (superset de la API shadcn local).
 * TableCaption no existe en el DS y no tiene call sites en el mvp → se elimina.
 *
 * `Table` se reimplementa localmente (mismas clases que el DS) porque el
 * producto añadió comportamiento al wrapper de scroll que el DS no expone:
 *  - `overscroll-contain` en el contenedor (evita scroll-chaining en mobile)
 *  - `stickyHeader` opt-in para contenedores con scroll vertical
 */

import * as React from "react"

import { cn } from "@/lib/utils"

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
    <div className="relative w-full overflow-auto overscroll-contain">
      <table
        ref={ref}
        className={cn(
          // mismas clases que el Table del DS (@leasefy/cadence)
          "w-full border-collapse text-body-sm",
          stickyHeader &&
            "[&_th]:sticky [&_th]:top-0 [&_th]:bg-bg [&_th]:z-10",
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

export {
  THead as TableHeader,
  TBody as TableBody,
  TFoot as TableFooter,
  TH as TableHead,
  TR as TableRow,
  TD as TableCell,
} from "@leasefy/cadence"

export type { THProps as TableHeadProps, TDProps as TableCellProps } from "@leasefy/cadence"

export { Table }
