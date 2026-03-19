'use client';

import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types/risk-score';
import { RISK_LEVEL_COLORS } from '@/lib/constants/risk-levels';

// ============================================================================
// TextTs
// ============================================================================

export interface ScoreProgressBarProps {
  /** Score value (0-100) */
  score: number;
  /** Risk level for color theming */
  level: RiskLevel;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show the numeric value */
  showValue?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Size Configuration
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    height: 'h-1',
    text: 'text-xs',
  },
  md: {
    height: 'h-2',
    text: 'text-sm',
  },
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * ScoreProgressBar - Visual progress bar for category scores
 *
 * Design from PLAN-02:
 * - Thin bar (4px height for sm, 8px for md)
 * - Color matches risk level
 * - Animated fill on mount
 * - Optional numeric value at end
 *
 * Example: ─────────────────[████████░░] 85
 */
export function ScoreProgressBar({
  score,
  level,
  size = 'md',
  showValue = false,
  className,
}: ScoreProgressBarProps) {
  const colors = RISK_LEVEL_COLORS[level];
  const sizeConfig = SIZE_CONFIG[size];

  // Clamp score to valid range
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Progress bar container */}
      <div
        className={cn(
          'relative flex-1 rounded-full bg-muted overflow-hidden',
          sizeConfig.height
        )}
        role="progressbar"
        aria-valuenow={clampedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Puntuacion: ${clampedScore} de 100`}
      >
        {/* Progress fill with animation */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
            colors.bg
          )}
          style={{ width: `${clampedScore}%` }}
        />
      </div>

      {/* Optional numeric value */}
      {showValue && (
        <span
          className={cn(
            'tabular-nums font-medium shrink-0',
            sizeConfig.text,
            colors.text
          )}
        >
          {clampedScore}
        </span>
      )}
    </div>
  );
}
