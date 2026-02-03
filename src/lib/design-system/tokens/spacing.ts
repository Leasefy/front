/**
 * Design System - Spacing Tokens
 *
 * Base unit: 4px
 * Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64
 */

// ============================================
// Spacing Scale (in pixels, converted to rem)
// ============================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================
// Semantic Spacing
// ============================================

export const semanticSpacing = {
  // Component internal spacing
  componentPaddingXs: spacing[2],    // 8px - Tight padding (badges, chips)
  componentPaddingSm: spacing[3],    // 12px - Small components (small buttons)
  componentPaddingMd: spacing[4],    // 16px - Default components
  componentPaddingLg: spacing[5],    // 20px - Large components
  componentPaddingXl: spacing[6],    // 24px - Extra large components

  // Card padding
  cardPaddingSm: spacing[4],         // 16px
  cardPaddingMd: spacing[5],         // 20px
  cardPaddingLg: spacing[6],         // 24px
  cardPaddingXl: spacing[8],         // 32px

  // Section spacing (vertical)
  sectionPaddingSm: spacing[8],      // 32px
  sectionPaddingMd: spacing[12],     // 48px
  sectionPaddingLg: spacing[16],     // 64px
  sectionPaddingXl: spacing[20],     // 80px
  sectionPaddingXxl: spacing[24],    // 96px

  // Gap between elements
  gapXs: spacing[1],                 // 4px
  gapSm: spacing[2],                 // 8px
  gapMd: spacing[3],                 // 12px
  gapLg: spacing[4],                 // 16px
  gapXl: spacing[6],                 // 24px
  gapXxl: spacing[8],                // 32px

  // Stack spacing (between stacked elements)
  stackXs: spacing[1],               // 4px
  stackSm: spacing[2],               // 8px
  stackMd: spacing[4],               // 16px
  stackLg: spacing[6],               // 24px
  stackXl: spacing[8],               // 32px

  // Inline spacing (between inline elements)
  inlineXs: spacing[1],              // 4px
  inlineSm: spacing[2],              // 8px
  inlineMd: spacing[3],              // 12px
  inlineLg: spacing[4],              // 16px
} as const;

// ============================================
// Container Sizes
// ============================================

export const containerSizes = {
  xs: '20rem',      // 320px
  sm: '24rem',      // 384px
  md: '28rem',      // 448px
  lg: '32rem',      // 512px
  xl: '36rem',      // 576px
  '2xl': '42rem',   // 672px
  '3xl': '48rem',   // 768px
  '4xl': '56rem',   // 896px
  '5xl': '64rem',   // 1024px
  '6xl': '72rem',   // 1152px
  '7xl': '80rem',   // 1280px
  prose: '65ch',    // Optimal reading width
  full: '100%',
} as const;

// ============================================
// Breakpoints
// ============================================

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// Type Exports
// ============================================

export type Spacing = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type ContainerSize = keyof typeof containerSizes;
export type Breakpoint = keyof typeof breakpoints;

export const spacingTokens = {
  spacing,
  semanticSpacing,
  containerSizes,
  breakpoints,
} as const;
