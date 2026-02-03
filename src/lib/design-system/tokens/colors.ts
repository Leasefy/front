/**
 * Design System - Color Tokens
 * Single source of truth for all colors
 *
 * Naming Convention:
 * - Scales: color-{shade} (50-950)
 * - Semantic: {role}-{variant} (primary, secondary, etc.)
 * - State: {state}-{element} (success, warning, error)
 */

// ============================================
// Primary Brand Colors
// ============================================

export const indigo = {
  50: '237 100% 97%',   // #F2F3FF - Lightest backgrounds
  100: '237 100% 95%',  // #E5E7FF - Light backgrounds
  200: '237 100% 90%',  // #C9CCFF - Borders, dividers
  300: '237 100% 83%',  // #A6AAFF - Light accents
  400: '238 90% 73%',   // #8085F7 - Medium accents
  500: '238 82% 65%',   // #5B5FEF - Primary CTA
  600: '238 76% 59%',   // #4A4FE6 - Primary hover
  700: '238 52% 52%',   // #3E41C9 - Primary pressed
  800: '239 55% 41%',   // #2E2FA3 - Dark accents
  900: '239 50% 28%',   // #23246E - Darkest
  950: '240 45% 12%',   // #111127 - Near black with tint
} as const;

export const sand = {
  50: '34 47% 96%',     // #FAF7F2 - Warm background
  100: '34 32% 93%',    // #F3EEE4 - Light warm
  200: '34 29% 85%',    // #E7DDCC - Borders
  300: '32 24% 75%',    // #D4C4AB - Medium
  400: '30 20% 68%',    // #C4B08E - Accents
  500: '30 20% 63%',    // #B9A58A - Primary sand
  600: '28 20% 54%',    // #A08E70 - Darker
  700: '28 18% 46%',    // #8A7761 - Dark
  800: '26 17% 36%',    // #6B5D4A - Darker
  900: '24 17% 26%',    // #4E4033 - Darkest
} as const;

// ============================================
// Neutral Scale (Stone-based)
// ============================================

export const neutral = {
  0: '0 0% 100%',       // #FFFFFF - Pure white
  50: '40 20% 98%',     // #FAFAF9 - Off-white background
  100: '40 6% 96%',     // #F5F5F4 - Light gray
  200: '30 6% 91%',     // #E7E5E4 - Borders
  300: '24 6% 83%',     // #D6D3D1 - Disabled
  400: '28 4% 64%',     // #A8A29E - Placeholder
  500: '25 5% 50%',     // #827A73 - Secondary text
  600: '25 8% 32%',     // #57534E - Muted text
  700: '24 10% 24%',    // #44403C - Body text
  800: '20 14% 16%',    // #2D2825 - Dark text
  900: '20 17% 9%',     // #1C1917 - Near black
  950: '24 10% 6%',     // #120F0D - Darkest
} as const;

// ============================================
// Semantic Colors
// ============================================

export const success = {
  50: '120 14% 95%',    // #F2F7F2 - Light success bg
  100: '128 14% 89%',   // #DDEBDF - Success bg
  200: '140 20% 78%',   // #B8D9BD - Light accent
  300: '145 25% 65%',   // #7FC08B - Accent
  400: '150 35% 50%',   // #53A66A - Medium
  500: '150 45% 34%',   // #2F7D4E - Primary success
  600: '152 50% 28%',   // #236B3E - Hover
  700: '150 48% 24%',   // #1F5A38 - Pressed
  800: '148 45% 18%',   // #1A4630 - Dark
  900: '150 40% 12%',   // #143322 - Darkest
} as const;

export const warning = {
  50: '45 100% 97%',    // #FFFBF0 - Light warning bg
  100: '36 62% 88%',    // #F9E8C9 - Warning bg
  200: '35 55% 78%',    // #F0D4A4 - Light accent
  300: '32 50% 65%',    // #D9B574 - Accent
  400: '30 55% 55%',    // #C99845 - Medium
  500: '30 63% 46%',    // #C07A2D - Primary warning
  600: '28 65% 38%',    // #A05E21 - Hover
  700: '25 64% 33%',    // #8A4F1D - Pressed
  800: '22 60% 26%',    // #6B3D18 - Dark
  900: '20 55% 18%',    // #472912 - Darkest
} as const;

export const error = {
  50: '10 100% 97%',    // #FFF4F2 - Light error bg
  100: '10 72% 91%',    // #FBD9D3 - Error bg
  200: '8 65% 82%',     // #F5B8AD - Light accent
  300: '7 58% 70%',     // #E68E7D - Accent
  400: '7 54% 58%',     // #D4685A - Medium
  500: '7 54% 49%',     // #C24B3A - Primary error
  600: '6 52% 42%',     // #A33C2E - Hover
  700: '5 47% 38%',     // #8E3328 - Pressed
  800: '4 45% 30%',     // #6F2720 - Dark
  900: '3 40% 22%',     // #4F1C17 - Darkest
} as const;

export const info = {
  50: '210 100% 97%',   // #F0F7FF - Light info bg
  100: '210 80% 92%',   // #DBEAFE - Info bg
  200: '212 75% 84%',   // #BFDBFE - Light accent
  300: '213 70% 72%',   // #93C5FD - Accent
  400: '214 65% 60%',   // #60A5FA - Medium
  500: '217 70% 55%',   // #3B82F6 - Primary info
  600: '221 72% 48%',   // #2563EB - Hover
  700: '224 70% 42%',   // #1D4ED8 - Pressed
  800: '226 65% 35%',   // #1E40AF - Dark
  900: '228 60% 28%',   // #1E3A8A - Darkest
} as const;

// ============================================
// Extended Color Palette
// ============================================

export const emerald = {
  50: '152 81% 96%',
  100: '149 80% 90%',
  200: '152 76% 80%',
  300: '156 72% 67%',
  400: '158 64% 52%',
  500: '160 84% 39%',
  600: '161 94% 30%',
  700: '163 94% 24%',
  800: '163 88% 20%',
  900: '164 86% 16%',
  950: '166 91% 9%',
} as const;

export const teal = {
  50: '166 76% 97%',
  100: '167 85% 89%',
  200: '168 84% 78%',
  300: '171 77% 64%',
  400: '172 66% 50%',
  500: '173 80% 40%',
  600: '175 84% 32%',
  700: '175 77% 26%',
  800: '176 69% 22%',
  900: '176 61% 19%',
  950: '179 84% 10%',
} as const;

export const cyan = {
  50: '183 100% 96%',
  100: '185 96% 90%',
  200: '186 94% 82%',
  300: '187 92% 69%',
  400: '188 86% 53%',
  500: '189 94% 43%',
  600: '192 91% 36%',
  700: '193 82% 31%',
  800: '194 70% 27%',
  900: '196 64% 24%',
  950: '197 79% 15%',
} as const;

export const violet = {
  50: '250 100% 98%',
  100: '251 91% 95%',
  200: '251 95% 92%',
  300: '252 95% 85%',
  400: '255 92% 76%',
  500: '258 90% 66%',
  600: '262 83% 58%',
  700: '263 70% 50%',
  800: '263 69% 42%',
  900: '264 67% 35%',
  950: '265 61% 22%',
} as const;

export const purple = {
  50: '270 100% 98%',
  100: '269 100% 95%',
  200: '269 100% 92%',
  300: '269 97% 85%',
  400: '270 95% 75%',
  500: '271 91% 65%',
  600: '271 81% 56%',
  700: '272 72% 47%',
  800: '273 67% 39%',
  900: '274 66% 32%',
  950: '274 64% 18%',
} as const;

export const amber = {
  50: '48 100% 96%',
  100: '48 96% 89%',
  200: '48 97% 77%',
  300: '46 97% 65%',
  400: '43 96% 56%',
  500: '38 92% 50%',
  600: '32 95% 44%',
  700: '26 90% 37%',
  800: '23 83% 31%',
  900: '22 78% 26%',
  950: '21 92% 14%',
} as const;

export const orange = {
  50: '33 100% 96%',
  100: '34 100% 92%',
  200: '32 98% 83%',
  300: '31 97% 72%',
  400: '27 96% 61%',
  500: '25 95% 53%',
  600: '21 90% 48%',
  700: '17 88% 40%',
  800: '15 79% 34%',
  900: '15 75% 28%',
  950: '13 81% 15%',
} as const;

export const rose = {
  50: '356 100% 97%',
  100: '356 100% 95%',
  200: '353 96% 90%',
  300: '353 96% 82%',
  400: '351 95% 71%',
  500: '350 89% 60%',
  600: '347 77% 50%',
  700: '345 83% 41%',
  800: '343 80% 35%',
  900: '342 75% 30%',
  950: '343 88% 16%',
} as const;

export const slate = {
  50: '210 40% 98%',
  100: '210 40% 96%',
  200: '214 32% 91%',
  300: '213 27% 84%',
  400: '215 20% 65%',
  500: '215 16% 47%',
  600: '215 19% 35%',
  700: '215 25% 27%',
  800: '217 33% 17%',
  900: '222 47% 11%',
  950: '229 84% 5%',
} as const;

// ============================================
// Chart Colors
// ============================================

export const chart = {
  1: '238 82% 65%',     // Indigo-500
  2: '160 84% 39%',     // Emerald-500
  3: '258 90% 66%',     // Violet-500
  4: '38 92% 50%',      // Amber-500
  5: '350 89% 60%',     // Rose-500
} as const;

// ============================================
// Risk Level Colors (A-D scale)
// ============================================

export const risk = {
  a: '150 45% 34%',     // Success-500 (Best)
  b: '217 70% 55%',     // Info-500 (Good)
  c: '30 63% 46%',      // Warning-500 (Moderate)
  d: '7 54% 49%',       // Error-500 (High risk)
} as const;

// ============================================
// Type Exports
// ============================================

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950?: string;
};

export type SemanticColorScale = {
  50: string;
  100: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600?: string;
  700: string;
  800?: string;
  900?: string;
};

export const colors = {
  // Brand
  indigo,
  sand,
  // Neutral
  neutral,
  // Semantic
  success,
  warning,
  error,
  info,
  // Extended
  emerald,
  teal,
  cyan,
  violet,
  purple,
  amber,
  orange,
  rose,
  slate,
  // Data viz
  chart,
  risk,
} as const;

export type Colors = typeof colors;
