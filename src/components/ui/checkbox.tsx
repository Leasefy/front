"use client"

import * as React from "react"
import { Checkbox as DSCheckbox, type CheckboxProps } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Checkbox de @leasefy/cadence (API superset: mismo
 * passthrough de Radix + prop `indeterminate`; `checked="indeterminate"` de los
 * call sites resuelve igual en el DS).
 * T-0173: `hit-area-44` agranda el área táctil a 44 px sólo en punteros gruesos;
 * la casilla de 20×20 no cambia.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof DSCheckbox>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <DSCheckbox
    ref={ref}
    className={cn("relative hit-area-44", className)}
    {...props}
  />
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
export type { CheckboxProps }
