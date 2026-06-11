/**
 * Table — THIN SHIM over @leasefy/ui (alias de nombres shadcn → primitivas DS).
 *
 * DS: headers mono uppercase, hairline dividers, hover row. Los TH/TD del DS
 * aceptan además `numeric` / `muted` (superset de la API shadcn local).
 * TableCaption no existe en el DS y no tiene call sites en el mvp → se elimina.
 */

export {
  Table,
  THead as TableHeader,
  TBody as TableBody,
  TFoot as TableFooter,
  TH as TableHead,
  TR as TableRow,
  TD as TableCell,
} from "@leasefy/ui"

export type { THProps as TableHeadProps, TDProps as TableCellProps } from "@leasefy/ui"
