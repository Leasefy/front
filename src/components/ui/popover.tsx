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
    // El mecanismo real para que la rueda funcione acá dentro (DESIGN.md §8).
    // El `onWheel + stopPropagation` de abajo no alcanza: Lenis escucha en
    // `window` con un listener nativo, y frenar el evento sintético de React no
    // lo evita. Se conserva por si algún otro handler intermedio lo aprovecha.
    data-lenis-prevent
    className={cn(
      // z-[400]: Dialog/Sheet viven en z-[300]; el z-50 del DS dejaría este
      // popover DETRÁS del overlay del modal que lo contiene. Igual que select.tsx.
      "z-[400]",
      "max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain",
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
