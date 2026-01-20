'use client';

import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types/risk-score';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/lib/constants/risk-levels';

// ============================================================================
// Types
// ============================================================================

export interface LevelBadgeProps {
  /** Risk level grade (A, B, C, or D) */
  level: RiskLevel;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the label below the badge */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Size Configuration
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    container: 'w-6 h-6',
    text: 'text-xs font-bold',
    label: 'text-[10px]',
    gap: 'gap-0.5',
  },
  md: {
    container: 'w-8 h-8',
    text: 'text-sm font-bold',
    label: 'text-xs',
    gap: 'gap-1',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-xl font-bold',
    label: 'text-sm font-medium',
    gap: 'gap-1.5',
  },
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * LevelBadge - Visual badge displaying risk level (A/B/C/D)
 *
 * Design specs from PLAN-02:
 * - Size sm: 24x24px circle, level letter only
 * - Size md: 32x32px circle with optional label below
 * - Size lg: 48x48px circle with label, used in detail views
 *
 * Colors follow Luxterra muted palette:
 * - A: emerald (excellent)
 * - B: blue (good)
 * - C: amber (regular)
 * - D: red (risky)
 */
export function LevelBadge({
  level,
  size = 'md',
  showLabel = false,
  className,
}: LevelBadgeProps) {
  const colors = RISK_LEVEL_COLORS[level];
  const label = RISK_LEVEL_LABELS[level];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center',
        sizeConfig.gap,
        className
      )}
    >
      {/* Badge circle */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full border',
          sizeConfig.container,
          colors.bgLight,
          colors.border,
          colors.text
        )}
        role="img"
        aria-label={`Nivel de riesgo: ${label}`}
      >
        <span className={sizeConfig.text}>{level}</span>
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className={cn(sizeConfig.label, colors.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
