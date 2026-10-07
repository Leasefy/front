"use client"

import * as React from "react"
import {
  SelectContent as DSSelectContent,
  SelectItem as DSSelectItem,
  SelectTrigger as DSSelectTrigger,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"
import { ariaDiceInvalido } from "./campo-invalido"

/**
 * ADAPTER fino sobre el Select de @leasefy/cadence (misma API que Radix).
 * - SelectTrigger: fidelidad mvp h-11 / px-4 / text-sm (alineado con Input).
 *   Refinamiento focus-visible del producto: el ring eléctrico solo aparece
 *   con navegación por teclado (focus-visible); el focus por mouse no pinta
 *   ring (el estado abierto conserva su ring vía data-[state=open] del DS).
 * - SelectContent: el mvp usa z-[400] porque Dialog/Sheet viven en z-[300];
 *   el z-50 del DS dejaría el dropdown DETRÁS del overlay del modal.
 *   Se conserva también max-h-96 (el DS recorta a max-h-72).
 * - SelectItem: touch target del producto — [@media(pointer:coarse)]:py-2.5
 *   (+h-auto porque el DS fija h-8) para ~44px en dispositivos táctiles.
 * - 🔴 SelectTrigger con `aria-invalid` pinta el borde de error, como el Input
 *   (ARREGLOS-4, 03-10-2026): el DS no tiene estado de error en el Select, así
 *   que el adapter pone `data-invalid` y el mismo borde/anillo de peligro.
 * El resto se re-exporta tal cual del paquete.
 */

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@leasefy/cadence"

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof DSSelectTrigger>,
  React.ComponentPropsWithoutRef<typeof DSSelectTrigger>
>(({ className, ...props }, ref) => (
  <DSSelectTrigger
    ref={ref}
    data-invalid={ariaDiceInvalido(props["aria-invalid"]) || undefined}
    className={cn(
      "h-11 px-4 text-sm",
      // focus → focus-visible (a11y producto): neutraliza el focus: del DS
      // y reaplica el ring de marca solo en focus-visible.
      "focus:border-border focus:ring-0",
      "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
      // error: el mismo borde y anillo de peligro que el Input del DS, también
      // con foco y abierto.
      "data-[invalid]:border-danger data-[invalid]:hover:border-danger data-[invalid]:focus:border-danger",
      "data-[invalid]:focus-visible:border-danger data-[invalid]:focus-visible:ring-0 data-[invalid]:focus-visible:shadow-[0_0_0_3px_rgba(192,57,43,0.12)]",
      "data-[invalid]:data-[state=open]:border-danger",
      className
    )}
    {...props}
  />
))
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<
  React.ElementRef<typeof DSSelectContent>,
  React.ComponentPropsWithoutRef<typeof DSSelectContent>
>(({ className, ...props }, ref) => (
  <DSSelectContent
    ref={ref}
    // `data-lenis-prevent`: sin esto el dropdown NO se puede scrollear.
    // Con `max-h-96` la lista recorta, pero Lenis (smooth scroll global)
    // secuestra la rueda y el contenido queda congelado — el modo de fallo
    // que describe DESIGN.md §8. Lenis sube por el DOM desde el target del
    // evento buscando este atributo, así que ponerlo en el contenedor del
    // portal cubre toda la lista.
    // Va en el ADAPTER a propósito: el bug afecta a TODOS los selects de la
    // app con más de ~10 opciones, no a una pantalla puntual.
    data-lenis-prevent
    className={cn("z-[400] max-h-96 overscroll-contain", className)}
    {...props}
  />
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  React.ElementRef<typeof DSSelectItem>,
  React.ComponentPropsWithoutRef<typeof DSSelectItem>
>(({ className, ...props }, ref) => (
  <DSSelectItem
    ref={ref}
    className={cn(
      "[@media(pointer:coarse)]:h-auto [@media(pointer:coarse)]:py-2.5",
      className
    )}
    {...props}
  />
))
SelectItem.displayName = "SelectItem"

export { SelectTrigger, SelectContent, SelectItem }
