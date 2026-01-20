'use client';

import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types/risk-score';
import { RISK_LEVEL_COLORS } from '@/lib/constants/risk-levels';

// ============================================================================
// Types
// ============================================================================

export interface AISnippetProps {
  /** Full AI explanation text */
  explanation: string;
  /** Risk level for styling */
  level: RiskLevel;
  /** Maximum characters to display (default 150) */
  maxLength?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate text to first 2 sentences or maxLength, whichever is shorter
 */
function truncateExplanation(text: string, maxLength: number): string {
  if (!text) return '';

  // Split by sentence endings (. ? !)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Take first 2 sentences
  let truncated = sentences.slice(0, 2).join(' ').trim();

  // If still too long, truncate by maxLength
  if (truncated.length > maxLength) {
    truncated = truncated.substring(0, maxLength);
    // Find last complete word
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      truncated = truncated.substring(0, lastSpace);
    }
    truncated = truncated.replace(/[,;:\s]+$/, '') + '...';
  }

  return truncated;
}

/**
 * Get muted styling for lower risk levels
 */
function getSnippetStyles(level: RiskLevel) {
  const colors = RISK_LEVEL_COLORS[level];

  // A and B get their color accent, C and D are muted
  if (level === 'A' || level === 'B') {
    return {
      border: colors.border,
      bg: colors.bgMuted,
      text: 'text-slate-700',
      icon: colors.text,
    };
  }

  // C and D are muted for less visual prominence
  return {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    icon: 'text-slate-400',
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * AISnippet - Truncated AI explanation for card views
 *
 * Shows first 2 sentences or maxLength of the AI explanation.
 * Level A/B candidates get colored styling, C/D are muted.
 */
export function AISnippet({
  explanation,
  level,
  maxLength = 150,
  className,
}: AISnippetProps) {
  const truncated = truncateExplanation(explanation, maxLength);
  const styles = getSnippetStyles(level);

  if (!truncated) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        styles.border,
        styles.bg,
        className
      )}
    >
      <div className="flex items-start gap-2">
        {/* AI Icon */}
        <svg
          className={cn('h-4 w-4 flex-shrink-0 mt-0.5', styles.icon)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
          />
        </svg>

        {/* Truncated Text */}
        <p className={cn('text-sm leading-relaxed', styles.text)}>
          {truncated}
        </p>
      </div>
    </div>
  );
}
