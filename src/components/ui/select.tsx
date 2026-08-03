"use client"

import * as React from "react"
import {
  SelectContent as DSSelectContent,
  SelectItem as DSSelectItem,
  SelectTrigger as DSSelectTrigger,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

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
    className={cn(
      "h-11 px-4 text-sm",
      // focus → focus-visible (a11y producto): neutraliza el focus: del DS
      // y reaplica el ring de marca solo en focus-visible.
      "focus:border-border focus:ring-0",
      "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
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
    className={cn("z-[400] max-h-96", className)}
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
