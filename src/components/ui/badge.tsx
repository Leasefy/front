import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#7f51ff] text-white shadow-sm shadow-[#7f51ff]/20 hover:bg-[#6b3fd4]",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
        destructive:
          "border-transparent bg-red-100 text-red-700 shadow-sm hover:bg-red-200",
        outline:
          "border-slate-200 bg-white text-slate-700 hover:border-[#7f51ff]/30 hover:bg-[#7f51ff]/5",
        success:
          "border-transparent bg-emerald-100 text-emerald-700 shadow-sm",
        warning:
          "border-transparent bg-amber-100 text-amber-700 shadow-sm",
        // Risk level variants for tenant scoring - Premium pills
        "risk-a":
          "border-transparent bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
        "risk-b":
          "border-transparent bg-blue-500 text-white shadow-sm shadow-blue-500/25",
        "risk-c":
          "border-transparent bg-amber-500 text-white shadow-sm shadow-amber-500/25",
        "risk-d":
          "border-transparent bg-red-500 text-white shadow-sm shadow-red-500/25",
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
