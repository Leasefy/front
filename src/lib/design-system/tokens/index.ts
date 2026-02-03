/**
 * Design System Tokens - Single Source of Truth
 *
 * This file exports all design tokens in a structured format.
 * Import from here for type-safe access to the design system.
 *
 * @example
 * import { tokens } from '@/lib/design-system/tokens';
 * const primaryColor = tokens.colors.indigo[500];
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './effects';
export * from './animations';

import { colors, type Colors } from './colors';
import { typography } from './typography';
import { spacingTokens } from './spacing';
import { effects } from './effects';
import { animations } from './animations';

// ============================================
// Consolidated Token Export
// ============================================

export const tokens = {
  colors,
  typography,
  spacing: spacingTokens,
  effects,
  animations,
} as const;

export type DesignTokens = typeof tokens;

// ============================================
// CSS Variable Helpers
// ============================================

/**
 * Convert HSL token to CSS hsl() value
 * @example hsl(tokens.colors.indigo[500]) => 'hsl(238 82% 65%)'
 */
export function hsl(hslValue: string): string {
  return `hsl(${hslValue})`;
}

/**
 * Convert HSL token to CSS hsl() with alpha
 * @example hsla(tokens.colors.indigo[500], 0.5) => 'hsl(238 82% 65% / 0.5)'
 */
export function hsla(hslValue: string, alpha: number): string {
  return `hsl(${hslValue} / ${alpha})`;
}

/**
 * Get CSS variable reference
 * @example cssVar('indigo-500') => 'var(--indigo-500)'
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}

/**
 * Create CSS variable with fallback
 * @example cssVarWithFallback('indigo-500', '#5B5FEF') => 'var(--indigo-500, #5B5FEF)'
 */
export function cssVarWithFallback(name: string, fallback: string): string {
  return `var(--${name}, ${fallback})`;
}

// ============================================
// Tailwind Config Helpers
// ============================================

/**
 * Generate Tailwind color config from color tokens
 * Wraps values in hsl(var(--name)) format for CSS variable integration
 */
export function generateTailwindColors(colorTokens: Colors) {
  const result: Record<string, Record<string, string>> = {};

  for (const [colorName, shades] of Object.entries(colorTokens)) {
    result[colorName] = {};
    for (const [shade, value] of Object.entries(shades)) {
      result[colorName][shade] = `hsl(var(--${colorName}-${shade}))`;
    }
  }

  return result;
}

/**
 * Generate CSS custom properties from color tokens
 * For use in globals.css or theme provider
 */
export function generateCSSVariables(colorTokens: Colors): string {
  const lines: string[] = [];

  for (const [colorName, shades] of Object.entries(colorTokens)) {
    for (const [shade, value] of Object.entries(shades)) {
      lines.push(`--${colorName}-${shade}: ${value};`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Theme Type Definitions
// ============================================

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

// ============================================
// Default Theme (Light)
// ============================================

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: colors.neutral[50],
    foreground: colors.neutral[900],
    card: colors.neutral[0],
    cardForeground: colors.neutral[900],
    popover: colors.neutral[0],
    popoverForeground: colors.neutral[900],
    primary: colors.indigo[500],
    primaryForeground: colors.neutral[0],
    secondary: colors.neutral[100],
    secondaryForeground: colors.neutral[900],
    muted: colors.neutral[100],
    mutedForeground: colors.neutral[600],
    accent: colors.indigo[50],
    accentForeground: colors.indigo[900],
    destructive: colors.error[500],
    destructiveForeground: colors.neutral[0],
    border: colors.neutral[200],
    input: colors.neutral[200],
    ring: colors.indigo[500],
  },
};

// ============================================
// Dark Theme
// ============================================

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: '240 6% 7%',      // #111112
    foreground: '0 0% 95%',       // #F2F2F2
    card: '240 6% 10%',           // #18181B
    cardForeground: '0 0% 95%',
    popover: '240 6% 10%',
    popoverForeground: '0 0% 95%',
    primary: colors.indigo[300],  // Lighter on dark
    primaryForeground: colors.neutral[900],
    secondary: '240 4% 16%',
    secondaryForeground: '0 0% 95%',
    muted: '240 4% 16%',
    mutedForeground: '240 5% 65%',
    accent: '240 4% 16%',
    accentForeground: '0 0% 95%',
    destructive: colors.error[400],
    destructiveForeground: '0 0% 95%',
    border: '240 4% 16%',
    input: '240 4% 16%',
    ring: colors.indigo[400],
  },
};
