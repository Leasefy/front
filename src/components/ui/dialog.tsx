"use client"

import * as React from "react"
import {
  Dialog as DSDialog,
  DialogTrigger as DSDialogTrigger,
  DialogPortal as DSDialogPortal,
  DialogClose as DSDialogClose,
  DialogOverlay as DSDialogOverlay,
  DialogContent as DSDialogContent,
  type DialogContentProps as DSDialogContentProps,
  DialogTitle as DSDialogTitle,
  DialogDescription as DSDialogDescription,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Dialog de @leasefy/cadence que preserva la API local del mvp:
 * - DialogContent: contrato de layout legacy (`p-6 grid gap-4 max-w-lg`,
 *   overridable vía className) + sizing mobile (`w-[calc(100%-2rem)]`,
 *   `max-h-[min(640px,90dvh)]`, `overflow-y-auto`), z-[300] sobre headers
 *   fijos, overlay `z-[300] bg-black/60`, onWheel stopPropagation y animación
 *   legacy (tailwindcss-animate in/out) en lugar del animate-scale-in del DS.
 * - Header/Footer mantienen las clases de layout legacy (el padding vive en
 *   el Content, no en los sub-parts como en el DS).
 */

// Scroll locking is handled by Radix (modal by default via react-remove-scroll),
// which the DS Dialog re-exports. The previous manual body-overflow effect only
// worked for controlled usage (keyed off props.open) and caused scrollbar
// layout shift — removed.
const Dialog = DSDialog

const DialogTrigger = DSDialogTrigger

const DialogPortal = DSDialogPortal

const DialogClose = DSDialogClose

// Overlay legacy del mvp: z sobre headers fijos + fade in/out simétrico.
// `data-[state=closed]:opacity-100` neutraliza el snap a opacity-0 del DS
// para que el fade-out de tailwindcss-animate sea visible.
const dialogOverlayClasses =
  "z-[300] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:opacity-100"

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DSDialogOverlay>,
  React.ComponentPropsWithoutRef<typeof DSDialogOverlay>
>(({ className, ...props }, ref) => (
  <DSDialogOverlay
    ref={ref}
    className={cn(dialogOverlayClasses, className)}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DSDialogContent>,
  DSDialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => (
  <DSDialogContent
    ref={ref}
    overlayClassName={cn(dialogOverlayClasses, overlayClassName)}
    onWheel={(e) => e.stopPropagation()}
    className={cn(
      // contrato de layout legacy — overridable por className del call site.
      // Sizing mobile: margen lateral de 1rem y alto acotado con scroll interno.
      "z-[300] grid w-[calc(100%-2rem)] max-w-lg max-h-[min(640px,90dvh)] overflow-y-auto gap-4 p-6 overscroll-contain",
      // animación legacy del mvp (in/out). `animate-none` apaga el
      // animate-scale-in base del DS; los modifiers data-[state] ganan.
      "animate-none duration-[var(--duration-normal)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
      className
    )}
    {...props}
  >
    {children}
  </DSDialogContent>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
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
DialogFooter.displayName = "DialogFooter"

const DialogTitle = DSDialogTitle

const DialogDescription = DSDialogDescription

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
