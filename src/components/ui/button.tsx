"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f51ff]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#7f51ff] to-[#6b3fd4] text-white shadow-lg shadow-[#7f51ff]/25 hover:shadow-xl hover:shadow-[#7f51ff]/30 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5",
        outline:
          "border-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#7f51ff]/30 hover:bg-[#7f51ff]/5 hover:text-[#7f51ff]",
        secondary:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link:
          "text-[#7f51ff] underline-offset-4 hover:underline",
        accent:
          "bg-[#7f51ff] text-white shadow-lg shadow-[#7f51ff]/25 hover:bg-[#6b3fd4] hover:shadow-xl hover:shadow-[#7f51ff]/30 hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  showArrow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, showArrow, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isPrimary = variant === "default" || variant === undefined
    const shouldShowArrow = showArrow ?? isPrimary

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), "group/btn overflow-hidden", className)}
        ref={ref}
        {...props}
      >
        <span className="relative flex items-center gap-2">
          {children}
          {shouldShowArrow && (
            <ArrowUpRight
              className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200"
            />
          )}
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
