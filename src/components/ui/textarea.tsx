import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border-2 border-input bg-background px-4 py-2 text-base transition-all duration-[var(--duration-normal)] placeholder:text-muted-foreground hover:border-border focus-visible:outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
