"use client"

import * as React from "react"
import { Button as DSButton, buttonVariants as dsButtonVariants } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Button de @leasefy/cadence que preserva la API local del mvp:
 * - variant: default/white/destructive/outline/secondary/glass/ghost/link
 *   (default → primary del DS; white/glass viven ahora en el DS).
 * - size: default/sm/lg/icon (default → md del DS + h-10 por fidelidad).
 * - isLoading → loading: el spinner del DS (CircleNotch), deshabilita y anuncia
 *   `aria-busy`. Dentro de un botón va el spinner, NUNCA el logo de Leasefy:
 *   el logo (`CargaDeMarca`) es sólo para cargas de pantalla completa y
 *   transiciones (Nico, 01-10).
 * - Cadence 2 (20-10-2026): SIN flecha automática. El botón dice lo que hace;
 *   la flechita ↗ en cada botón azul era de plantilla. `hideArrow` queda por
 *   compatibilidad y ya no hace nada.
 */

type ButtonVariant =
  | "default"
  | "ink"
  | "white"
  | "destructive"
  | "outline"
  | "secondary"
  | "glass"
  | "ghost"
  | "link"

type ButtonSize = "default" | "sm" | "lg" | "icon"

type DSButtonProps = React.ComponentProps<typeof DSButton>

const VARIANT_MAP: Record<ButtonVariant, NonNullable<DSButtonProps["variant"]>> = {
  default: "primary",
  ink: "ink",
  white: "white",
  destructive: "destructive",
  outline: "outline",
  secondary: "secondary",
  glass: "glass",
  ghost: "ghost",
  link: "link",
}

const SIZE_MAP: Record<ButtonSize, NonNullable<DSButtonProps["size"]>> = {
  default: "md",
  sm: "sm",
  lg: "lg",
  icon: "icon",
}

// El size default legacy del mvp era h-10 (el md del DS es h-9): se conserva la altura.
// [@media(pointer:coarse)] agranda los touch targets a >=44px SOLO en dispositivos
// táctiles — la apariencia en desktop (pointer fino) no cambia. lg ya es h-12 (48px).
const SIZE_FIDELITY: Partial<Record<ButtonSize, string>> = {
  default: "h-10 [@media(pointer:coarse)]:min-h-11",
  sm: "[@media(pointer:coarse)]:min-h-11",
  icon: "[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11",
}


export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  asChild?: boolean
  isLoading?: boolean
  hideArrow?: boolean
}

/**
 * Compatible con los call sites legacy (alert-dialog): `buttonVariants()` y
 * `buttonVariants({ variant: "outline" })` devuelven las clases del DS.
 */
function buttonVariants(options?: {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  className?: string
}) {
  const variant = options?.variant ?? "default"
  const size = options?.size ?? "default"
  return cn(
    dsButtonVariants({ variant: VARIANT_MAP[variant], size: SIZE_MAP[size] }),
    SIZE_FIDELITY[size],
    options?.className
  )
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    // `hideArrow` se saca de las props para que no llegue al DOM.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { className, variant, size, asChild = false, isLoading = false, hideArrow, children, ...props },
    ref
  ) => {
    const resolvedVariant = variant ?? "default"
    const resolvedSize = size ?? "default"

    return (
      <DSButton
        ref={ref}
        asChild={asChild}
        variant={VARIANT_MAP[resolvedVariant]}
        size={SIZE_MAP[resolvedSize]}
        loading={isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          // El Button legacy del mvp era `group`: se preserva para los call sites
          // que usan group-hover en sus children.
          "group",
          SIZE_FIDELITY[resolvedSize],
          isLoading && "pointer-events-none opacity-70",
          className
        )}
        {...props}
      >
        {children}
      </DSButton>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
