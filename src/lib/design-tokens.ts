/**
 * Design Tokens - Sistema de diseño unificado
 * 
 * Define todos los valores de diseño consistentes para toda la plataforma.
 * Estos tokens aseguran que todos los componentes se sientan como parte de la misma herramienta.
 */

// ============================================================================
// Border Radius - Consistente en toda la plataforma
// ============================================================================

export const borderRadius = {
  /** 2px - Bordes mínimos, estilo Luxterra */
  sm: 'rounded-sm',
  /** 4px - Inputs y elementos pequeños */
  md: 'rounded-md',
  /** 8px - Cards y contenedores medianos */
  lg: 'rounded-lg',
  /** 12px - Modales y contenedores grandes */
  xl: 'rounded-xl',
  /** Pill - Botones y badges circulares */
  full: 'rounded-full',
} as const;

// ============================================================================
// Shadows - Sistema de elevación consistente
// ============================================================================

export const shadows = {
  /** Sombra sutil para cards en estado normal */
  subtle: 'shadow-subtle',
  /** Sombra elevada para hover y estados activos */
  elevated: 'shadow-elevated',
  /** Sombra pequeña para elementos sutiles */
  sm: 'shadow-sm',
  /** Sombra media para cards destacados */
  md: 'shadow-md',
  /** Sombra grande para modales y overlays */
  lg: 'shadow-lg',
  /** Sin sombra */
  none: 'shadow-none',
} as const;

// ============================================================================
// Borders - Colores y estilos consistentes
// ============================================================================

export const borders = {
  /** Borde estándar usando el token del design system */
  default: 'border border-border',
  /** Borde sutil para elementos secundarios */
  subtle: 'border border-border/50',
  /** Borde destacado para estados activos */
  primary: 'border border-primary',
  /** Borde para inputs */
  input: 'border border-input',
  /** Sin borde */
  none: 'border-0',
} as const;

// ============================================================================
// Card Styles - Estilos predefinidos para cards
// ============================================================================

export const cardStyles = {
  /** Card básico */
  base: 'bg-card text-card-foreground border border-border rounded-sm shadow-subtle',
  /** Card interactivo con hover */
  interactive: 'bg-card text-card-foreground border border-border rounded-sm shadow-subtle transition-all duration-200 hover:shadow-elevated hover:border-border/80 cursor-pointer',
  /** Card destacado */
  highlighted: 'bg-card text-card-foreground border border-primary rounded-sm shadow-md ring-1 ring-primary',
  /** Card con estado activo/seleccionado */
  selected: 'bg-card text-card-foreground border border-primary rounded-sm shadow-elevated ring-2 ring-primary/20',
} as const;

// ============================================================================
// Text Colors - Colores de texto consistentes
// ============================================================================

export const textColors = {
  /** Texto principal */
  primary: 'text-foreground',
  /** Texto secundario */
  secondary: 'text-muted-foreground',
  /** Texto en cards */
  card: 'text-card-foreground',
  /** Texto en estado deshabilitado */
  disabled: 'text-muted-foreground/50',
  /** Texto de éxito */
  success: 'text-emerald-700',
  /** Texto de advertencia */
  warning: 'text-amber-700',
  /** Texto de error */
  error: 'text-red-700',
} as const;

// ============================================================================
// Background Colors - Fondos consistentes
// ============================================================================

export const backgrounds = {
  /** Fondo principal de la página */
  page: 'bg-background',
  /** Fondo de cards */
  card: 'bg-card',
  /** Fondo secundario */
  secondary: 'bg-secondary',
  /** Fondo muted */
  muted: 'bg-muted',
  /** Fondo destacado */
  accent: 'bg-accent',
} as const;

// ============================================================================
// Spacing - Espaciado consistente
// ============================================================================

export const spacing = {
  /** Padding pequeño para elementos compactos */
  cardPadding: 'p-4',
  /** Padding estándar para cards */
  cardPaddingMd: 'p-5',
  /** Padding grande para cards destacados */
  cardPaddingLg: 'p-6',
  /** Gap pequeño entre elementos */
  gapSm: 'gap-2',
  /** Gap estándar */
  gapMd: 'gap-3',
  /** Gap grande */
  gapLg: 'gap-4',
} as const;

// ============================================================================
// Transitions - Transiciones consistentes
// ============================================================================

export const transitions = {
  /** Transición rápida (200ms) */
  fast: 'transition-all duration-200 ease-out',
  /** Transición estándar (300ms) */
  standard: 'transition-all duration-300 ease-out',
  /** Transición suave (500ms) */
  smooth: 'transition-all duration-500 ease-out',
  /** Transición solo para transformaciones */
  transform: 'transition-transform duration-200 ease-out',
  /** Transición solo para colores */
  colors: 'transition-colors duration-200 ease-out',
} as const;

// ============================================================================
// Hover Effects - Efectos hover consistentes
// ============================================================================

export const hoverEffects = {
  /** Elevación sutil en hover */
  lift: 'hover:-translate-y-0.5 hover:shadow-elevated',
  /** Escala sutil en hover */
  scale: 'hover:scale-[1.02]',
  /** Cambio de color de borde */
  border: 'hover:border-primary/50',
  /** Cambio de opacidad */
  opacity: 'hover:opacity-80',
} as const;

// ============================================================================
// Focus States - Estados de foco consistentes
// ============================================================================

export const focusStates = {
  /** Ring de foco estándar */
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  /** Ring de foco con borde */
  ringBorder: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary',
} as const;

// ============================================================================
// Gradients - Gradientes del sistema de diseño
// ============================================================================

export const gradients = {
  /** Emerald → Teal - Éxito, completado, verificado */
  emeraldTeal: 'from-emerald-500 to-teal-500',
  /** Violet → Purple - Premium, destacado */
  violetPurple: 'from-violet-500 to-purple-500',
  /** Blue → Cyan - Información, tecnología */
  blueCyan: 'from-blue-500 to-cyan-500',
  /** Amber → Orange - Advertencia, atención */
  amberOrange: 'from-amber-500 to-orange-500',
  /** Rose → Pink - Aplicaciones, formularios */
  rosePink: 'from-rose-500 to-pink-500',
  /** Indigo → Violet - Contratos, documentos */
  indigoViolet: 'from-indigo-500 to-violet-500',
  /** Cyan → Blue - Pagos, finanzas */
  cyanBlue: 'from-cyan-500 to-blue-500',
  /** Blue → Indigo - Inmobiliarias, empresas */
  blueIndigo: 'from-blue-500 to-indigo-500',
  /** Rose → Orange - Propietarios */
  roseOrange: 'from-rose-500 to-orange-500',
} as const;

/**
 * Obtiene la clase de gradiente para un elemento
 */
export function getGradientClass(
  gradient: keyof typeof gradients,
  direction: 'r' | 'br' | 'b' | 'tr' = 'r'
): string {
  return `bg-gradient-to-${direction} ${gradients[gradient]}`;
}

// ============================================================================
// Badge Styles - Estilos de badges consistentes
// ============================================================================

export const badgeStyles = {
  /** Badge estándar */
  base: 'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
  /** Badge pill */
  pill: 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  /** Badge pequeño */
  sm: 'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium',
} as const;

// ============================================================================
// Image Styles - Estilos para imágenes consistentes
// ============================================================================

export const imageStyles = {
  /** Contenedor de imagen estándar */
  container: 'relative overflow-hidden rounded-sm',
  /** Imagen con aspect ratio 4:3 */
  aspect43: 'aspect-[4/3]',
  /** Imagen con aspect ratio cuadrado */
  aspectSquare: 'aspect-square',
  /** Imagen con efecto hover */
  hover: 'transition-transform duration-700 ease-out group-hover:scale-105',
} as const;

// ============================================================================
// Helper Functions - Funciones para combinar estilos
// ============================================================================

/**
 * Combina estilos de card con variantes
 */
export function getCardClassName(
  variant: keyof typeof cardStyles = 'base',
  additionalClasses?: string
): string {
  return `${cardStyles[variant]} ${additionalClasses || ''}`.trim();
}

/**
 * Combina estilos de badge
 */
export function getBadgeClassName(
  variant: keyof typeof badgeStyles = 'base',
  colorClass?: string,
  additionalClasses?: string
): string {
  const base = badgeStyles[variant];
  return `${base} ${colorClass || ''} ${additionalClasses || ''}`.trim();
}
