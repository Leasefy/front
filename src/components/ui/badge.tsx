import * as React from "react"
import { Badge as DSBadge } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Badge de @leasefy/cadence que preserva la API local del mvp:
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

/**
 * 🔴 19-09-2026 · EL `neutral` DEL DS NO SE ADAPTA A OSCURO.
 *
 * Visto en el navegador, en tema oscuro, en tres pantallas distintas el mismo
 * día: los oficios de un proveedor, el «Inactivo» de su fila y los ámbitos de
 * una cláusula propia salían como pastillas CASI BLANCAS sobre el fondo negro
 * —más brillantes que el nombre del proveedor o el título de la cláusula, que
 * son el dato por el que uno busca—. La jerarquía de la pantalla quedaba al
 * revés: gritaba el atributo y susurraba el sujeto.
 *
 * La causa no está en ninguna de esas pantallas. El `Badge` del DS define su
 * variante `neutral` con colores HARDCODEADOS —`bg-[#F1EFEB] text-[#4D4A45]`—
 * en vez de tokens, así que en oscuro pinta igual que en claro. El propio DS
 * ya arregló este mismo patrón en otros componentes (`bg-[#F1EFEB]
 * dark:bg-surface-muted`); al Badge nunca se lo aplicaron.
 *
 * Se corrige acá, en el shim, que es exactamente lo que la casa ya hizo con
 * el tinte hardcodeado del `THead` (ver `table.tsx`): en claro no cambia nada
 * —el #F1EFEB sobre blanco es discreto— y en oscuro pasa a los tokens
 * adaptativos. Un arreglo, 286 llamadas.
 */
const NEUTRAL_EN_OSCURO = "dark:bg-surface-muted dark:text-fg-muted"

function Badge({ className, variant, ...props }: BadgeProps) {
  const resolved = variant ?? "default"
  return (
    <DSBadge
      variant={VARIANT_MAP[resolved]}
      size="md"
      className={cn(
        VARIANT_MAP[resolved] === "neutral" && NEUTRAL_EN_OSCURO,
        RISK_CLASSES[resolved],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
