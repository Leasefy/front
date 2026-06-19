"use client"

import * as React from "react"
import { Input as DSInput } from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Input de @leasefy/ui.
 * Fidelidad mvp (métricas de layout/UX): h-11 (tap target 44px), px-4 y
 * text-base→md:text-sm (16px en mobile evita el zoom de iOS Safari).
 * Skin del DS: hairline border, radio 8, focus azul (BRAND-CONTRACT §4).
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <DSInput
      ref={ref}
      className={cn("h-11 px-4 text-base md:text-sm", className)}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
