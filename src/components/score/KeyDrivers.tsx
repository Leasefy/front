'use client';

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { RISK_LEVEL_COLORS } from '@/lib/constants/risk-levels';
import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// TextTs
// ============================================================================

export interface KeyDriversProps {
  /** List of positive factors driving the score */
  drivers: string[];
  /** Risk level for color theming */
  level: RiskLevel;
  /** Enable fade-in animation */
  animate?: boolean;
  /** Delay before animation starts (in ms) */
  animationDelay?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * KeyDrivers - Display positive factors contributing to the risk score
 *
 * Shows the key strengths of the candidate's profile with checkmark icons
 * colored according to the risk level.
 *
 * Design:
 * - Checkmark icon (✓) with level color
 * - Each driver on its own line
 * - Stagger animation if animated (appear one by one)
 * - Consistent styling with the explanation component
 *
 * @example
 * ```tsx
 * <KeyDrivers
 *   drivers={[
 *     'Ingresos estables y verificables',
 *     '3+ años en la misma empresa',
 *     'Historial de pagos positivo',
 *   ]}
 *   level="A"
 *   animate
 * />
 * ```
 */
export function KeyDrivers({
  drivers,
  level,
  animate = false,
  animationDelay = 0,
  className,
}: KeyDriversProps) {
  const colors = RISK_LEVEL_COLORS[level];

  if (drivers.length === 0) {
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
        <Check className={cn('h-4 w-4', colors.text)} />
        <h4 className="text-sm font-medium text-fg">Puntos a favor</h4>
      </div>

      {/* Drivers List */}
      <ul className="space-y-2 pl-6">
        {drivers.map((driver, index) => (
          <li
            key={index}
            className={cn(
              'flex items-start gap-2 text-sm text-fg-muted',
              animate && 'animate-fade-in-up'
            )}
            style={
              animate
                ? { animationDelay: `${animationDelay + (index + 1) * 100}ms` }
                : undefined
            }
          >
            <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full shrink-0', colors.bg)} />
            <span>{driver}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
