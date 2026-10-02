"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { motionClasses } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * NOTE (touch devices): Radix Tooltip is hover/focus-only and does NOT open
 * on tap — content placed here is unreachable on touch screens. Use tooltips
 * for redundant/supplementary hints only. If the information is essential,
 * prefer `Popover` (tap-to-open) or the `InfoHoverCard` composite in
 * `hover-card.tsx`, which falls back to a Popover on mobile automatically.
 */
const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // z-[400]: Dialog/Sheet viven en z-[300]; z-50 dejaría el tooltip DETRÁS
        // del overlay del modal que lo contiene. Igual que select.tsx.
        "z-[400] overflow-hidden rounded-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground",
        // Movimiento de Cadence: entra en 150ms desde su ancla (4px desde el
        // lado del disparador) y sale acelerando. El mismo que el Tooltip del DS.
        motionClasses.tooltip,
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
