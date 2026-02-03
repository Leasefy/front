/**
 * Design System - Typography Tokens
 *
 * Font Stack:
 * - Manrope: Headings, display text
 * - DM Sans: Body text, UI elements
 * - DM Mono: Numbers, code, labels
 */

// ============================================
// Font Families
// ============================================

export const fontFamily = {
  sans: 'var(--font-sans)',      // DM Sans
  heading: 'var(--font-heading)', // Manrope
  mono: 'var(--font-mono)',       // DM Mono
} as const;

// ============================================
// Font Sizes (rem-based scale)
// ============================================

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
  '5xl': ['3rem', { lineHeight: '1.15' }],        // 48px
  '6xl': ['3.75rem', { lineHeight: '1.1' }],      // 60px
  '7xl': ['4.5rem', { lineHeight: '1.05' }],      // 72px
} as const;

// ============================================
// Font Weights
// ============================================

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// ============================================
// Line Heights
// ============================================

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// ============================================
// Letter Spacing
// ============================================

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// ============================================
// Typography Presets (Tailwind-ready)
// ============================================

export const textStyles = {
  // Display headings (hero sections)
  display: {
    fontFamily: fontFamily.heading,
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    fontWeight: fontWeight.extrabold,
    letterSpacing: '-0.04em',
    lineHeight: '1.05',
  },

  // Heading levels
  h1: {
    fontFamily: fontFamily.heading,
    fontSize: 'clamp(1.875rem, 4vw, 3rem)',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
  },
  h2: {
    fontFamily: fontFamily.heading,
    fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.02em',
    lineHeight: '1.15',
  },
  h3: {
    fontFamily: fontFamily.heading,
    fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
  },
  h4: {
    fontFamily: fontFamily.heading,
    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.01em',
    lineHeight: '1.25',
  },
  h5: {
    fontFamily: fontFamily.heading,
    fontSize: '1.25rem',
    fontWeight: fontWeight.semibold,
    lineHeight: '1.3',
  },
  h6: {
    fontFamily: fontFamily.heading,
    fontSize: '1.125rem',
    fontWeight: fontWeight.semibold,
    lineHeight: '1.4',
  },

  // Body text
  bodyLg: {
    fontFamily: fontFamily.sans,
    fontSize: '1.125rem',
    fontWeight: fontWeight.normal,
    lineHeight: '1.75',
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: '1rem',
    fontWeight: fontWeight.normal,
    lineHeight: '1.5',
  },
  bodySm: {
    fontFamily: fontFamily.sans,
    fontSize: '0.875rem',
    fontWeight: fontWeight.normal,
    lineHeight: '1.5',
  },

  // UI text
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: '0.75rem',
    fontWeight: fontWeight.medium,
    lineHeight: '1.4',
  },
  overline: {
    fontFamily: fontFamily.mono,
    fontSize: '0.75rem',
    fontWeight: fontWeight.medium,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    lineHeight: '1.4',
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: '0.6875rem', // 11px
    fontWeight: fontWeight.medium,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    lineHeight: '1.4',
  },

  // Special text
  statNumber: {
    fontFamily: fontFamily.mono,
    fontSize: 'clamp(3rem, 8vw, 7rem)',
    fontWeight: fontWeight.bold,
    letterSpacing: '-0.05em',
    lineHeight: '1',
    fontVariantNumeric: 'tabular-nums',
  },
  numeric: {
    fontFamily: fontFamily.mono,
    fontVariantNumeric: 'tabular-nums',
  },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
} as const;

// ============================================
// Type Exports
// ============================================

export type FontFamily = keyof typeof fontFamily;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
export type LineHeight = keyof typeof lineHeight;
export type LetterSpacing = keyof typeof letterSpacing;
export type TextStyle = keyof typeof textStyles;

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
} as const;
