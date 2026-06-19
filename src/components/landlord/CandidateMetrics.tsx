'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

// ============================================================================
// TextTs
// ============================================================================

export interface CandidateMetricsProps {
  /** Monthly income in COP */
  income: number;
  /** Time at current job in months */
  employmentMonths: number;
  /** Rental history indicator */
  historyRating: 'positive' | 'mixed' | 'limited';
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format employment tenure as human-readable text
 */
function formatEmploymentTenure(months: number): string {
  if (months >= 24) {
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'año' : 'años'} estable`;
  }
  if (months >= 12) {
    return '1 año estable';
  }
  if (months >= 6) {
    return `${months} meses`;
  }
  return 'Reciente';
}

/**
 * Format income for compact display
 */
function formatCompactIncome(income: number): string {
  if (income >= 1000000) {
    const millions = income / 1000000;
    return `$${millions.toFixed(1).replace('.0', '')}M/mes`;
  }
  return formatCurrency(income) + '/mes';
}

/**
 * Get history indicator config
 */
function getHistoryConfig(rating: 'positive' | 'mixed' | 'limited') {
  const configs = {
    positive: {
      icon: '\u2713', // Checkmark
      label: 'Buen historial',
      color: 'text-[#2C7A53]',
      bgColor: 'bg-[#E8F3EC]',
    },
    mixed: {
      icon: '~',
      label: 'Hist. mixto',
      color: 'text-[#B7791F]',
      bgColor: 'bg-[#F8F0E0]',
    },
    limited: {
      icon: '?',
      label: 'Sin historial',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  };
  return configs[rating];
}

// ============================================================================
// Component
// ============================================================================

/**
 * CandidateMetrics - Display key candidate metrics for quick scanning
 *
 * Compact variant: icon + abbreviated value, all in one row
 * Full variant: icon + label + full value, stacked layout
 */
export function CandidateMetrics({
  income,
  employmentMonths,
  historyRating,
  variant = 'compact',
  className,
}: CandidateMetricsProps) {
  const historyConfig = getHistoryConfig(historyRating);

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-2 text-sm',
          className
        )}
      >
        {/* Income */}
        <div className="flex items-center gap-1.5">
          <span className="text-base" role="img" aria-label="Ingresos">
            {'\u{1F4B0}'}
          </span>
          <span className="font-medium text-foreground">
            {formatCompactIncome(income)}
          </span>
        </div>

        {/* Divider */}
        <span className="text-muted-foreground">|</span>

        {/* Employment Stability */}
        <div className="flex items-center gap-1.5">
          <span className="text-base" role="img" aria-label="Estabilidad">
            {'\u{1F4C5}'}
          </span>
          <span className="text-muted-foreground">
            {formatEmploymentTenure(employmentMonths)}
          </span>
        </div>

        {/* Divider */}
        <span className="text-muted-foreground">|</span>

        {/* History Rating */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
              historyConfig.bgColor,
              historyConfig.color
            )}
          >
            {historyConfig.icon}
          </span>
          <span className={historyConfig.color}>
            {historyConfig.label}
          </span>
        </div>
      </div>
    );
  }

  // Full variant - stacked layout
  return (
    <div className={cn('space-y-3', className)}>
      {/* Income */}
      <div className="flex items-center gap-3">
        <span className="text-lg" role="img" aria-label="Ingresos">
          {'\u{1F4B0}'}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Ingresos mensuales</p>
          <p className="font-semibold text-foreground">
            {formatCurrency(income)}
          </p>
        </div>
      </div>

      {/* Employment Stability */}
      <div className="flex items-center gap-3">
        <span className="text-lg" role="img" aria-label="Estabilidad laboral">
          {'\u{1F4C5}'}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Estabilidad laboral</p>
          <p className="font-medium text-foreground">
            {employmentMonths >= 12
              ? `${Math.floor(employmentMonths / 12)} ${Math.floor(employmentMonths / 12) === 1 ? 'año' : 'años'} en empleo actual`
              : `${employmentMonths} meses en empleo actual`}
          </p>
        </div>
      </div>

      {/* History Rating */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
            historyConfig.bgColor,
            historyConfig.color
          )}
        >
          {historyConfig.icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Historial de arriendo</p>
          <p className={cn('font-medium', historyConfig.color)}>
            {historyRating === 'positive'
              ? 'Referencias positivas'
              : historyRating === 'mixed'
              ? 'Referencias mixtas'
              : 'Sin historial previo'}
          </p>
        </div>
      </div>
    </div>
  );
}
