"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuSubTrigger as DSDropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuContent as DSDropdownMenuContent,
  DropdownMenuItem as DSDropdownMenuItem,
  DropdownMenuCheckboxItem as DSDropdownMenuCheckboxItem,
  DropdownMenuRadioItem as DSDropdownMenuRadioItem,
  DropdownMenuLabel as DSDropdownMenuLabel,
  DropdownMenuSeparator as DSDropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@leasefy/cadence"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el DropdownMenu de @leasefy/cadence, expuesto con los nombres
 * legacy del mvp (DropdownList*). Root/Trigger/Group/Portal/Sub/Radio/
 * Shortcut son re-exports con alias (misma API Radix; el Item del DS es
 * superset: inset/destructive/shortcut).
 *
 * Wrappers de fidelidad (cero cambios de comportamiento visible):
 *  - Content: sideOffset 4 (DS usa 6); menús largos scrollean (max-h
 *    available-height + overflow-y-auto; el DS recorta con overflow-hidden);
 *    sin tope de ancho (el DS impone max-w-[240px]); min-w-[8rem] legacy.
 *  - Item: el DS usa variantes `disabled:` que NO aplican a items Radix
 *    (exponen data-disabled, no :disabled) → se restaura data-[disabled]:*;
 *    [&_svg]:size-4 para no encoger los iconos w-4 de los call sites
 *    (el DS fuerza 3.5 por descendiente y le gana a la clase del icono).
 *  - Label: el DS lo trata como eyebrow mono/uppercase que CASCADEA sobre los
 *    children ricos (user-card de PlanHeader) → se restaura la tipografía legacy.
 *  - Separator: -mx-1 full-bleed legacy.
 *
 * Touch targets: todas las variantes de item (Item/CheckboxItem/RadioItem/
 * SubTrigger) llevan [@media(pointer:coarse)]:py-2.5 para alcanzar ~44px en
 * dispositivos táctiles (a11y del producto).
 *
 * Dark mode: los tokens del DS (bg-surface/border-border/text-fg…) ya flipan
 * vía el bridge en globals.css (.dark), así que las clases dark: explícitas
 * del legacy ya no hacen falta.
 */
const TOUCH_TARGET = "[@media(pointer:coarse)]:py-2.5"

const DropdownListContent = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuContent>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DSDropdownMenuContent
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // z-[400]: Dialog/Sheet viven en z-[300]; el z-50 del DS dejaría este menú
      // DETRÁS del overlay del modal que lo contiene. Mismo parche que select.tsx.
      "z-[400]",
      "max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] max-w-none",
      "overflow-visible overflow-x-hidden overflow-y-auto",
      className
    )}
    {...props}
  />
))
DropdownListContent.displayName = "DropdownListContent"

const DropdownListItem = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuItem>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuItem>
>(({ className, ...props }, ref) => (
  <DSDropdownMenuItem
    ref={ref}
    className={cn(
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4",
      TOUCH_TARGET,
      className
    )}
    {...props}
  />
))
DropdownListItem.displayName = "DropdownListItem"

const DropdownListCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuCheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuCheckboxItem>
>(({ className, ...props }, ref) => (
  <DSDropdownMenuCheckboxItem
    ref={ref}
    className={cn(TOUCH_TARGET, className)}
    {...props}
  />
))
DropdownListCheckboxItem.displayName = "DropdownListCheckboxItem"

const DropdownListRadioItem = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuRadioItem>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuRadioItem>
>(({ className, ...props }, ref) => (
  <DSDropdownMenuRadioItem
    ref={ref}
    className={cn(TOUCH_TARGET, className)}
    {...props}
  />
))
DropdownListRadioItem.displayName = "DropdownListRadioItem"

const DropdownListSubTrigger = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuSubTrigger>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuSubTrigger>
>(({ className, ...props }, ref) => (
  <DSDropdownMenuSubTrigger
    ref={ref}
    className={cn(TOUCH_TARGET, className)}
    {...props}
  />
))
DropdownListSubTrigger.displayName = "DropdownListSubTrigger"

const DropdownListLabel = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuLabel>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuLabel>
>(({ className, ...props }, ref) => (
  <DSDropdownMenuLabel
    ref={ref}
    className={cn(
      "px-2 py-1.5 font-sans text-sm font-semibold normal-case tracking-normal text-neutral-900 dark:text-white",
      className
    )}
    {...props}
  />
))
DropdownListLabel.displayName = "DropdownListLabel"

const DropdownListSeparator = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuSeparator>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuSeparator>
>(({ className, ...props }, ref) => (
  <DSDropdownMenuSeparator ref={ref} className={cn("-mx-1", className)} {...props} />
))
DropdownListSeparator.displayName = "DropdownListSeparator"

export {
  DropdownMenu as DropdownList,
  DropdownMenuTrigger as DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListCheckboxItem,
  DropdownListRadioItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownMenuShortcut as DropdownListShortcut,
  DropdownMenuGroup as DropdownListGroup,
  DropdownMenuPortal as DropdownListPortal,
  DropdownMenuSub as DropdownListSub,
  DropdownMenuSubContent as DropdownListSubContent,
  DropdownListSubTrigger,
  DropdownMenuRadioGroup as DropdownListRadioGroup,
}
