'use client';

import { useMemo } from 'react';
import { mesEnTitulo } from '@/lib/utils/mes';
import { motion } from 'framer-motion';
import {
  HouseLine,
  User,
  Phone,
  WhatsappLogo,
  Warning,
  CheckCircle,
  Clock,
  CurrencyCircleDollar,
  CalendarBlank,
  Bell,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency, getCobroStatusColor } from '@/lib/types/inmobiliaria';

interface CobroCardProps {
  cobro: Cobro;
  onClick?: (cobro: Cobro) => void;
  onRegisterPayment?: (cobro: Cobro) => void;
  compact?: boolean;
}

// Status border colors for left accent
const STATUS_BORDER_COLORS: Record<CobroStatus, string> = {
  pending: 'border-l-warning',
  paid: 'border-l-success',
  partial: 'border-l-primary',
  late: 'border-l-warning',
  defaulted: 'border-l-danger',
};

/**
 * Format month string (2026-02) to Spanish display (Febrero 2026)
 */
function formatMonth(month: string): string {
  return mesEnTitulo(month);
}

/**
 * CobroCard - Card for displaying individual cobro (collection) info
 * Shows property, tenant, amount, and status information
 */
export function CobroCard({
  cobro,
  onClick,
  onRegisterPayment,
  compact = false,
}: CobroCardProps) {
  const { t, locale } = useI18n();

  const STATUS_LABELS: Record<CobroStatus, string> = useMemo(() => ({
    pending: t('inmobiliaria.cobros.card.statusLabels.pending'),
    paid: t('inmobiliaria.cobros.card.statusLabels.paid'),
    partial: t('inmobiliaria.cobros.card.statusLabels.partial'),
    late: t('inmobiliaria.cobros.card.statusLabels.late'),
    defaulted: t('inmobiliaria.cobros.card.statusLabels.defaulted'),
  }), [t]);

  const statusColor = getCobroStatusColor(cobro.status);
  const statusLabel = STATUS_LABELS[cobro.status];
  const borderColor = STATUS_BORDER_COLORS[cobro.status];

  // Compact variant - single row for list views
  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => onClick?.(cobro)}
        className={cn(
          'w-full flex items-center gap-4 p-4 rounded-xl border-l-4 border bg-card border-border cursor-pointer transition-all duration-200 hover:shadow-sm',
          borderColor
        )}
      >
        {/* Property */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg truncate text-sm">
            {cobro.propertyTitle}
          </p>
          <p className="text-xs text-fg-muted truncate">
            {cobro.tenantName} · {formatMonth(cobro.month)}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="font-semibold text-fg text-sm font-mono tabular-nums">
            {formatCurrency(cobro.totalAmount)}
          </p>
          {cobro.status === 'partial' && (
            <p className="text-xs text-primary font-mono tabular-nums">
              {formatCurrency(cobro.paidAmount)} {t('inmobiliaria.cobros.card.paid')}
            </p>
          )}
        </div>

        {/* Status badge */}
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', statusColor)}>
          {statusLabel}
        </span>

        {/* Days late indicator */}
        {cobro.daysLate > 0 && (
          <div className="flex items-center gap-1 text-warning shrink-0">
            <Warning className="w-4 h-4" weight="fill" />
            <span className="text-xs font-medium">{cobro.daysLate}d</span>
          </div>
        )}
      </motion.div>
    );
  }

  // Full card variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'w-full rounded-xl border-l-4 border bg-card overflow-hidden transition-all duration-200 group',
        borderColor,
        'border-border',
        onClick && 'cursor-pointer'
      )}
      onClick={() => onClick?.(cobro)}
    >
      {/* Header Section */}
      <div className="p-5 pb-4 border-b border-border-faint">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <HouseLine className="w-4 h-4 text-fg-subtle shrink-0" />
              <h3 className="font-semibold text-fg line-clamp-1">
                {cobro.propertyTitle}
              </h3>
            </div>
            <p className="text-sm text-fg-muted">
              {formatMonth(cobro.month)}
            </p>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', statusColor)}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Tenant Section */}
      <div className="px-5 py-4 border-b border-border-faint">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-fg truncate">
              {cobro.tenantName}
            </p>
            {cobro.tenantPhone && (
              <div className="flex items-center gap-3 mt-1">
                <a
                  href={`tel:${cobro.tenantPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-fg-muted hover:text-primary transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {cobro.tenantPhone}
                </a>
                <a
                  href={`https://wa.me/${cobro.tenantPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md bg-success-soft text-success hover:bg-success/20 transition-colors"
                >
                  <WhatsappLogo className="w-4 h-4" weight="fill" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 space-y-3">
        {/* Total Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-muted">Total</span>
          <span className="text-xl font-bold text-fg font-mono tabular-nums">
            {formatCurrency(cobro.totalWithFees)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-fg-muted">
            <span>{t('inmobiliaria.cobros.card.canonAdmin')}</span>
            <span>{formatCurrency(cobro.totalAmount)}</span>
          </div>
          {cobro.lateFee > 0 && (
            <div className="flex items-center justify-between text-warning">
              <span>{t('inmobiliaria.cobros.card.lateFee')}</span>
              <span>+ {formatCurrency(cobro.lateFee)}</span>
            </div>
          )}
          {cobro.status === 'partial' && (
            <>
              <div className="flex items-center justify-between text-success">
                <span>{t('inmobiliaria.cobros.card.paidLabel')}</span>
                <span>- {formatCurrency(cobro.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-fg pt-1 border-t border-border-faint">
                <span>{t('inmobiliaria.cobros.card.pendingLabel')}</span>
                <span>{formatCurrency(cobro.pendingAmount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Section */}
      <div className="px-5 py-4 bg-surface-muted space-y-2">
        {/* Due Date */}
        <div className="flex items-center gap-2 text-sm">
          <CalendarBlank className="w-4 h-4 text-fg-subtle" />
          <span className="text-fg-muted">{t('inmobiliaria.cobros.card.dueDate')}</span>
          <span className="text-fg-muted font-mono tabular-nums">
            {new Date(cobro.dueDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Late indicator */}
        {cobro.daysLate > 0 && (
          <div className="flex items-center gap-2 text-sm text-warning">
            <Warning className="w-4 h-4" weight="fill" />
            <span className="font-medium">{t('inmobiliaria.cobros.card.daysLate', { count: cobro.daysLate })}</span>
          </div>
        )}

        {/* Paid date */}
        {cobro.status === 'paid' && cobro.paidDate && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>{t('inmobiliaria.cobros.card.paidOn', { date: new Date(cobro.paidDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
              day: 'numeric',
              month: 'short',
            }) })}</span>
          </div>
        )}

        {/* Reminders sent */}
        {cobro.remindersSent > 0 && (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Bell className="w-4 h-4" />
            <span>{cobro.remindersSent > 1 ? t('inmobiliaria.cobros.card.remindersSentPlural', { count: cobro.remindersSent }) : t('inmobiliaria.cobros.card.remindersSent', { count: cobro.remindersSent })}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-between border-t border-border-faint">
        {cobro.status !== 'paid' && onRegisterPayment && (
          <Button
            size="sm"
            hideArrow
            onClick={(e) => {
              e.stopPropagation();
              onRegisterPayment(cobro);
            }}
          >
            <CurrencyCircleDollar className="w-4 h-4" />
            {t('recibos.hacerCorto')}
          </Button>
        )}
        {cobro.status === 'paid' && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>{t('inmobiliaria.cobros.card.paymentComplete')}</span>
          </div>
        )}
        {onClick && (
          <div className="flex items-center gap-1 text-sm text-fg-muted group-hover:text-primary transition-colors ml-auto">
            {t('inmobiliaria.cobros.card.viewDetail')}
            <CaretRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default CobroCard;
