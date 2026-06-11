import * as React from "react"
import { Alert as DSAlert } from "@leasefy/ui"

import { cn } from "@/lib/utils"

/**
 * Alert — ADAPTER fino sobre el Alert de @leasefy/ui que preserva la API
 * shadcn local (composición con children: icono svg + AlertTitle +
 * AlertDescription):
 * - variant: default → info del DS con overrides neutros (el DS no tiene
 *   variant neutro; los call sites de `default` traen sus propios colores),
 *   destructive → danger (adopta el soft-fill del DS).
 * - El icono automático del DS se suprime (los call sites traen su propio
 *   svg como child); se replica el posicionamiento absoluto del svg del
 *   patrón shadcn dentro de un wrapper propio.
 * - AlertTitle / AlertDescription se mantienen locales (el DS usa props
 *   `title`/children en su lugar).
 */

type AlertVariant = "default" | "destructive"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant | null
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, children, ...props }, ref) => {
    const resolved = variant ?? "default"
    return (
      <DSAlert
        ref={ref}
        variant={resolved === "destructive" ? "danger" : "info"}
        icon={<></>}
        className={cn(
          // `default` del mvp era neutro (bg-background); el DS no tiene
          // variant neutro, así que se restaura sobre `info`.
          resolved === "default" &&
            "border-border bg-background text-foreground",
          className
        )}
        {...props}
      >
        <div className="relative w-full [&>svg]:absolute [&>svg]:left-0 [&>svg]:top-0 [&>svg~*]:pl-7">
          {children}
        </div>
      </DSAlert>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
