'use client';

import { Lightbulb } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { SuggestedCondition } from '@/lib/types/risk-score';

// ============================================================================
// TextTs
// ============================================================================

export interface SuggestedConditionsProps {
  /** List of suggested conditions for the landlord */
  conditions: SuggestedCondition[];
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
 * SuggestedConditions - Display recommended lease conditions
 *
 * Shows actionable recommendations for the landlord with a helpful,
 * advisory tone. Uses lightbulb icon to indicate suggestions.
 *
 * Design:
 * - Lightbulb icon (💡) indicating helpful suggestion
 * - Condition text as main content
 * - Reason shown in smaller text below
 * - Subtle background for each suggestion
 * - Actionable language: "Considere solicitar..." not "Debe requerir..."
 *
 * Examples:
 * - "Solicitar copia de contrato laboral vigente"
 * - "Verificar referencias del arrendador anterior"
 * - "Considerar depósito adicional de seguridad"
 *
 * @example
 * ```tsx
 * <SuggestedConditions
 *   conditions={[
 *     {
 *       id: 'cond-1',
 *       condition: 'Solicitar depósito de 2 meses',
 *       reason: 'Mitigar variabilidad de ingresos',
 *     },
 *   ]}
 *   animate
 * />
 * ```
 */
export function SuggestedConditions({
  conditions,
  animate = false,
  animationDelay = 0,
  className,
}: SuggestedConditionsProps) {
  if (conditions.length === 0) {
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
        <Lightbulb className="h-4 w-4 text-warning" />
        <h4 className="text-sm font-medium text-fg">Recomendaciones</h4>
      </div>

      {/* Conditions List */}
      <ul className="space-y-2 pl-6">
        {conditions.map((condition, index) => (
          <li
            key={condition.id}
            className={cn(
              'rounded-[14px] bg-surface-muted p-3 text-sm',
              animate && 'animate-fade-in-up'
            )}
            style={
              animate
                ? { animationDelay: `${animationDelay + (index + 1) * 100}ms` }
                : undefined
            }
          >
            <p className="text-fg font-medium">{condition.condition}</p>
            <p className="text-xs text-fg-subtle mt-1">{condition.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
