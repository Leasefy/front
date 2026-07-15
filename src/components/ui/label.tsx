"use client"

import * as React from "react"
import { Label as DSLabel } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Label de @leasefy/cadence (API superset: añade `required`).
 * Fidelidad mvp para cero cambio visible en ~50 call sites:
 * - text-sm leading-none (el DS usa text-caption 12px — encogería todo form)
 * - inline + text-inherit + select-auto (el mvp heredaba display/color y
 *   permitía selección; el DS fija inline-flex/text-fg/select-none)
 * - peer-disabled:opacity-70 (DS usa 50)
 */
const Label = React.forwardRef<
  React.ElementRef<typeof DSLabel>,
  React.ComponentPropsWithoutRef<typeof DSLabel>
>(({ className, ...props }, ref) => (
  <DSLabel
    ref={ref}
    className={cn(
      "inline text-inherit select-auto text-sm leading-none peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
