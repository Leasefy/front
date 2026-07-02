/**
 * Card — THIN SHIM over @leasefy/cadence.
 *
 * La API del DS es un superset con los mismos nombres (Card, CardHeader,
 * CardTitle, CardDescription, CardContent, CardFooter) + prop `interactive`.
 * Superficie Manus: bg-surface, hairline border, radius-md, sin sombra.
 */

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@leasefy/cadence"

export type { CardProps } from "@leasefy/cadence"
