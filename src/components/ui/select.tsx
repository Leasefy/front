"use client"

import * as React from "react"
import {
  SelectContent as DSSelectContent,
  SelectTrigger as DSSelectTrigger,
} from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el Select de @leasefy/ui (misma API que Radix).
 * - SelectTrigger: fidelidad mvp h-11 / px-4 / text-sm (alineado con Input).
 * - SelectContent: el mvp usa z-[400] porque Dialog/Sheet viven en z-[300];
 *   el z-50 del DS dejaría el dropdown DETRÁS del overlay del modal.
 *   Se conserva también max-h-96 (el DS recorta a max-h-72).
 * El resto se re-exporta tal cual del paquete.
 */

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@leasefy/ui"

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof DSSelectTrigger>,
  React.ComponentPropsWithoutRef<typeof DSSelectTrigger>
>(({ className, ...props }, ref) => (
  <DSSelectTrigger
    ref={ref}
    className={cn("h-11 px-4 text-sm", className)}
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

export { SelectTrigger, SelectContent }
