"use client"

import * as React from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverContent as DSPopoverContent,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Popover de @leasefy/cadence.
 *
 * Popover / PopoverTrigger / PopoverAnchor son re-exports directos (misma API
 * Radix). PopoverContent envuelve el del DS para preservar el comportamiento
 * legacy del mvp:
 *  - sideOffset default 4 (el DS usa 8).
 *  - onWheel stopPropagation: la rueda dentro del popover no scrollea la página.
 *  - Guardas de overflow móvil: no excede el viewport horizontal ni la altura
 *    disponible reportada por Radix; el contenido scrollea internamente.
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof DSPopoverContent>,
  React.ComponentPropsWithoutRef<typeof DSPopoverContent>
>(({ sideOffset = 4, onWheel, className, ...props }, ref) => (
  <DSPopoverContent
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto",
      className
    )}
    onWheel={(e) => {
      e.stopPropagation()
      onWheel?.(e)
    }}
    {...props}
  />
))
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
