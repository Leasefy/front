"use client"

import * as React from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverContent as DSPopoverContent,
} from "@leasefy/ui"

/**
 * ADAPTER fino sobre el Popover de @leasefy/ui.
 *
 * Popover / PopoverTrigger / PopoverAnchor son re-exports directos (misma API
 * Radix). PopoverContent envuelve el del DS para preservar el comportamiento
 * legacy del mvp:
 *  - sideOffset default 4 (el DS usa 8).
 *  - onWheel stopPropagation: la rueda dentro del popover no scrollea la página.
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof DSPopoverContent>,
  React.ComponentPropsWithoutRef<typeof DSPopoverContent>
>(({ sideOffset = 4, onWheel, ...props }, ref) => (
  <DSPopoverContent
    ref={ref}
    sideOffset={sideOffset}
    onWheel={(e) => {
      e.stopPropagation()
      onWheel?.(e)
    }}
    {...props}
  />
))
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
