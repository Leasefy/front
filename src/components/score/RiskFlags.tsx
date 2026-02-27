'use client';

import { Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { RiskFlag } from '@/lib/types/risk-score';

// ============================================================================
// TextTs
// ============================================================================

export interface RiskFlagsProps {
  /** List of risk flags to display */
  flags: RiskFlag[];
  /** Enable fade-in animation */
  animate?: boolean;
  /** Delay before animation starts (in ms) */
  animationDelay?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Severity Styling
// ============================================================================

/**
 * Styling for different severity levels
 * Note: We use muted, professional colors to avoid being alarmist
 * The tone is "things to consider" not "RED FLAGS"
 */
const SEVERITY_STYLES = {
  low: {
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  medium: {
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },
  high: {
    dot: 'bg-rose-400',
    text: 'text-rose-700',
    icon: 'text-rose-500',
  },
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * RiskFlags - Display warnings and areas of concern subtly
 *
 * Shows risk flags with a professional, non-alarmist tone. The design
 * emphasizes helpfulness over alarming the user.
 *
 * Design:
 * - Warning icon (⚠) with muted colors
 * - Severity indicated by subtle color variations
 * - Suggestions shown as helpful tips
 * - Tone: "Things to consider" not "RED FLAGS"
 *
 * Severity styling:
 * - low: Gray text, subtle (minor consideration)
 * - medium: Amber text, visible but not alarming (should review)
 * - high: Rose text, noticeable but still professional (important to address)
 *
 * @example
 * ```tsx
 * <RiskFlags
 *   flags={[
 *     {
 *       id: 'flag-1',
 *       severity: 'medium',
 *       message: 'Ratio de obligaciones algo elevado (27%)',
 *       suggestion: 'Verificar estado de obligaciones actuales',
 *     },
 *   ]}
 *   animate
 * />
 * ```
 */
export function RiskFlags({
  flags,
  animate = false,
  animationDelay = 0,
  className,
}: RiskFlagsProps) {
  if (flags.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'transition-opacity duration-300',
        animate && 'animate-fade-in',
        className
      )}
      style={animate ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Warning className="h-4 w-4 text-amber-500" />
        <h4 className="text-sm font-medium text-foreground">Aspectos a considerar</h4>
      </div>

      {/* Flags List */}
      <ul className="space-y-3 pl-6">
        {flags.map((flag, index) => {
          const styles = SEVERITY_STYLES[flag.severity];

          return (
            <li
              key={flag.id}
              className={cn(
                'text-sm',
                animate && 'animate-fade-in-up'
              )}
              style={
                animate
                  ? { animationDelay: `${animationDelay + (index + 1) * 100}ms` }
                  : undefined
              }
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0',
                    styles.dot
                  )}
                />
                <div className="flex flex-col gap-1">
                  <span className={cn('text-muted-foreground', styles.text)}>
                    {flag.message}
                  </span>
                  {flag.suggestion && (
                    <span className="text-xs text-muted-foreground/80 italic">
                      {flag.suggestion}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
