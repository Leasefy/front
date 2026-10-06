"use client"

import * as React from "react"
import {
  AlertDialog as DSAlertDialog,
  AlertDialogTrigger as DSAlertDialogTrigger,
  AlertDialogPortal as DSAlertDialogPortal,
  AlertDialogOverlay as DSAlertDialogOverlay,
  AlertDialogContent as DSAlertDialogContent,
  type AlertDialogContentProps as DSAlertDialogContentProps,
  AlertDialogHeader as DSAlertDialogHeader,
  type AlertDialogHeaderProps as DSAlertDialogHeaderProps,
  AlertDialogBody as DSAlertDialogBody,
  AlertDialogSection as DSAlertDialogSection,
  AlertDialogFooter as DSAlertDialogFooter,
  AlertDialogTitle as DSAlertDialogTitle,
  AlertDialogDescription as DSAlertDialogDescription,
  AlertDialogAction as DSAlertDialogAction,
  AlertDialogCancel as DSAlertDialogCancel,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER sobre el AlertDialog de @leasefy/cadence (Radix alert-dialog real:
 * role="alertdialog", foco en Cancelar al abrir, Esc cancela, SIN cerrar con
 * un clic afuera, SIN ✕ — de un alert se sale por Cancelar o por la acción).
 *
 * La misma anatomía que `Dialog` (DESIGN.md §17): cabecera con medallón,
 * cuerpo con scroll, pie con fondo suave. La clase de confirmación va en el
 * Content:
 *
 * ```tsx
 * <AlertDialogContent variant="destructive">   // medallón rojo + botón rojo sobrio
 * <AlertDialogContent variant="confirm">       // cobalto
 * <AlertDialogContent variant="warning">       // ámbar: sigue, pero con riesgo
 * ```
 *
 * `AlertDialogAction` toma el color de la variante solo (rojo en
 * `destructive`). Para una pregunta rápida desde un manejador, sin armar nada,
 * está `confirmar()` (`components/ui/confirmar.tsx`).
 *
 * Igual que `DialogContent`, el Content REPARTE a sus hijos directos:
 * `AlertDialogHeader` arriba, `AlertDialogFooter` abajo y lo demás a un cuerpo
 * con scroll. Los call sites no cambian.
 */

const AlertDialog = DSAlertDialog

const AlertDialogTrigger = DSAlertDialogTrigger

const AlertDialogPortal = DSAlertDialogPortal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DSAlertDialogOverlay>,
  React.ComponentPropsWithoutRef<typeof DSAlertDialogOverlay>
>(({ className, ...props }, ref) => (
  <DSAlertDialogOverlay ref={ref} className={cn("z-[300]", className)} {...props} />
))
AlertDialogOverlay.displayName = "AlertDialogOverlay"

type BandaDeAlerta = "cabecera" | "cuerpo" | "pie"

/** En qué banda va un hijo directo del Content (mismo criterio que `dialog.tsx`). */
function bandaDe(hijo: React.ReactNode): BandaDeAlerta | null {
  if (!React.isValidElement(hijo)) return null
  const tipo = hijo.type as { bandaDeAlerta?: BandaDeAlerta }
  return tipo?.bandaDeAlerta ?? null
}

function repartirHijos(children: React.ReactNode) {
  let cabecera: React.ReactNode = null
  let pie: React.ReactNode = null
  let cuerpoPropio = false
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
    if (banda === "cuerpo") cuerpoPropio = true
    cuerpo.push(hijo)
  })
  return { cabecera, cuerpo, pie, cuerpoPropio }
}

export type AlertDialogContentProps = DSAlertDialogContentProps

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof DSAlertDialogContent>,
  AlertDialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => {
  const { cabecera, cuerpo, pie, cuerpoPropio } = repartirHijos(children)
  return (
    <DSAlertDialogContent
      ref={ref}
      overlayClassName={cn("z-[300]", overlayClassName)}
      onWheel={(e) => e.stopPropagation()}
      className={cn("z-[300]", className)}
      {...props}
    >
      {cabecera}
      {cuerpoPropio ? (
        cuerpo
      ) : cuerpo.length > 0 ? (
        <DSAlertDialogBody
          className={cn("grid grid-cols-[minmax(0,1fr)] content-start gap-4", !cabecera && "pt-6 sm:pt-7")}
        >
          {cuerpo}
        </DSAlertDialogBody>
      ) : null}
      {pie}
    </DSAlertDialogContent>
  )
})
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = (props: DSAlertDialogHeaderProps) => <DSAlertDialogHeader {...props} />
AlertDialogHeader.displayName = "AlertDialogHeader"
AlertDialogHeader.bandaDeAlerta = "cabecera" as const

const AlertDialogBody = (props: React.ComponentPropsWithoutRef<typeof DSAlertDialogBody>) => (
  <DSAlertDialogBody {...props} />
)
AlertDialogBody.displayName = "AlertDialogBody"
AlertDialogBody.bandaDeAlerta = "cuerpo" as const

const AlertDialogFooter = (props: React.HTMLAttributes<HTMLDivElement>) => <DSAlertDialogFooter {...props} />
AlertDialogFooter.displayName = "AlertDialogFooter"
AlertDialogFooter.bandaDeAlerta = "pie" as const

/** Bloque con borde fino (p. ej. la lista de lo que se pierde). */
const AlertDialogSection = DSAlertDialogSection

const AlertDialogTitle = DSAlertDialogTitle

const AlertDialogDescription = DSAlertDialogDescription

/**
 * Estilado por el DS. Toma el color de la variante del Content (rojo sobrio en
 * `destructive`); `tone="danger"` lo fuerza. `loading` pone el spinner y lo
 * deshabilita sin apagarle el color.
 */
const AlertDialogAction = DSAlertDialogAction

/** Blanco con borde fino; recibe el foco al abrir (lo seguro). */
const AlertDialogCancel = DSAlertDialogCancel

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogSection,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
