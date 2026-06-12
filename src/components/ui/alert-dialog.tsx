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
} from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el AlertDialog de @leasefy/ui (Radix alert-dialog real:
 * role="alertdialog", foco atrapado, SIN outside-dismiss — nativo del DS).
 * Preserva la API local del mvp:
 * - Content: contrato de layout legacy (`p-6 grid gap-4 max-w-lg`), z-[300],
 *   overlay `z-[300] bg-black/60` y animación legacy in/out.
 * - Mobile: gutter `w-[calc(100%-2rem)]` + `max-h-[min(640px,90dvh)]` con
 *   overflow-y-auto/overscroll-contain para contenido largo en viewports cortos.
 * - Action/Cancel = los del DS, ya estilados con buttonVariants
 *   (Action acepta `tone="primary" | "danger"`; Cancel = secondary).
 * - Header/Footer mantienen las clases legacy (padding en el Content).
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

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof DSAlertDialogContent>,
  DSAlertDialogContentProps
>(({ className, overlayClassName, ...props }, ref) => (
  <DSAlertDialogContent
    ref={ref}
    overlayClassName={cn(alertOverlayClasses, overlayClassName)}
    className={cn(
      // contrato de layout legacy — overridable por className del call site
      "z-[300] grid w-[calc(100%-2rem)] max-w-lg gap-4 p-6",
      // mobile: nunca exceder el viewport; scroll interno contenido
      "max-h-[min(640px,90dvh)] overflow-y-auto overscroll-contain",
      // animación legacy del mvp (in/out); animate-none apaga el scale-in del DS
      "animate-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
      className
    )}
    {...props}
  />
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = DSAlertDialogTitle

const AlertDialogDescription = DSAlertDialogDescription

// Estilado por el DS (buttonVariants). `tone="danger"` para destructivas.
const AlertDialogAction = DSAlertDialogAction

// Estilado por el DS (variant secondary). mt-2 conserva el stacking mobile
// del footer legacy (flex-col-reverse).
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof DSAlertDialogCancel>,
  React.ComponentPropsWithoutRef<typeof DSAlertDialogCancel>
>(({ className, ...props }, ref) => (
  <DSAlertDialogCancel
    ref={ref}
    className={cn("mt-2 sm:mt-0", className)}
    {...props}
  />
))
AlertDialogCancel.displayName = "AlertDialogCancel"

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
