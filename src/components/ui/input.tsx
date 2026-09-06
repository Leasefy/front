"use client"

import * as React from "react"
import { Input as DSInput } from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Input de @leasefy/cadence.
 * Fidelidad mvp (métricas de layout/UX): h-11 (tap target 44px), px-4 y
 * text-base→md:text-sm (16px en mobile evita el zoom de iOS Safari).
 * Skin del DS: hairline border, radio 8, focus azul (BRAND-CONTRACT §4).
 *
 * `invalid` y `valid` son del DS y pintan el borde de error / de confirmación.
 * Antes el adapter tipaba sus props como las de un `<input>` pelado, así que
 * pasarlas no compilaba y cada formulario terminaba dibujando su propio borde
 * rojo a mano. Van declaradas acá para que el estado del campo lo pinte el DS.
 */
export interface InputProps extends React.ComponentProps<"input"> {
  /** Estado de error — borde y anillo de peligro del DS. */
  invalid?: boolean
  /** Estado verificado — borde verde del DS. */
  valid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
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
