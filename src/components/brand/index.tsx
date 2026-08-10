/**
 * Leasefy brand signatures — THIN SHIM over @leasefy/cadence.
 *
 * The real implementations live in the design system package
 * (~/rent/design-system). This module re-exports them under the names the
 * app already imports, so the WHOLE app consumes the package without
 * touching 60+ call sites. New code may import '@leasefy/cadence' directly.
 *
 * Brand rules (BRAND-CONTRACT.md in design-system):
 *  - Electric blue #1A40FF = ACTIONABLE only (CTAs, links, active, key data).
 *  - Mono UPPERCASE tracking .08em = technical labels only (never buttons).
 *  - Ink #14130f = the ONE brand-hero surface per screen (contour + glow).
 *  - Motif = pinstripe field with tone inversion (never bar-chart stripes).
 */

export {
  // símbolo + lockups (DS lo llama BrandMark; el app habla LeasefyMark)
  BrandMark as LeasefyMark,
  LeasefyWordmark,
  LeasefyLogo,
  // motivo gráfico
  BrandMotif,
  BrandContour,
  BrandSplash,
  // firma técnica
  BrandDot,
  MonoLabel,
  Eyebrow,
  // señales de ingeniería
  StatusBadge,
  SEMANTIC,
} from "@leasefy/cadence";

// Variante monocroma del símbolo para chrome (sidebar/headers): hereda el
// color del contenedor, así sale negro en claro y blanco en oscuro.
export { LeasefySymbol, LeasefyLogotype } from "./LeasefySymbol";

export type { SemanticTone } from "@leasefy/cadence";

export const BRAND_BLUE = "#1A40FF";
export const BRAND_INK = "#14130f";
