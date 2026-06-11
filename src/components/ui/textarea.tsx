"use client"

import * as React from "react"
import { Textarea as DSTextarea } from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Textarea de @leasefy/ui.
 * Fidelidad mvp: min-h-[60px], px-4 py-2, text-base→md:text-sm (16px mobile
 * anti-zoom iOS). El DS muestra contador "n / max" cuando recibe maxLength —
 * el mvp nunca lo mostró, así que se oculta ([&+span]:hidden apunta al span
 * hermano del textarea dentro del wrapper del DS) y py-2 anula su pb-6.
 * Skin del DS: hairline border, radio 8, focus azul (BRAND-CONTRACT §4).
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, maxLength, ...props }, ref) => (
  <DSTextarea
    ref={ref}
    maxLength={maxLength}
    className={cn(
      "min-h-[60px] px-4 py-2 text-base md:text-sm",
      maxLength !== undefined && "[&+span]:hidden",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export { Textarea }
