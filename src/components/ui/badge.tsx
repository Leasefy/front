import * as React from "react"
import { Badge as DSBadge } from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Badge de @leasefy/ui que preserva la API local del mvp:
 * - variant: default/secondary/destructive/outline/success/warning/risk-a..d
 *   (default → primary del DS, secondary → neutral, destructive → danger).
 * - Los variants risk-* (scoring de inquilinos) no existen en el DS: se
 *   conservan sus clases exactas (hsl(var(--risk-x))) por encima del variant
 *   neutral del DS.
 * - size md del DS (h-6) ≈ el pill legacy (px-3 py-1 text-xs).
 */

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "risk-a"
  | "risk-b"
  | "risk-c"
  | "risk-d"

type DSBadgeProps = React.ComponentProps<typeof DSBadge>

const VARIANT_MAP: Record<BadgeVariant, NonNullable<DSBadgeProps["variant"]>> = {
  default: "primary",
  secondary: "neutral",
  destructive: "danger",
  outline: "outline",
  success: "success",
  warning: "warning",
  "risk-a": "neutral",
  "risk-b": "neutral",
  "risk-c": "neutral",
  "risk-d": "neutral",
}

// Variants de riesgo legacy — el DS no los tiene; se preservan sus clases.
const RISK_CLASSES: Partial<Record<BadgeVariant, string>> = {
  "risk-a": "bg-[hsl(var(--risk-a))] text-white shadow-sm shadow-[hsl(var(--risk-a))]/25",
  "risk-b": "bg-[hsl(var(--risk-b))] text-white shadow-sm shadow-[hsl(var(--risk-b))]/25",
  "risk-c": "bg-[hsl(var(--risk-c))] text-foreground shadow-sm shadow-[hsl(var(--risk-c))]/25",
  "risk-d": "bg-[hsl(var(--risk-d))] text-white shadow-sm shadow-[hsl(var(--risk-d))]/25",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | null
}

function Badge({ className, variant, ...props }: BadgeProps) {
  const resolved = variant ?? "default"
  return (
    <DSBadge
      variant={VARIANT_MAP[resolved]}
      size="md"
      className={cn(RISK_CLASSES[resolved], className)}
      {...props}
    />
  )
}

export { Badge }
