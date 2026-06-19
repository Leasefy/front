"use client"

import * as React from "react"
import * as DropdownListPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, CaretRight, Circle } from '@phosphor-icons/react'

import { cn } from "@/lib/utils"

const DropdownList = DropdownListPrimitive.Root

const DropdownListTrigger = DropdownListPrimitive.Trigger

const DropdownListGroup = DropdownListPrimitive.Group

const DropdownListPortal = DropdownListPrimitive.Portal

const DropdownListSub = DropdownListPrimitive.Sub

const DropdownListRadioGroup = DropdownListPrimitive.RadioGroup

const DropdownListSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownListPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 [@media(pointer:coarse)]:py-2.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <CaretRight className="ml-auto" />
  </DropdownListPrimitive.SubTrigger>
))
DropdownListSubTrigger.displayName =
  DropdownListPrimitive.SubTrigger.displayName

const DropdownListSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownListPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownListSubContent.displayName =
  DropdownListPrimitive.SubContent.displayName

const DropdownListContent = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownListPrimitive.Portal>
    <DropdownListPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-white dark:bg-[#1a1a1c] border-neutral-200 dark:border-white/10 p-1 text-neutral-900 dark:text-neutral-100 shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownListPrimitive.Portal>
))
DropdownListContent.displayName = DropdownListPrimitive.Content.displayName

const DropdownListItem = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownListPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 [@media(pointer:coarse)]:py-2.5 text-sm text-neutral-700 dark:text-neutral-200 outline-none transition-colors focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-neutral-500 dark:[&>svg]:text-neutral-400",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownListItem.displayName = DropdownListPrimitive.Item.displayName

const DropdownListCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownListPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 [@media(pointer:coarse)]:py-2.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownListPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownListPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownListPrimitive.CheckboxItem>
))
DropdownListCheckboxItem.displayName =
  DropdownListPrimitive.CheckboxItem.displayName

const DropdownListRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownListPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 [@media(pointer:coarse)]:py-2.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownListPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownListPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownListPrimitive.RadioItem>
))
DropdownListRadioItem.displayName = DropdownListPrimitive.RadioItem.displayName

const DropdownListLabel = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownListPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-neutral-900 dark:text-white",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownListLabel.displayName = DropdownListPrimitive.Label.displayName

const DropdownListSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownListPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownListPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownListPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-neutral-100 dark:bg-white/10", className)}
    {...props}
  />
))
DropdownListSeparator.displayName = DropdownListPrimitive.Separator.displayName

const DropdownListShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownListShortcut.displayName = "DropdownListShortcut"

export {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListCheckboxItem,
  DropdownListRadioItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListShortcut,
  DropdownListGroup,
  DropdownListPortal,
  DropdownListSub,
  DropdownListSubContent,
  DropdownListSubTrigger,
  DropdownListRadioGroup,
}
