'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Warning, WarningCircle, Bell, ClockCountdown, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type MoraSeverity = 'warning' | 'critical' | 'severe';

interface MoraAlertProps {
  daysLate: number;
  lateFee: number;
  totalWithFees: number;
  onSendReminder?: () => void;
  onViewHistory?: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * Get severity based on days late
 * Warning: 1-15 days
 * Critical: 16-30 days
 * Severe: 30+ days
 */
function getSeverity(daysLate: number): MoraSeverity {
  if (daysLate > 30) return 'severe';
  if (daysLate > 15) return 'critical';
  return 'warning';
}

/**
 * Severity-based styling configuration
 */
const SEVERITY_STYLES: Record<
  MoraSeverity,
  {
    bg: string;
    border: string;
    icon: string;
    text: string;
    textSecondary: string;
    pulse: boolean;
  }
> = {
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
    textSecondary: 'text-amber-700 dark:text-amber-400',
    pulse: false,
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-300',
    textSecondary: 'text-red-700 dark:text-red-400',
    pulse: true,
  },
  severe: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    border: 'border-red-300 dark:border-red-700',
    icon: 'text-red-700 dark:text-red-300',
    text: 'text-red-900 dark:text-red-200',
    textSecondary: 'text-red-800 dark:text-red-300',
    pulse: true,
  },
};

/**
 * MoraAlert - Alert component for late payment indicators
 * Shows severity-based styling with days late and late fee info
 */
export function MoraAlert({
  daysLate,
  lateFee,
  totalWithFees,
  onSendReminder,
  onViewHistory,
  compact = false,
  className,
}: MoraAlertProps) {
  const { t } = useTranslation();

  // Don't render if not late
  if (daysLate <= 0) return null;

  const severity = getSeverity(daysLate);
  const styles = SEVERITY_STYLES[severity];

  // Compact mode for tables/cards
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          styles.bg,
          styles.text,
          className
        )}
      >
        {severity === 'severe' ? (
          <motion.div
            animate={styles.pulse ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <WarningCircle className={cn('w-3.5 h-3.5', styles.icon)} weight="fill" />
          </motion.div>
        ) : (
          <Warning className={cn('w-3.5 h-3.5', styles.icon)} weight="fill" />
        )}
        <span>{daysLate} {t('inmobiliaria.cobros.mora.daysCompact')}</span>
      </motion.div>
    );
  }

  // Full mode
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border',
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex gap-3">
        {/* Icon with optional pulse */}
        {severity === 'severe' ? (
          <motion.div
            animate={styles.pulse ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="shrink-0"
          >
            <WarningCircle className={cn('w-6 h-6', styles.icon)} weight="fill" />
          </motion.div>
        ) : severity === 'critical' ? (
          <motion.div
            animate={styles.pulse ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="shrink-0"
          >
            <Warning className={cn('w-6 h-6', styles.icon)} weight="fill" />
          </motion.div>
        ) : (
          <Warning className={cn('w-6 h-6 shrink-0', styles.icon)} weight="fill" />
        )}

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div>
            <h4 className={cn('text-sm font-semibold', styles.text)}>
              {severity === 'severe'
                ? t('inmobiliaria.cobros.mora.severeCritical')
                : severity === 'critical'
                ? t('inmobiliaria.cobros.mora.severityHigh')
                : t('inmobiliaria.cobros.mora.paymentOverdue')}
            </h4>
            <div className={cn('flex items-center gap-2 text-sm mt-1', styles.textSecondary)}>
              <ClockCountdown className="w-4 h-4" />
              <span className="font-medium">{daysLate} {t('inmobiliaria.cobros.mora.daysOverdue')}</span>
            </div>
          </div>

          {/* Fee Info */}
          <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-sm', styles.textSecondary)}>
            <div>
              <span className="opacity-75">{t('inmobiliaria.cobros.mora.interestLabel')}</span>
              <span className="font-semibold">+{formatCurrency(lateFee)}</span>
            </div>
            <div>
              <span className="opacity-75">{t('inmobiliaria.cobros.mora.totalLabel')}</span>
              <span className="font-semibold">{formatCurrency(totalWithFees)}</span>
            </div>
          </div>

          {/* Actions */}
          {(onSendReminder || onViewHistory) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {onSendReminder && (
                <button
                  onClick={onSendReminder}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg',
                    'bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30',
                    'border transition-colors',
                    styles.border,
                    styles.text
                  )}
                >
                  <Bell className="w-3.5 h-3.5" />
                  {t('inmobiliaria.cobros.mora.sendReminder')}
                </button>
              )}
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg',
                    'hover:underline transition-colors',
                    styles.textSecondary
                  )}
                >
                  {t('inmobiliaria.cobros.mora.viewHistory')}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * MoraAlertCompact - Compact variant exported separately
 * For use in table cells or small card areas
 */
export function MoraAlertCompact({
  daysLate,
  className,
}: {
  daysLate: number;
  className?: string;
}) {
  if (daysLate <= 0) return null;

  const severity = getSeverity(daysLate);
  const styles = SEVERITY_STYLES[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
        styles.bg,
        styles.text,
        className
      )}
    >
      <Warning className="w-3 h-3" weight="fill" />
      {daysLate}d
    </span>
  );
}

export default MoraAlert;
