"use client"

import * as React from "react"
import { Button as DSButton, buttonVariants as dsButtonVariants } from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Button de @leasefy/ui que preserva la API local del mvp:
 * - variant: default/white/destructive/outline/secondary/glass/ghost/link
 *   (default → primary del DS; white/glass viven ahora en el DS).
 * - size: default/sm/lg/icon (default → md del DS + h-10 por fidelidad).
 * - isLoading → loading, hideArrow → apaga la flecha automática.
 * - Flecha ArrowUpRight automática en default/white (prop `arrow` del DS).
 */

type ButtonVariant =
  | "default"
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
const SIZE_FIDELITY: Partial<Record<ButtonSize, string>> = {
  default: "h-10",
}

// La flecha automática del mvp aplica a estos variants (hideArrow la apaga).
const ARROW_VARIANTS = new Set<ButtonVariant>(["default", "white"])

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
    { className, variant, size, asChild = false, isLoading = false, hideArrow = false, children, ...props },
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
        arrow={ARROW_VARIANTS.has(resolvedVariant) && !hideArrow}
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
