"use client"

import * as React from "react"
import { Switch as DSSwitch } from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Switch de @leasefy/ui (API y métricas idénticas:
 * track 36×20, thumb 16, translate-x-4). Única fidelidad: el thumb del mvp
 * era bg-background (oscuro en dark mode); el DS lo fija bg-white. Se
 * restaura vía selector descendiente para que dark mode siga igual
 * (en light ambos son blancos — sin cambio visible).
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof DSSwitch>,
  React.ComponentPropsWithoutRef<typeof DSSwitch>
>(({ className, ...props }, ref) => (
  <DSSwitch
    ref={ref}
    className={cn("[&>span]:bg-background", className)}
    {...props}
  />
))
Switch.displayName = "Switch"

export { Switch }
