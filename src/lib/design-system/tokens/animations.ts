/**
 * Design System - Animation Tokens
 * Durations, Easings, Keyframes
 */

// ============================================
// Durations
// ============================================

export const durations = {
  instant: '0ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
  // Named durations for specific use cases
  tooltip: '150ms',
  modal: '200ms',
  page: '300ms',
  loading: '1000ms',
} as const;

// ============================================
// Easing Functions
// ============================================

export const easings = {
  // Standard easings
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Material Design easings
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',

  // Spring easings
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',

  // Smooth easings
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  gentle: 'cubic-bezier(0.19, 1, 0.22, 1)',
} as const;

// ============================================
// Transition Presets
// ============================================

export const transitions = {
  // Quick interactions (buttons, toggles)
  fast: `all ${durations.fast} ${easings.easeOut}`,
  // Standard interactions (dropdowns, tabs)
  normal: `all ${durations.normal} ${easings.standard}`,
  // Slow interactions (modals, drawers)
  slow: `all ${durations.slow} ${easings.easeInOut}`,
  // Smooth feel
  smooth: `all ${durations.slower} ${easings.smooth}`,

  // Property-specific
  colors: `color ${durations.fast} ${easings.easeOut}, background-color ${durations.fast} ${easings.easeOut}, border-color ${durations.fast} ${easings.easeOut}`,
  transform: `transform ${durations.normal} ${easings.spring}`,
  opacity: `opacity ${durations.normal} ${easings.easeOut}`,
  shadow: `box-shadow ${durations.normal} ${easings.easeOut}`,

  // Component-specific
  button: `all ${durations.fast} ${easings.easeOut}`,
  input: `border-color ${durations.fast} ${easings.easeOut}, box-shadow ${durations.fast} ${easings.easeOut}`,
  card: `transform ${durations.normal} ${easings.spring}, box-shadow ${durations.normal} ${easings.easeOut}`,
  modal: `opacity ${durations.normal} ${easings.easeOut}, transform ${durations.normal} ${easings.decelerate}`,
  tooltip: `opacity ${durations.faster} ${easings.easeOut}`,
} as const;

// ============================================
// Keyframe Animations (CSS-in-JS format)
// ============================================

export const keyframes = {
  // Fade animations
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },
  fadeInUp: {
    from: { opacity: '0', transform: 'translateY(10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInDown: {
    from: { opacity: '0', transform: 'translateY(-10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  // Scale animations
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  scaleOut: {
    from: { opacity: '1', transform: 'scale(1)' },
    to: { opacity: '0', transform: 'scale(0.95)' },
  },

  // Slide animations
  slideInFromRight: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },
  slideInFromLeft: {
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0)' },
  },
  slideInFromTop: {
    from: { transform: 'translateY(-100%)' },
    to: { transform: 'translateY(0)' },
  },
  slideInFromBottom: {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' },
  },

  // Accordion
  accordionDown: {
    from: { height: '0' },
    to: { height: 'var(--radix-accordion-content-height)' },
  },
  accordionUp: {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: '0' },
  },

  // Spinner/Loading
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
    '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
  },

  // Shimmer (skeleton loading)
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },

  // Progress
  progressIndeterminate: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(200%)' },
  },

  // Notification
  slideInNotification: {
    from: { transform: 'translateX(100%)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' },
  },
  slideOutNotification: {
    from: { transform: 'translateX(0)', opacity: '1' },
    to: { transform: 'translateX(100%)', opacity: '0' },
  },
} as const;

// ============================================
// Animation Presets (ready to use)
// ============================================

export const animationPresets = {
  fadeIn: `fadeIn ${durations.normal} ${easings.easeOut} forwards`,
  fadeOut: `fadeOut ${durations.normal} ${easings.easeOut} forwards`,
  fadeInUp: `fadeInUp ${durations.slow} ${easings.decelerate} forwards`,
  scaleIn: `scaleIn ${durations.normal} ${easings.spring} forwards`,
  slideInRight: `slideInFromRight ${durations.slow} ${easings.decelerate} forwards`,
  slideInLeft: `slideInFromLeft ${durations.slow} ${easings.decelerate} forwards`,
  slideInTop: `slideInFromTop ${durations.slow} ${easings.decelerate} forwards`,
  slideInBottom: `slideInFromBottom ${durations.slow} ${easings.decelerate} forwards`,
  spin: `spin 1s ${easings.linear} infinite`,
  pulse: `pulse 2s ${easings.easeInOut} infinite`,
  bounce: `bounce 1s infinite`,
  shimmer: `shimmer 2s ${easings.linear} infinite`,
} as const;

// ============================================
// Type Exports
// ============================================

export type Duration = keyof typeof durations;
export type Easing = keyof typeof easings;
export type Transition = keyof typeof transitions;
export type Keyframe = keyof typeof keyframes;
export type AnimationPreset = keyof typeof animationPresets;

export const animations = {
  durations,
  easings,
  transitions,
  keyframes,
  animationPresets,
} as const;
