"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuContent as DSDropdownMenuContent,
  DropdownMenuItem as DSDropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel as DSDropdownMenuLabel,
  DropdownMenuSeparator as DSDropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * ADAPTER fino sobre el DropdownMenu de @leasefy/ui, expuesto con los nombres
 * legacy del mvp (DropdownList*). Root/Trigger/Group/Portal/Sub/Radio/Checkbox/
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
 * Dark mode: los tokens del DS (bg-surface/border-border/text-fg…) ya flipan
 * vía el bridge en globals.css (.dark), así que las clases dark: explícitas
 * del legacy ya no hacen falta.
 */
const DropdownListContent = React.forwardRef<
  React.ElementRef<typeof DSDropdownMenuContent>,
  React.ComponentPropsWithoutRef<typeof DSDropdownMenuContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DSDropdownMenuContent
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
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
      className
    )}
    {...props}
  />
))
DropdownListItem.displayName = "DropdownListItem"

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
  DropdownMenuCheckboxItem as DropdownListCheckboxItem,
  DropdownMenuRadioItem as DropdownListRadioItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownMenuShortcut as DropdownListShortcut,
  DropdownMenuGroup as DropdownListGroup,
  DropdownMenuPortal as DropdownListPortal,
  DropdownMenuSub as DropdownListSub,
  DropdownMenuSubContent as DropdownListSubContent,
  DropdownMenuSubTrigger as DropdownListSubTrigger,
  DropdownMenuRadioGroup as DropdownListRadioGroup,
}
