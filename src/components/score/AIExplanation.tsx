'use client';

import { Robot } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { RiskFlag, SuggestedCondition } from '@/lib/types/risk-score';
import { useTypingAnimation } from './useTypingAnimation';
import { KeyDrivers } from './KeyDrivers';
import { RiskFlags } from './RiskFlags';
import { SuggestedConditions } from './SuggestedConditions';
import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// TextTs
// ============================================================================

export interface AIExplanationProps {
  /** The AI-generated explanation text */
  explanation: string;
  /** Key positive factors driving the score */
  drivers: string[];
  /** Risk flags/warnings to display */
  flags: RiskFlag[];
  /** Suggested conditions for the landlord */
  suggestedConditions: SuggestedCondition[];
  /** Risk level for color theming */
  level: RiskLevel;
  /** Enable typing animation effect */
  animate?: boolean;
  /** Callback when typing animation completes */
  onAnimationComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AIExplanation - Conversational AI assessment display
 *
 * This is THE differentiator - the "asesor de confianza" narrative component.
 * The AI explanation should feel like a trusted advisor giving their professional
 * assessment, not a cold algorithm output.
 *
 * Layout:
 * ┌─────────────────────────────────────────────┐
 * │ 🤖 Analisis del Asesor                      │
 * │                                              │
 * │ "Basado en lo que veo, este candidato       │
 * │  tiene un perfil excelente. Su estabilidad  │
 * │  laboral de 3 años en la misma empresa..."  │
 * │                                              │
 * │ ────────────────────────────────────────────│
 * │                                              │
 * │ ✓ Puntos a favor:                           │
 * │   • Ingresos estables y verificables        │
 * │   • 3+ años en la misma empresa             │
 * │   • Historial de pagos positivo             │
 * │                                              │
 * │ ⚠ Aspectos a considerar:                    │
 * │   • Ratio de obligaciones algo elevado      │
 * │                                              │
 * │ 💡 Recomendaciones:                         │
 * │   • Solicitar copia de contrato laboral     │
 * │                                              │
 * └─────────────────────────────────────────────┘
 *
 * Tone: Warm, professional, trustworthy - like a knowledgeable advisor
 */
export function AIExplanation({
  explanation,
  drivers,
  flags,
  suggestedConditions,
  level,
  animate = false,
  onAnimationComplete,
  className,
}: AIExplanationProps) {
  const { displayText, isComplete } = useTypingAnimation({
    text: explanation,
    speed: animate ? 60 : Infinity, // chars per second, Infinity = instant
    delay: animate ? 300 : 0, // initial delay
    onComplete: onAnimationComplete,
    enabled: animate,
  });

  // Show sections only after explanation is complete (if animating)
  const showSections = !animate || isComplete;

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-sm bg-primary/10">
          <Robot className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">Analisis del Asesor</h3>
      </div>

      {/* Main Explanation Text */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          &ldquo;{displayText}&rdquo;
          {animate && !isComplete && (
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse" />
          )}
        </p>
      </div>

      {/* Sections - appear after explanation completes */}
      {showSections && (
        <div className="space-y-6">
          {/* Separator */}
          <div className="border-t border-border" />

          {/* Key Drivers - always show if there are any */}
          {drivers.length > 0 && (
            <KeyDrivers
              drivers={drivers}
              level={level}
              animate={animate}
              animationDelay={200}
            />
          )}

          {/* Risk Flags - only show if there are any */}
          {flags.length > 0 && (
            <RiskFlags
              flags={flags}
              animate={animate}
              animationDelay={400}
            />
          )}

          {/* Suggested Conditions - only show if there are any */}
          {suggestedConditions.length > 0 && (
            <SuggestedConditions
              conditions={suggestedConditions}
              animate={animate}
              animationDelay={600}
            />
          )}
        </div>
      )}
    </Card>
  );
}
