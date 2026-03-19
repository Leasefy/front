import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-[var(--duration-normal)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/20",
        outline:
          "border-border bg-background text-foreground",
        success:
          "border-transparent bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] shadow-sm",
        warning:
          "border-transparent bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] shadow-sm",
        // Risk level variants for tenant scoring - Premium pills
        "risk-a":
          "border-transparent bg-[hsl(var(--risk-a))] text-white shadow-sm shadow-[hsl(var(--risk-a))]/25",
        "risk-b":
          "border-transparent bg-[hsl(var(--risk-b))] text-white shadow-sm shadow-[hsl(var(--risk-b))]/25",
        "risk-c":
          "border-transparent bg-[hsl(var(--risk-c))] text-foreground shadow-sm shadow-[hsl(var(--risk-c))]/25",
        "risk-d":
          "border-transparent bg-[hsl(var(--risk-d))] text-white shadow-sm shadow-[hsl(var(--risk-d))]/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
