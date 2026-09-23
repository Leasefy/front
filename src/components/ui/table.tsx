'use client'

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
 *  - 🔴 20-09 · AVISO DE DESBORDE: una tabla que no cabe se cortaba en seco.
 *    Ver `use-desborde-horizontal.ts` para el porqué; acá van las tres piezas
 *    que lo hacen visible (sombra en el borde, el aviso en letra chica, y el
 *    contenedor enfocable para poder correrlo con el teclado).
 *
 * `TableHeader`/`TableFooter` envuelven THead/TFoot del DS para reemplazar el
 * tinte de header HARDCODEADO (`bg-[#FBFAF9]`, que NO se adapta a dark → barra
 * blanca estridente) por un token adaptativo: `bg-bg` en light (idéntico a hoy)
 * y `bg-surface-muted` en dark (gris sobrio que combina con el fondo oscuro).
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import { useDesbordeHorizontal } from "@/components/ui/use-desborde-horizontal"
import { THead, TFoot } from "@leasefy/cadence"

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * Opt-in sticky header for vertically scrolling containers.
   * Default off — desktop rendering is unchanged unless explicitly enabled.
   */
  stickyHeader?: boolean
  /**
   * Apagar el aviso escrito de desborde (la sombra del borde se queda).
   * Para las tablas que ya explican su propio ancho con más precisión —el
   * libro mayor dice cuántos meses hay— donde el aviso genérico sobra.
   */
  avisoDeDesborde?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader = false, avisoDeDesborde = true, ...props }, ref) => {
    const { ref: caja, desborda, haciaLaIzquierda, haciaLaDerecha } =
      useDesbordeHorizontal<HTMLDivElement>()
    return (
      <div className="relative w-full">
        <div
          ref={caja}
          data-desborda={desborda ? "true" : undefined}
          className="w-full overflow-auto overscroll-x-contain"
          /*
           * Enfocable SÓLO cuando desborda. Un contenedor con scroll que no se
           * puede enfocar no se puede correr con el teclado (WCAG 2.1.1): con
           * el ratón se arrastra y sin ratón la última columna no existe. Y
           * `tabIndex` fijo metería una parada de tabulación muerta en cada
           * tabla del producto, incluidas las que caben.
           */
          {...(desborda
            ? {
                tabIndex: 0,
                role: "region",
                "aria-label": "Tabla que no cabe entera: se corre a los lados",
              }
            : {})}
        >
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

        {/*
          Sombra en el borde por el que sigue habiendo tabla. Es una SOMBRA y no
          un degradado a un color: una tabla del producto vive tanto sobre
          `bg-surface` como sobre `bg-bg`, y un degradado «hacia blanco» se ve
          como una mancha en la mitad de los casos. La sombra funciona sobre
          cualquier fondo y no tapa el dato: `pointer-events-none` y 12 px.
        */}
        {haciaLaIzquierda ? (
          <div
            aria-hidden="true"
            data-testid="sigue-a-la-izquierda"
            className="pointer-events-none absolute inset-y-0 left-0 w-3 shadow-[inset_10px_0_8px_-8px_rgba(0,0,0,0.18)] dark:shadow-[inset_10px_0_8px_-8px_rgba(0,0,0,0.65)]"
          />
        ) : null}
        {haciaLaDerecha ? (
          <div
            aria-hidden="true"
            data-testid="sigue-a-la-derecha"
            className="pointer-events-none absolute inset-y-0 right-0 w-3 shadow-[inset_-10px_0_8px_-8px_rgba(0,0,0,0.18)] dark:shadow-[inset_-10px_0_8px_-8px_rgba(0,0,0,0.65)]"
          />
        ) : null}

        {/*
          Y el aviso en palabras. La sombra sola supone que alguien la lee como
          «hay más»; el texto no supone nada, y es el que convierte «la tabla
          está cortada» en «la tabla se corre». Sólo mientras desborda.
        */}
        {desborda && avisoDeDesborde ? (
          <p
            data-testid="aviso-de-desborde"
            className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-caption text-fg-subtle"
          >
            <span aria-hidden="true">{haciaLaIzquierda ? "←" : ""}</span>
            Esta tabla no cabe entera: se corre a los lados.
            <span aria-hidden="true">{haciaLaDerecha ? "→" : ""}</span>
          </p>
        ) : null}
      </div>
    )
  }
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
