"use client"

import * as React from "react"
import { X } from "@phosphor-icons/react"
import {
  Sheet as DSSheet,
  SheetTrigger as DSSheetTrigger,
  SheetClose as DSSheetClose,
  SheetPortal as DSSheetPortal,
  SheetOverlay as DSSheetOverlay,
  SheetContent as DSSheetContent,
  type SheetContentProps as DSSheetContentProps,
  SheetHeader as DSSheetHeader,
  type SheetHeaderProps as DSSheetHeaderProps,
  SheetTitle as DSSheetTitle,
  SheetDescription as DSSheetDescription,
  SheetNav as DSSheetNav,
  type SheetNavProps,
  SheetBody as DSSheetBody,
  SheetFooter as DSSheetFooter,
  type SheetFooterProps,
  SheetSection as DSSheetSection,
  type SheetSectionProps,
  sheetCloseClassName,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"
import { ASPA_DE_CIERRE } from "@/components/ui/aspa-de-cierre"

/**
 * ADAPTER fino sobre el Sheet de @leasefy/cadence.
 *
 * El cajón es el FLOTANTE de Cadence (02-10-2026, Nico: «que se separen de
 * las esquinas, que se sientan hermosos»): 12 px de los bordes (16 desde
 * `lg`), las cuatro esquinas en 24 px, sombra amplia, velo desenfocado, y en
 * el celular una hoja desde abajo con asa. El contrato viejo —`p-6`,
 * `w-3/4 sm:max-w-sm`, `display: block`, animación de 500 ms— se fue.
 *
 * Lo que este adaptador agrega encima de Cadence:
 * - capa `z-[300]` (la de los modales, ver DESIGN.md §17);
 * - la ✕ del producto (chip gris, `ASPA_DE_CIERRE`) en lugar de la de Cadence;
 *   `hideCloseButton` la apaga;
 * - el REPARTO de hijos, igual que `DialogContent`: cabecera y navegación
 *   arriba y fijas, pie abajo y fijo, y todo lo demás a un `SheetBody` con
 *   scroll. Así un cajón escrito «a la antigua» —una cabecera y contenido
 *   suelto— no queda pegado a los bordes ni pierde el título al bajar.
 *
 * El reparto se apaga (los hijos van tal cual a la columna) cuando el call
 * site ya arma su layout: si trae un `SheetBody` (o `CajonCuerpo`) en algún
 * lugar de su JSX, si pide `layout="manual"`, o —compatibilidad con los
 * cajones viejos que se armaban solos— si pasa `p-0`/`!p-0` en `className`.
 */

const Sheet = DSSheet
const SheetTrigger = DSSheetTrigger
const SheetClose = DSSheetClose
const SheetPortal = DSSheetPortal

/** Banda de un cajón. Mismos nombres que `bandaDeModal` de dialog.tsx. */
type BandaDeCajon = "cabecera" | "navegacion" | "cuerpo" | "pie"

type ConBanda = { bandaDeModal?: string }

function bandaDe(hijo: React.ReactNode): BandaDeCajon | null {
  if (!React.isValidElement(hijo)) return null
  if (typeof hijo.type === "string") return null
  const banda = (hijo.type as ConBanda).bandaDeModal
  return banda === "cabecera" || banda === "navegacion" || banda === "cuerpo" || banda === "pie"
    ? banda
    : null
}

/** ¿Hay un cuerpo declarado en ALGÚN lugar del JSX (p. ej. dentro de un `<form className="contents">`)? */
function tieneCuerpo(nodo: React.ReactNode): boolean {
  let hay = false
  React.Children.forEach(nodo, (hijo) => {
    if (hay || !React.isValidElement(hijo)) return
    if (bandaDe(hijo) === "cuerpo") {
      hay = true
      return
    }
    const props = hijo.props as { children?: React.ReactNode }
    if (props.children != null) hay = tieneCuerpo(props.children)
  })
  return hay
}

/** Aplana los fragmentos de primer nivel conservando llaves estables. */
function aplanar(nodo: React.ReactNode, prefijo = ""): React.ReactNode[] {
  const salida: React.ReactNode[] = []
  React.Children.toArray(nodo).forEach((hijo) => {
    if (React.isValidElement(hijo) && hijo.type === React.Fragment) {
      const props = hijo.props as { children?: React.ReactNode }
      salida.push(...aplanar(props.children, `${prefijo}${String(hijo.key)}/`))
    } else if (React.isValidElement(hijo) && prefijo) {
      salida.push(React.cloneElement(hijo, { key: `${prefijo}${String(hijo.key)}` }))
    } else {
      salida.push(hijo)
    }
  })
  return salida
}

/**
 * La ✕ del cajón termina en el padding (24 px), no a 16 px como la deja
 * Cadence; la cabecera le reserva 24 + 36 (la ✕) + 12 de aire = 72 px.
 */
const ASPA_EN_EL_PADDING = "right-6"
const HUECO_DE_LA_ASPA = "group-data-[close=true]/sheet:pr-[72px]"

const PADDING_CERO = /(^|\s)!?p-0(\s|$)/
const VELO_TRANSPARENTE = /(^|\s)bg-transparent(\s|$)/

function repartir(children: React.ReactNode, className: string | undefined, layout: "auto" | "manual") {
  if (layout === "manual" || PADDING_CERO.test(className ?? "") || tieneCuerpo(children)) return children

  const arriba: React.ReactNode[] = []
  const medio: React.ReactNode[] = []
  const abajo: React.ReactNode[] = []
  for (const hijo of aplanar(children)) {
    const banda = bandaDe(hijo)
    if (banda === "cabecera" || banda === "navegacion") arriba.push(hijo)
    else if (banda === "pie") abajo.push(hijo)
    else medio.push(hijo)
  }
  return (
    <>
      {arriba}
      {medio.length > 0 ? <SheetBody>{medio}</SheetBody> : null}
      {abajo}
    </>
  )
}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DSSheetOverlay>,
  React.ComponentPropsWithoutRef<typeof DSSheetOverlay>
>(({ className, ...props }, ref) => (
  <DSSheetOverlay ref={ref} className={cn("z-[300]", className)} {...props} />
))
SheetOverlay.displayName = "SheetOverlay"

interface SheetContentProps extends Omit<DSSheetContentProps, "hideClose"> {
  /** Apaga la ✕. Sólo para un cajón que no se debe abandonar a medias. */
  hideCloseButton?: boolean
  /**
   * Nombre accesible de la ✕. Default «Cerrar»; si hay dos cajones a la vista
   * (un sub-cajón junto a otro), el de adentro dice qué cierra: «Cerrar el
   * documento». Siempre empieza por «Cerrar» (ver `aspa-de-cierre.ts`).
   */
  closeLabel?: string
  /**
   * `auto` (default) reparte los hijos en bandas si el call site no trae su
   * propio `SheetBody`; `manual` los deja tal cual en la columna.
   */
  layout?: "auto" | "manual"
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DSSheetContent>,
  SheetContentProps
>(
  (
    {
      side = "right",
      className,
      overlayClassName,
      children,
      hideCloseButton = false,
      closeLabel = "Cerrar",
      layout = "auto",
      ...props
    },
    ref
  ) => (
    // Lenis escucha la rueda en `window`, así que el scroll-lock de Radix no
    // lo frena: lo decide `SmoothScroll` mirando `data-state="open"`.
    <DSSheetContent
      ref={ref}
      side={side}
      // La ✕ de Cadence no se pinta: va la del producto, la misma de los modales.
      hideClose
      // …pero la cabecera tiene que dejarle sitio igual: `data-close` es lo que
      // mira `SheetHeader` para reservar el hueco.
      data-close={hideCloseButton ? "false" : "true"}
      overlayClassName={cn(
        "z-[300]",
        // Un velo pedido transparente (sub-cajón junto a otro) tampoco
        // desenfoca ni oscurece en el tema oscuro: lo de al lado tiene que
        // seguir legible.
        VELO_TRANSPARENTE.test(overlayClassName ?? "") && "backdrop-blur-none dark:bg-transparent",
        overlayClassName
      )}
      onWheel={(e) => e.stopPropagation()}
      className={cn("z-[300]", className)}
      {...props}
    >
      {repartir(children, className, layout)}
      {/* Después de los hijos y en `z-20`: queda por encima de las cabeceras
          `sticky` con fondo opaco que traen algunos cajones. */}
      {!hideCloseButton && (
        <DSSheetClose
          aria-label={closeLabel}
          data-testid="dialog-close"
          // `right-6` pisa el `right-4` de Cadence: el borde derecho de la ✕ cae
          // EXACTAMENTE en el padding del cajón (24 px), donde termina el
          // contenido (Nico, 03-10-2026; DESIGN.md §Drawers, «Contenido
          // alineado al padding»). Los modales no pasan por acá.
          className={cn(ASPA_DE_CIERRE, sheetCloseClassName, ASPA_EN_EL_PADDING)}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </DSSheetClose>
      )}
    </DSSheetContent>
  )
)
SheetContent.displayName = "SheetContent"

interface SheetHeaderProps extends DSSheetHeaderProps {
  /**
   * Existe sólo para que `ResponsiveDialogHeader` —que es el MISMO call site
   * en móvil y en escritorio— pueda pedir `hideClose` sin que el prop termine
   * escupido en el `<div>`. Acá no hace nada: en un Sheet la ✕ la pone el
   * `SheetContent`; para apagarla se usa `hideCloseButton` en el Content.
   */
  hideClose?: boolean
}

const SheetHeader = Object.assign(
  React.forwardRef<HTMLDivElement, SheetHeaderProps>(function SheetHeader(
    { hideClose: _hideClose, className, ...props },
    ref
  ) {
    // El hueco de la ✕ crece con ella: Cadence reserva `pr-16` (right-4 + la
    // ✕ + aire); con la ✕ en el padding son 72 px, y el título largo sigue a
    // 12 px de la ✕ sin meterse debajo.
    return <DSSheetHeader ref={ref} className={cn(HUECO_DE_LA_ASPA, className)} {...props} />
  }),
  { bandaDeModal: "cabecera" as const, displayName: "SheetHeader" }
)

/** «‹ Anterior · 1 de 9 del tablero · Siguiente ›», con su filete. */
const SheetNav = Object.assign(
  React.forwardRef<HTMLElement, SheetNavProps>(function SheetNav(props, ref) {
    return <DSSheetNav ref={ref} {...props} />
  }),
  { bandaDeModal: "navegacion" as const, displayName: "SheetNav" }
)

/** El cuerpo: lo único que scrollea (`data-lenis-prevent` + `overscroll-behavior: contain`). */
const SheetBody = Object.assign(
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function SheetBody(props, ref) {
    return <DSSheetBody ref={ref} {...props} />
  }),
  { bandaDeModal: "cuerpo" as const, displayName: "SheetBody" }
)

/** Pie fijo: `start` a la izquierda (rechazar, volver), los hijos a la derecha. */
const SheetFooter = Object.assign(
  React.forwardRef<HTMLDivElement, SheetFooterProps>(function SheetFooter(props, ref) {
    return <DSSheetFooter ref={ref} {...props} />
  }),
  { bandaDeModal: "pie" as const, displayName: "SheetFooter" }
)

/** Tarjeta del cuerpo: borde suave, fondo apenas distinto. */
const SheetSection = DSSheetSection

/*
 * ── Contenido alineado al padding (Nico, 03-10-2026: «no respeta pegando bien
 * el contenido a los paddings») ─────────────────────────────────────────────
 *
 * El cajón tiene UN padding lateral, el mismo en `SheetHeader`, `SheetBody` y
 * `SheetFooter` (24 px). El texto del cuerpo arranca donde arranca el título y
 * termina en ese padding. Estas piezas son la única forma de salirse de él
 * (DESIGN.md §Drawers, «Contenido alineado al padding»).
 */

/** El padding lateral del cajón. Para las filas de una lista que ya va a sangre (cuerpo `p-0`). */
const RELLENO_DEL_CAJON = "px-6"

/**
 * Una fila de la cabecera DEBAJO del título (buscador, pestañas) llega hasta el
 * padding derecho: la cabecera reserva a la derecha el hueco de la ✕ en toda
 * su altura (72 px), pero la ✕ sólo ocupa la línea del título. 72 − 24 = 48 px
 * (`-mr-12`). Sólo en una cabecera sin `actions`.
 */
const FILA_ANCHA_DE_LA_CABECERA = "group-data-[close=true]/sheet:-mr-12"

/**
 * Una tabla (o una lista con cabecera) A SANGRE dentro de `SheetBody`: la banda
 * de la cabecera, el filete y el hover de las filas tocan los bordes del cajón,
 * y la primera y la última celda de cada fila llevan exactamente el padding del
 * cajón. Así el primer texto arranca en la línea del título y la última acción
 * termina en el padding derecho. Las celdas del medio conservan el suyo.
 *
 * Va sin marco: una tabla envuelta en `rounded border` adentro del cajón es la
 * «caja metida» que se lee como otra tarjeta y corre el texto 16 px.
 */
const SheetTable = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SheetTable({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-sheet-table=""
        className={cn(
          "-mx-6",
          "[&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-6",
          // El aviso «esta tabla no cabe entera» también arranca en la línea del título.
          "[&_[data-testid=aviso-de-desborde]]:px-6",
          className
        )}
        {...props}
      />
    )
  }
)

const SheetTitle = DSSheetTitle

const SheetDescription = DSSheetDescription

export type { SheetContentProps, SheetHeaderProps, SheetNavProps, SheetFooterProps, SheetSectionProps, BandaDeCajon }

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetNav,
  SheetBody,
  SheetFooter,
  SheetSection,
  SheetTable,
  SheetTitle,
  SheetDescription,
  RELLENO_DEL_CAJON,
  FILA_ANCHA_DE_LA_CABECERA,
}
