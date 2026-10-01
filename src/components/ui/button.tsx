"use client"

import * as React from "react"
import { Button as DSButton, buttonVariants as dsButtonVariants } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

import { CargaDeMarca, ProveedorDeTonoDeCarga, type TonoDeCarga } from "./carga-de-marca"

/**
 * ADAPTER fino sobre el Button de @leasefy/cadence que preserva la API local del mvp:
 * - variant: default/white/destructive/outline/secondary/glass/ghost/link
 *   (default → primary del DS; white/glass viven ahora en el DS).
 * - size: default/sm/lg/icon (default → md del DS + h-10 por fidelidad).
 * - isLoading → el logo de Leasefy en carga (CargaDeMarca xs), pintado por este
 *   wrapper y no por el DS; hideArrow → apaga la flecha automática.
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
// [@media(pointer:coarse)] agranda los touch targets a >=44px SOLO en dispositivos
// táctiles — la apariencia en desktop (pointer fino) no cambia. lg ya es h-12 (48px).
const SIZE_FIDELITY: Partial<Record<ButtonSize, string>> = {
  default: "h-10 [@media(pointer:coarse)]:min-h-11",
  sm: "[@media(pointer:coarse)]:min-h-11",
  icon: "[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11",
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

// Tono del logo de carga según el fondo del botón (pedido de Nico, 30-09):
// sobre un fondo lleno va blanco; sobre uno claro, azul (o negro si es discreto).
// `white` es blanco también en oscuro, por eso no puede pasar a blanco.
const TONO_DE_CARGA: Record<ButtonVariant, TonoDeCarga> = {
  default: "sobre-color",
  destructive: "sobre-color",
  glass: "sobre-color",
  white: "sobre-blanco",
  outline: "azul",
  secondary: "azul",
  link: "azul",
  ghost: "negro",
}

// Mientras carga, el botón queda `disabled` y el DS le pondría el gris de
// deshabilitado: cargar no es estar deshabilitado, así que conserva su color
// (y el logo blanco se lee sobre el azul del primario).
const LOADING_KEEPS_COLOR: Record<ButtonVariant, string> = {
  default: "disabled:bg-primary disabled:text-primary-fg",
  destructive: "disabled:bg-danger disabled:text-white",
  white: "disabled:bg-white disabled:text-fg",
  glass: "disabled:bg-white/15 disabled:text-white disabled:border-white/25",
  outline: "disabled:bg-transparent disabled:text-fg disabled:border-border",
  secondary: "disabled:bg-surface disabled:text-fg disabled:border-border",
  ghost: "disabled:text-fg",
  link: "disabled:text-fg",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      hideArrow = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const resolvedVariant = variant ?? "default"
    const resolvedSize = size ?? "default"
    const tono = TONO_DE_CARGA[resolvedVariant]

    // La carga la pinta este wrapper y no el DS: el `loading` de cadence dibuja
    // su propio CircleNotch girando, y acá va el logo de Leasefy. Por eso al DS
    // le llega `loading={false}` y este wrapper repone lo que `loading` hacía:
    // deshabilitar, esconder la flecha y anunciar `aria-busy`.
    const carga = isLoading ? (
      <CargaDeMarca tamano="xs" tono={tono} aria-hidden etiqueta="Cargando" role={undefined} />
    ) : null

    // Con asChild el hijo único es el que se renderiza (Slot): la carga entra
    // DENTRO de él para no romper el Slot.
    let contenido: React.ReactNode = children
    if (carga && asChild && React.isValidElement<{ children?: React.ReactNode }>(children)) {
      contenido = React.cloneElement(children, undefined, carga, children.props.children)
    } else if (carga && !asChild) {
      contenido = (
        <>
          {carga}
          {children}
        </>
      )
    }

    return (
      <ProveedorDeTonoDeCarga tono={tono}>
        <DSButton
          ref={ref}
          asChild={asChild}
          variant={VARIANT_MAP[resolvedVariant]}
          size={SIZE_MAP[resolvedSize]}
          loading={false}
          disabled={asChild ? undefined : disabled || isLoading}
          aria-busy={isLoading || undefined}
          arrow={ARROW_VARIANTS.has(resolvedVariant) && !hideArrow && !isLoading}
          className={cn(
            // El Button legacy del mvp era `group`: se preserva para los call sites
            // que usan group-hover en sus children.
            "group",
            SIZE_FIDELITY[resolvedSize],
            isLoading && "pointer-events-none opacity-70",
            // Mientras carga, el DS lo deja `disabled` y le pintaría el fondo y
            // el texto grises de deshabilitado: la carga conserva el color del botón.
            isLoading && LOADING_KEEPS_COLOR[resolvedVariant],
            className
          )}
          {...props}
        >
          {contenido}
        </DSButton>
      </ProveedorDeTonoDeCarga>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
