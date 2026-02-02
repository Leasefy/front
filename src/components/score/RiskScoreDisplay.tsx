'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { LevelBadge } from './LevelBadge';
import { AIExplanation } from './AIExplanation';
import { CategoryBreakdown } from './CategoryBreakdown';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/lib/constants/risk-levels';
import type { Candidate } from '@/lib/types/candidate';

// ============================================================================
// Types
// ============================================================================

export interface RiskScoreDisplayProps {
  /** Full candidate data with risk score */
  candidate: Candidate;
  /** Enable animations for initial display */
  showAnimation?: boolean;
  /** Display variant */
  variant?: 'compact' | 'full' | 'embedded';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * RiskScoreDisplay - Full risk score assessment display
 *
 * Composite component combining all score display elements:
 * - Score badge with numeric value
 * - AI explanation with typing animation
 * - Key drivers (positive factors)
 * - Risk flags (areas of concern)
 * - Suggested conditions
 * - Category breakdown (collapsible)
 *
 * Variants:
 * - compact: Badge + short summary only
 * - full: Complete display with all sections
 * - embedded: For use within other pages (no outer border)
 *
 * Animation Sequence (when showAnimation=true):
 * 1. Score badge appears (scale animation)
 * 2. Short delay
 * 3. AI explanation starts typing
 * 4. On explanation complete, key drivers fade in (staggered)
 * 5. Risk flags fade in (if any)
 * 6. Suggested conditions fade in (if any)
 * 7. Category breakdown accordion becomes visible
 *
 * Layout (full variant):
 * ┌─────────────────────────────────────────────┐
 * │ ┌─────┐                                     │
 * │ │  A  │  Score: 92/100 - Excelente          │
 * │ └─────┘                                     │
 * │                                              │
 * │ 🤖 Analisis del Asesor                      │
 * │ ─────────────────────────────────           │
 * │ [AI Explanation with typing animation]       │
 * │                                              │
 * │ ✓ Puntos a favor                            │
 * │ [Key Drivers]                               │
 * │                                              │
 * │ ⚠ Aspectos a considerar                     │
 * │ [Risk Flags]                                │
 * │                                              │
 * │ 💡 Recomendaciones                          │
 * │ [Suggested Conditions]                      │
 * │                                              │
 * │ ▼ Ver desglose por categoria               │
 * │ [CategoryBreakdown - collapsed]             │
 * └─────────────────────────────────────────────┘
 */
export function RiskScoreDisplay({
  candidate,
  showAnimation = false,
  variant = 'full',
  className,
}: RiskScoreDisplayProps) {
  const { riskScore } = candidate;
  const colors = RISK_LEVEL_COLORS[riskScore.level];
  const label = RISK_LEVEL_LABELS[riskScore.level];

  // State for animation sequencing
  const [explanationComplete, setExplanationComplete] = useState(!showAnimation);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Handle explanation animation completion
  const handleExplanationComplete = () => {
    setExplanationComplete(true);
  };

  // -------------------------------------------------------------------------
  // Compact Variant
  // -------------------------------------------------------------------------
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
          <LevelBadge
            level={riskScore.level}
            size="md"
            className={showAnimation ? 'animate-scale-in' : ''}
          />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              Score:{' '}
              <span className="font-semibold text-foreground">
                {riskScore.numericScore}/100
              </span>
            </span>
            <span className={cn('text-sm font-medium', colors.text)}>{label}</span>
          </div>
        </div>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Full & Embedded Variants
  // -------------------------------------------------------------------------
  const isEmbedded = variant === 'embedded';

  const Wrapper = isEmbedded ? 'div' : Card;
  const wrapperProps = isEmbedded
    ? { className: cn('space-y-6', className), 'aria-live': 'polite' as const }
    : { className: cn('p-6 space-y-6', className), 'aria-live': 'polite' as const };

  return (
    <Wrapper {...wrapperProps}>
      {/* Header: Badge + Score + Label - Only show for non-embedded */}
      {!isEmbedded && (
        <div
          className={cn(
            'flex items-center gap-4 pb-6 border-b border-border',
            showAnimation && 'animate-fade-in'
          )}
        >
          <LevelBadge
            level={riskScore.level}
            size="lg"
            className={showAnimation ? 'animate-scale-in' : ''}
          />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {riskScore.numericScore}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <span className={cn('text-sm font-medium', colors.text)}>{label}</span>
            <span className="text-xs text-muted-foreground mt-1">{candidate.fullName}</span>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      <AIExplanation
        explanation={riskScore.aiExplanation}
        drivers={riskScore.drivers}
        flags={riskScore.flags}
        suggestedConditions={riskScore.suggestedConditions}
        level={riskScore.level}
        animate={showAnimation}
        onAnimationComplete={handleExplanationComplete}
        className="border-0 shadow-none p-0"
      />

      {/* Category Breakdown (collapsible) */}
      {explanationComplete && (
        <div
          className={cn(
            'pt-4 border-t border-border',
            showAnimation && 'animate-fade-in'
          )}
          style={showAnimation ? { animationDelay: '800ms' } : undefined}
        >
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            aria-expanded={showBreakdown}
            className={cn(
              'flex items-center gap-2 text-sm text-muted-foreground',
              'hover:text-foreground transition-colors w-full'
            )}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                showBreakdown && 'rotate-180'
              )}
            />
            <span>{showBreakdown ? 'Ocultar desglose' : 'Ver desglose por categoria'}</span>
          </button>

          {showBreakdown && (
            <div className="mt-4 animate-fade-in">
              <CategoryBreakdown
                categories={riskScore.categories}
                defaultExpanded
              />
            </div>
          )}
        </div>
      )}
    </Wrapper>
  );
}
