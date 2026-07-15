'use client';

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { PendingDecision, DecisionRecommendation } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';

// ============================================================================
// Recommendation Badge Config
// ============================================================================

const RECOMMENDATION_STYLES: Record<
  DecisionRecommendation,
  { labelKey: string; bg: string; text: string; border: string }
> = {
  recommended: {
    labelKey: 'beta.decisions.recommended',
    bg: 'bg-success-soft',
    text: 'text-success',
    border: 'border-success/30 border-success/40',
  },
  neutral: {
    labelKey: 'beta.decisions.neutral',
    bg: 'bg-neutral-50 dark:bg-neutral-500/10',
    text: 'text-neutral-600 dark:text-neutral-400',
    border: 'border-neutral-200 dark:border-neutral-500/30',
  },
  not_recommended: {
    labelKey: 'beta.decisions.notRecommended',
    bg: 'bg-danger-soft',
    text: 'text-danger',
    border: 'border-danger/30 border-danger/40',
  },
};

// ============================================================================
// Border Color Map (matches AgentResultCard pattern)
// ============================================================================

const BORDER_LEFT_COLORS: Record<string, string> = {
  emerald: 'border-l-success',
  blue: 'border-l-primary',
  amber: 'border-l-warning',
  purple: 'border-l-border-strong',
  pink: 'border-l-border-strong',
  indigo: 'border-l-primary',
};

const CATEGORY_BG: Record<string, string> = {
  emerald: 'bg-success-soft text-success',
  blue: 'bg-primary-soft text-primary',
  amber: 'bg-warning-soft text-warning',
  purple: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
  pink: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
  indigo: 'bg-primary-soft text-primary',
};

// ============================================================================
// Component
// ============================================================================

interface DecisionCardProps {
  decision: PendingDecision;
  /** Called when user selects an option. Omit for read-only state. */
  onSelect?: (optionId: string) => void;
  className?: string;
}

/**
 * DecisionCard - Inline decision card with 2-4 selectable options.
 *
 * Interactive state: options are clickable, recommendation badges shown.
 * Read-only state (selectedOptionId set): chosen option highlighted with checkmark,
 * non-selected options dimmed, "Decidido" timestamp shown.
 */
export function DecisionCard({ decision, onSelect, className }: DecisionCardProps) {
  const { t } = useI18n();
  const isResolved = !!decision.selectedOptionId;
  const meta = AGENT_METADATA[decision.category];
  const borderColor = BORDER_LEFT_COLORS[meta.color] ?? BORDER_LEFT_COLORS.blue;
  const categoryBg = CATEGORY_BG[meta.color] ?? CATEGORY_BG.blue;

  return (
    <div
      className={cn(
        'ml-9',
        'border border-neutral-200/60 dark:border-border/50',
        'border-l-[3px]',
        borderColor,
        'rounded-md overflow-hidden',
        'bg-white/80 dark:bg-card/80',
        'transition-all duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-foreground flex-1">
            {decision.title}
          </h4>
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded',
              categoryBg
            )}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {decision.description}
        </p>
      </div>

      {/* Options */}
      <div className="px-3.5 pb-3 space-y-1.5">
        {decision.options.map((option) => {
          const isSelected = decision.selectedOptionId === option.id;
          const isNotSelected = isResolved && !isSelected;
          const recConfig = RECOMMENDATION_STYLES[option.recommendation];

          return (
            <button
              key={option.id}
              type="button"
              disabled={isResolved}
              onClick={() => onSelect?.(option.id)}
              aria-label={`${t('beta.decisions.select')}: ${option.label}`}
              className={cn(
                'w-full text-left rounded-sm border px-3 py-2',
                'transition-all duration-200',
                // Interactive state
                !isResolved && [
                  'border-neutral-200 dark:border-border/60',
                  'hover:border-neutral-300 dark:hover:border-border',
                  'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30',
                  'cursor-pointer',
                ],
                // Selected state
                isSelected && [
                  'border-success/30 border-success/40',
                  'bg-success-soft',
                  'ring-1 ring-success/20',
                ],
                // Non-selected (dimmed) state
                isNotSelected && [
                  'border-neutral-100 dark:border-border/30',
                  'opacity-50',
                  'cursor-default',
                ]
              )}
            >
              <div className="flex items-start gap-2">
                {/* Checkmark for selected option */}
                {isSelected && (
                  <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-success flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" weight="bold" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {option.label}
                    </span>
                    {/* Recommendation badge */}
                    {!isNotSelected && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border',
                          recConfig.bg,
                          recConfig.text,
                          recConfig.border
                        )}
                      >
                        {t(recConfig.labelKey)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Decided timestamp */}
      {isResolved && decision.selectedAt && (
        <div className="px-3.5 pb-2.5 -mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {t('beta.decisions.decided')} {decision.selectedAt.toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
