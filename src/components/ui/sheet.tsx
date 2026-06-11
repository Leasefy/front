"use client"

import * as React from "react"
import {
  Sheet as DSSheet,
  SheetTrigger as DSSheetTrigger,
  SheetClose as DSSheetClose,
  SheetPortal as DSSheetPortal,
  SheetOverlay as DSSheetOverlay,
  SheetContent as DSSheetContent,
  type SheetContentProps as DSSheetContentProps,
  SheetTitle as DSSheetTitle,
  SheetDescription as DSSheetDescription,
} from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Sheet de @leasefy/ui que preserva la API local del mvp:
 * - Root con scroll-lock propio (body/html overflow hidden mientras open).
 * - SheetContent: `side` passthrough (el DS ya lo soporta),
 *   `hideCloseButton` → `hideClose`, overlay `z-[300] bg-black/60`,
 *   contrato de layout legacy (p-6 default, w-3/4 sm:max-w-sm en left/right,
 *   alto auto en top/bottom, display block) y animación legacy 500ms in/out
 *   en lugar del slide-in-only del DS. Todo overridable por className.
 * - Header/Footer mantienen las clases legacy (padding en el Content).
 */

// Custom Sheet Root that blocks body scroll when open
const Sheet = ({ children, ...props }: React.ComponentProps<typeof DSSheet>) => {
  React.useEffect(() => {
    if (props.open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    }
  }, [props.open]);

  return <DSSheet {...props}>{children}</DSSheet>;
}

const SheetTrigger = DSSheetTrigger

const SheetClose = DSSheetClose

const SheetPortal = DSSheetPortal

const sheetOverlayClasses =
  "z-[300] bg-black/60 touch-none overscroll-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-500 data-[state=open]:duration-500"

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DSSheetOverlay>,
  React.ComponentPropsWithoutRef<typeof DSSheetOverlay>
>(({ className, ...props }, ref) => (
  <DSSheetOverlay
    ref={ref}
    className={cn(sheetOverlayClasses, className)}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

type SheetSide = NonNullable<DSSheetContentProps["side"]>

// Geometría + animación legacy por lado. h-auto/max-h-none anulan las alturas
// fijas del DS en top/bottom (legacy = alto por contenido).
const legacySideClasses: Record<SheetSide, string> = {
  top: "h-auto max-h-none data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom:
    "h-auto max-h-none data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  left: "w-3/4 sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  right:
    "w-3/4 sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
}

interface SheetContentProps extends Omit<DSSheetContentProps, "hideClose"> {
  hideCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DSSheetContent>,
  SheetContentProps
>(({ side = "right", className, overlayClassName, children, hideCloseButton = false, ...props }, ref) => (
  <DSSheetContent
    ref={ref}
    side={side}
    hideClose={hideCloseButton}
    overlayClassName={cn(sheetOverlayClasses, overlayClassName)}
    onWheel={(e) => e.stopPropagation()}
    className={cn(
      // contrato de layout legacy: padding propio, display block (el DS pone
      // flex flex-col; los call sites que lo quieren lo pasan explícito)
      "z-[300] block p-6 overscroll-contain",
      // animación legacy 500ms in/out; animate-none apaga el slide-in del DS
      "animate-none transition-transform data-[state=closed]:duration-500 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
      legacySideClasses[side],
      className
    )}
    {...props}
  >
    {children}
  </DSSheetContent>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({
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
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = DSSheetTitle

const SheetDescription = DSSheetDescription

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
