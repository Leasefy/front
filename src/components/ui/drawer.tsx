"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

/**
 * Hoja desde abajo con arrastre (vaul). Mismo dibujo que el cajón flotante de
 * Cadence (`sheet.tsx`): velo desenfocado y apenas oscurecido, esquinas de
 * 24 px, asa, filetes de pelo; en escritorio flota centrada, separada 12 px
 * del borde. Para un cajón lateral usa `Sheet`, no esto.
 */

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[300] bg-[rgba(20,19,15,0.18)] backdrop-blur-[6px] dark:bg-[rgba(0,0,0,0.55)]",
      className
    )}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[300] mt-24 flex h-auto max-h-[92dvh] flex-col overflow-hidden",
        "rounded-t-[24px] border border-b-0 border-border-faint bg-surface text-fg dark:border-ink-border",
        "shadow-[0_-12px_60px_-12px_rgba(20,19,15,0.28)] dark:shadow-[0_-12px_60px_-8px_rgba(0,0,0,0.8)]",
        "pb-[env(safe-area-inset-bottom)] overscroll-contain",
        "sm:inset-x-3 sm:bottom-3 sm:mx-auto sm:max-w-[640px] sm:rounded-[24px] sm:border-b",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[rgba(20,19,15,0.16)] dark:bg-[rgba(255,255,255,0.22)]"
      />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-none flex-col gap-0.5 border-b border-border-faint px-6 pb-4 pt-3 text-left dark:border-ink-border",
      className
    )}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

/** Lo único que scrollea. */
const DrawerBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-lenis-prevent=""
    className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5", className)}
    {...props}
  />
)
DrawerBody.displayName = "DrawerBody"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex flex-none flex-wrap items-center justify-end gap-2 border-t border-border-faint bg-surface px-6 py-4 dark:border-ink-border",
      className
    )}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-[18px] font-semibold leading-6 tracking-[-0.015em] text-fg",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-[14px] leading-5 text-fg-muted", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
