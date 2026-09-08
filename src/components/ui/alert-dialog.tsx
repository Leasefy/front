"use client"

import * as React from "react"
import {
  AlertDialog as DSAlertDialog,
  AlertDialogTrigger as DSAlertDialogTrigger,
  AlertDialogPortal as DSAlertDialogPortal,
  AlertDialogOverlay as DSAlertDialogOverlay,
  AlertDialogContent as DSAlertDialogContent,
  type AlertDialogContentProps as DSAlertDialogContentProps,
  AlertDialogTitle as DSAlertDialogTitle,
  AlertDialogDescription as DSAlertDialogDescription,
  AlertDialogAction as DSAlertDialogAction,
  AlertDialogCancel as DSAlertDialogCancel,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER sobre el AlertDialog de @leasefy/cadence (Radix alert-dialog real:
 * role="alertdialog", foco atrapado, SIN outside-dismiss — nativo del DS).
 *
 * ── La misma anatomía que `Dialog` (Nico, 2026-09-07) ──────────────────────
 *
 * «Este modal no es igual al resto de modales que tenemos, y así como este hay
 * varios con ese título enorme». Era esto: el `Dialog` del producto tiene
 * cabecera fija con filete, título de 16px y pie fijo con filete (ver
 * `dialog.tsx` y DESIGN.md §17), y este adaptador seguía con el layout viejo
 * —`p-6 grid`, sin bandas— y el título del DS a `text-h2` (22px), tamaño de
 * encabezado de PÁGINA. Como los 21 call sites usan Header/Footer/Title de acá,
 * arreglarlo acá los arregla a todos.
 *
 *     ┌──────────────────────────────────────┐
 *     │  Título                              │  cabecera fija, filete abajo
 *     ├──────────────────────────────────────┤
 *     │  cuerpo (si lo hay; lo único que     │
 *     │  scrollea)                           │
 *     ├──────────────────────────────────────┤
 *     │                  Cancelar  Confirmar │  pie fijo, filete arriba
 *     └──────────────────────────────────────┘
 *
 * Igual que `DialogContent`, el Content REPARTE a sus hijos: `AlertDialogHeader`
 * arriba, `AlertDialogFooter` abajo y lo demás a un cuerpo con padding y scroll
 * propios. Los call sites no cambian. Lo que NO tiene, a propósito: la ✕ — de
 * un alert se sale por Cancelar/Confirmar (DESIGN.md, «La ✕: una sola»).
 */

const AlertDialog = DSAlertDialog

const AlertDialogTrigger = DSAlertDialogTrigger

const AlertDialogPortal = DSAlertDialogPortal

const alertOverlayClasses =
  "z-[300] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DSAlertDialogOverlay>,
  React.ComponentPropsWithoutRef<typeof DSAlertDialogOverlay>
>(({ className, ...props }, ref) => (
  <DSAlertDialogOverlay
    ref={ref}
    className={cn(alertOverlayClasses, className)}
    {...props}
  />
))
AlertDialogOverlay.displayName = "AlertDialogOverlay"

type BandaDeAlerta = "cabecera" | "pie"

/** En qué banda va un hijo directo del Content (mismo criterio que `dialog.tsx`). */
function bandaDe(hijo: React.ReactNode): BandaDeAlerta | null {
  if (!React.isValidElement(hijo)) return null
  const tipo = hijo.type as { bandaDeAlerta?: BandaDeAlerta }
  return tipo?.bandaDeAlerta ?? null
}

function repartirHijos(children: React.ReactNode) {
  let cabecera: React.ReactNode = null
  let pie: React.ReactNode = null
  const cuerpo: React.ReactNode[] = []
  React.Children.forEach(children, (hijo) => {
    if (hijo === null || hijo === undefined || typeof hijo === "boolean") return
    const banda = bandaDe(hijo)
    if (banda === "cabecera" && !cabecera) {
      cabecera = hijo
      return
    }
    if (banda === "pie" && !pie) {
      pie = hijo
      return
    }
    cuerpo.push(hijo)
  })
  return { cabecera, cuerpo, pie }
}

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof DSAlertDialogContent>,
  DSAlertDialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => {
  const { cabecera, cuerpo, pie } = repartirHijos(children)
  return (
    <DSAlertDialogContent
      ref={ref}
      overlayClassName={cn(alertOverlayClasses, overlayClassName)}
      className={cn(
        // Columna: cabecera / cuerpo con scroll / pie. El padding vive en cada
        // banda, por eso `p-0`; `overflow-hidden` recorta al radio del DS.
        "z-[300] flex flex-col w-[calc(100%-2rem)] max-w-lg max-h-[min(640px,90dvh)] overflow-hidden p-0",
        // animación legacy del mvp (in/out); animate-none apaga el scale-in del DS
        "animate-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {cabecera}
      {cuerpo.length > 0 && (
        <div
          className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto overscroll-contain p-6"
          data-lenis-prevent
        >
          {cuerpo}
        </div>
      )}
      {pie}
    </DSAlertDialogContent>
  )
})
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 border-b border-border bg-surface px-6 py-4",
      "flex flex-col gap-1 text-left",
      // El título del DS es text-h2 (22px). Acá manda 16px, por especificidad
      // de descendiente, igual que en DialogHeader (ver dialog.tsx).
      "[&_h2]:text-base [&_h2]:leading-6 [&_h2]:font-semibold [&_h2]:tracking-[-0.005em] [&_h2]:pr-0",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"
AlertDialogHeader.bandaDeAlerta = "cabecera" as const

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 border-t border-border bg-surface px-6 py-4",
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"
AlertDialogFooter.bandaDeAlerta = "pie" as const

const AlertDialogTitle = DSAlertDialogTitle

const AlertDialogDescription = DSAlertDialogDescription

// Estilado por el DS (buttonVariants). `tone="danger"` para destructivas.
const AlertDialogAction = DSAlertDialogAction

// Estilado por el DS (variant secondary). El pie ya separa los botones con
// `gap-2`, así que no hace falta el margen del stacking viejo.
const AlertDialogCancel = DSAlertDialogCancel

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
