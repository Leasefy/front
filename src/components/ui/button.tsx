"use client"

import * as React from "react"
import { animate } from "framer-motion"
import {
  Button as DSButton,
  buttonVariants as dsButtonVariants,
  motionScale,
  motionSpring,
  usePrefersReducedMotion,
} from "@leasefy/cadence"

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
 * - 🔴 Nico, 23-10-2026: «animación al interactuar, en hover y al presionar, con
 *   framer, y NADA de drop shadows». Se arregla UNA vez aquí, para los ~750
 *   archivos que usan el botón:
 *     · al pasar el puntero sube 1 px (resorte ágil de Cadence) y al presionar
 *       se hunde al 97 % con el resorte de rebote leve (`motionSpring.bouncy`,
 *       `motionScale.press`); al soltar vuelve con ese rebote. Con movimiento
 *       reducido (`usePrefersReducedMotion`) no se mueve. El enlace (`link`) no
 *       se mueve, como en Cadence.
 *     · Se mueve con `animate()` de framer sobre el nodo, en los eventos del
 *       puntero —no con `whileHover`/`whileTap`—: así el HTML del servidor es el
 *       mismo de antes (sin `tabindex` ni `style` nuevos: `whileTap` le pone
 *       `tabindex="0"` a todo), sirve con `asChild` y los `onDrag*`/
 *       `onAnimation*` de quien lo usa siguen siendo los del DOM.
 *     · La presión por CSS de Cadence (`active:scale`) y la transición de
 *       `transform` se apagan aquí para que no peleen con el resorte.
 *     · Toda sombra de caída que llegue por `className` (`shadow-lg`,
 *       `hover:shadow-[0_12px…]`) se quita; el filo interior de Cadence
 *       (`inset`) se queda: no es una sombra, es el borde de la arena.
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


/** Una clase de sombra de caída (`shadow`, `shadow-lg`, `hover:shadow-[0_…]`, `drop-shadow-md`), no `shadow-none` ni `inset`. */
const esSombraDeCaida = (clase: string) =>
  /(?:^|:)!?(?:drop-)?shadow(?:-|$)/.test(clase) && !/(?:^|:)!?shadow-none$/.test(clase) && !clase.includes("inset")

/** Nico 23-10: los botones no llevan sombra de caída. Se quitan de la `className` que llega. */
export function sinSombraDeCaida(className?: string): string | undefined {
  if (!className) return className
  return className
    .split(/\s+/)
    .filter((clase) => clase && !esSombraDeCaida(clase))
    .join(" ")
}

/** Las posturas del botón (framer, resortes de Cadence). */
const QUIETO = { y: 0, scale: 1 }
const ENCIMA = { y: -1, scale: 1 }
const PRESIONADO = { y: 0, scale: motionScale.press }

/** Mueve el nodo sin romper nada si el entorno no anima (pruebas, navegadores viejos). */
function mover(nodo: Element | null, destino: typeof QUIETO, transicion: typeof motionSpring.snappy | typeof motionSpring.bouncy) {
  if (!nodo) return
  try {
    animate(nodo, destino, transicion)
  } catch {
    /* sin animación: el botón funciona igual */
  }
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
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      // `hideArrow` se saca de las props para que no llegue al DOM.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      hideArrow,
      children,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      ...props
    },
    ref
  ) => {
    const resolvedVariant = variant ?? "default"
    const resolvedSize = size ?? "default"
    const reducido = usePrefersReducedMotion()
    // El enlace no se mueve (Cadence: «sin presión ni relleno»).
    const seMueve = !reducido && resolvedVariant !== "link"

    const nodo = React.useRef<HTMLButtonElement | null>(null)
    const encima = React.useRef(false)
    const unirRef = React.useCallback(
      (el: HTMLButtonElement | null) => {
        nodo.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el
      },
      [ref]
    )

    return (
      <DSButton
        ref={unirRef}
        asChild={asChild}
        variant={VARIANT_MAP[resolvedVariant]}
        size={SIZE_MAP[resolvedSize]}
        loading={isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          // El Button legacy del mvp era `group`: se preserva para los call sites
          // que usan group-hover en sus children.
          "group",
          // La presión la hace el resorte de framer (abajo): fuera la de CSS y la
          // transición de `transform`, que pelearía cuadro a cuadro con él.
          "transition-[color,background-color,border-color,box-shadow,opacity] active:scale-100",
          SIZE_FIDELITY[resolvedSize],
          isLoading && "pointer-events-none opacity-70",
          sinSombraDeCaida(className)
        )}
        onPointerEnter={(e: React.PointerEvent<HTMLButtonElement>) => {
          onPointerEnter?.(e)
          if (!seMueve || e.pointerType !== "mouse") return
          encima.current = true
          mover(nodo.current, ENCIMA, motionSpring.snappy)
        }}
        onPointerLeave={(e: React.PointerEvent<HTMLButtonElement>) => {
          onPointerLeave?.(e)
          encima.current = false
          if (seMueve) mover(nodo.current, QUIETO, motionSpring.snappy)
        }}
        onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
          onPointerDown?.(e)
          if (seMueve) mover(nodo.current, PRESIONADO, motionSpring.bouncy)
        }}
        onPointerUp={(e: React.PointerEvent<HTMLButtonElement>) => {
          onPointerUp?.(e)
          if (seMueve) mover(nodo.current, encima.current ? ENCIMA : QUIETO, motionSpring.bouncy)
        }}
        onPointerCancel={(e: React.PointerEvent<HTMLButtonElement>) => {
          onPointerCancel?.(e)
          encima.current = false
          if (seMueve) mover(nodo.current, QUIETO, motionSpring.snappy)
        }}
        {...props}
      >
        {children}
      </DSButton>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
