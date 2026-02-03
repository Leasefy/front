/**
 * Design System - Effects Tokens
 * Shadows, Border Radius, Z-Index, Opacity
 */

// ============================================
// Border Radius
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',     // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',     // Pill/circle
} as const;

// ============================================
// Box Shadows
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',

  // Card shadows (subtle)
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)',
  cardActive: '0 1px 2px rgba(0, 0, 0, 0.03)',

  // Elevated surfaces
  elevated: '0 4px 16px rgba(0, 0, 0, 0.08)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  dropdown: '0 10px 40px rgba(0, 0, 0, 0.12)',

  // Focus rings
  focus: '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))',
  focusError: '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--error-500))',
} as const;

// ============================================
// Glow Shadows (for dark themes)
// ============================================

export const glowShadows = {
  indigo: '0 0 40px rgba(91, 95, 239, 0.15)',
  violet: '0 0 40px rgba(139, 92, 246, 0.15)',
  emerald: '0 0 40px rgba(16, 185, 129, 0.15)',
  cyan: '0 0 40px rgba(6, 182, 212, 0.15)',
  amber: '0 0 40px rgba(245, 158, 11, 0.15)',
  rose: '0 0 40px rgba(244, 63, 94, 0.15)',
  blue: '0 0 40px rgba(59, 130, 246, 0.15)',
} as const;

// ============================================
// Z-Index Scale
// ============================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
  max: 9999,
} as const;

// ============================================
// Opacity Scale
// ============================================

export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const;

// ============================================
// Blur Values
// ============================================

export const blur = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
} as const;

// ============================================
// Type Exports
// ============================================

export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type GlowShadow = keyof typeof glowShadows;
export type ZIndex = keyof typeof zIndex;
export type Opacity = keyof typeof opacity;
export type Blur = keyof typeof blur;

export const effects = {
  borderRadius,
  shadows,
  glowShadows,
  zIndex,
  opacity,
  blur,
} as const;
