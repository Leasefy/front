import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // `data-slot="skeleton"` follows the shadcn/ui slot convention so
      // tests and screen-reader announcements can locate every skeleton
      // primitive without depending on internal classnames. The Phase 38
      // panel-a11y suite asserts on this attribute (see axe-helpers and
      // the per-page `[data-slot="skeleton"]` selectors).
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
