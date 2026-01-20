'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { LevelBadge } from './LevelBadge';
import type { RiskScore } from '@/lib/types/risk-score';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/lib/constants/risk-levels';

// ============================================================================
// Types
// ============================================================================

export interface ScoreCardProps {
  /** Complete risk score data */
  score: RiskScore;
  /** Optional candidate name for context */
  candidateName?: string;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ScoreCard - Main score display card with badge and key drivers
 *
 * Layouts from PLAN-02:
 *
 * Compact:
 * ┌─────────────────────────────────┐
 * │  [A]  Score: 92/100             │
 * │       Excelente                  │
 * └─────────────────────────────────┘
 *
 * Full:
 * ┌─────────────────────────────────┐
 * │       [A]                        │
 * │   Score: 92/100                  │
 * │    Excelente                     │
 * │                                  │
 * │  ✓ Ingresos estables            │
 * │  ✓ 3+ años estabilidad laboral   │
 * │  ✓ Historial de pagos positivo   │
 * └─────────────────────────────────┘
 *
 * Design specs:
 * - Card with subtle border, rounded-sm (Luxterra)
 * - Badge centered or left-aligned depending on variant
 * - Quick drivers as checkmarks
 * - Subtle background matching level color
 */
export function ScoreCard({
  score,
  candidateName,
  variant = 'compact',
  className,
}: ScoreCardProps) {
  const colors = RISK_LEVEL_COLORS[score.level];
  const label = RISK_LEVEL_LABELS[score.level];

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'p-4 transition-colors',
          colors.bgMuted,
          colors.border,
          'border',
          className
        )}
      >
        <div className="flex items-center gap-4">
          <LevelBadge level={score.level} size="md" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              Score: <span className="font-semibold text-foreground">{score.numericScore}/100</span>
            </span>
            <span className={cn('text-sm font-medium', colors.text)}>
              {label}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // Full variant
  return (
    <Card
      className={cn(
        'p-6 transition-colors',
        colors.bgMuted,
        colors.border,
        'border',
        className
      )}
    >
      {/* Header with badge and score */}
      <div className="flex flex-col items-center text-center mb-6">
        <LevelBadge level={score.level} size="lg" />
        <div className="mt-3">
          <div className="text-2xl font-semibold text-foreground">
            {score.numericScore}
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
          <div className={cn('text-sm font-medium mt-1', colors.text)}>
            {label}
          </div>
          {candidateName && (
            <div className="text-xs text-muted-foreground mt-2">
              {candidateName}
            </div>
          )}
        </div>
      </div>

      {/* Key drivers */}
      {score.drivers.length > 0 && (
        <div className="border-t border-border/50 pt-4">
          <ul className="space-y-2">
            {score.drivers.slice(0, 4).map((driver, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className={cn('h-4 w-4 mt-0.5 shrink-0', colors.textLight)} />
                <span className="text-muted-foreground">{driver}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
