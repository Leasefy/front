"use client"

import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUpRight, SpinnerGap } from '@phosphor-icons/react'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-mono font-normal uppercase tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/85",
        white:
          "bg-white dark:bg-card text-foreground hover:bg-white/90 dark:hover:bg-card/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent/10 hover:border-foreground/20",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 hover:border-border",
        glass:
          "bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-sm",
        ghost:
          "text-muted-foreground hover:bg-secondary hover:text-foreground",
        link:
          "text-foreground underline-offset-4 hover:underline !rounded-none !px-0 hover:text-primary",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-[14px]",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ARROW_VARIANTS = new Set<string>(["default", "white"])

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  hideArrow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, hideArrow = false, children, ...props }, ref) => {
    const resolvedVariant = variant ?? "default"
    const showArrow = ARROW_VARIANTS.has(resolvedVariant) && !hideArrow && !isLoading && size !== "icon"

    const arrowIcon = showArrow ? (
      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    ) : null

    const loaderIcon = isLoading ? (
      <SpinnerGap className="h-4 w-4 animate-spin" />
    ) : null

    if (asChild) {
      return (
        <Slot
          className={cn(
            buttonVariants({ variant, size, className }),
            isLoading && "pointer-events-none opacity-70"
          )}
          ref={ref}
          {...props}
        >
          {loaderIcon}
          <Slottable>{children}</Slottable>
          {arrowIcon}
        </Slot>
      )
    }

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, className }),
          isLoading && "pointer-events-none opacity-70"
        )}
        ref={ref}
        disabled={props.disabled || isLoading}
        {...props}
      >
        {loaderIcon}
        {children}
        {arrowIcon}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
