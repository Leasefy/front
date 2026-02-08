'use client';

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
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency, getCobroStatusColor } from '@/lib/types/inmobiliaria';

interface CobroCardProps {
  cobro: Cobro;
  onClick?: (cobro: Cobro) => void;
  onRegisterPayment?: (cobro: Cobro) => void;
  compact?: boolean;
}

// Status labels in Spanish
const STATUS_LABELS: Record<CobroStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  late: 'En mora',
  defaulted: 'Incobrable',
};

// Status border colors for left accent
const STATUS_BORDER_COLORS: Record<CobroStatus, string> = {
  pending: 'border-l-amber-500',
  paid: 'border-l-emerald-500',
  partial: 'border-l-blue-500',
  late: 'border-l-orange-500',
  defaulted: 'border-l-red-500',
};

/**
 * Format month string (2026-02) to Spanish display (Febrero 2026)
 */
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
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
          'w-full flex items-center gap-4 p-4 rounded-xl border-l-4 border bg-white dark:bg-[#1a1a1c] border-neutral-200 dark:border-neutral-700 cursor-pointer transition-all duration-200 hover:shadow-md',
          borderColor
        )}
      >
        {/* Property */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {cobro.propertyTitle}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {cobro.tenantName} · {formatMonth(cobro.month)}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="font-semibold text-neutral-900 dark:text-white text-sm">
            {formatCurrency(cobro.totalAmount)}
          </p>
          {cobro.status === 'partial' && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {formatCurrency(cobro.paidAmount)} pagado
            </p>
          )}
        </div>

        {/* Status badge */}
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', statusColor)}>
          {statusLabel}
        </span>

        {/* Days late indicator */}
        {cobro.daysLate > 0 && (
          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 shrink-0">
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
        'w-full rounded-2xl border-l-4 border bg-white dark:bg-[#1a1a1c] overflow-hidden transition-all duration-200 group hover:shadow-lg',
        borderColor,
        'border-neutral-200 dark:border-neutral-700',
        onClick && 'cursor-pointer'
      )}
      onClick={() => onClick?.(cobro)}
    >
      {/* Header Section */}
      <div className="p-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <HouseLine className="w-4 h-4 text-neutral-400 shrink-0" />
              <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                {cobro.propertyTitle}
              </h3>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
              {formatMonth(cobro.month)}
            </p>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', statusColor)}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Tenant Section */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-900 dark:text-white truncate">
              {cobro.tenantName}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <a
                href={`tel:${cobro.tenantPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {cobro.tenantPhone}
              </a>
              <a
                href={`https://wa.me/${cobro.tenantPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <WhatsappLogo className="w-4 h-4" weight="fill" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 space-y-3">
        {/* Total Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Total</span>
          <span className="text-xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(cobro.totalWithFees)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
            <span>Canon + Admin</span>
            <span>{formatCurrency(cobro.totalAmount)}</span>
          </div>
          {cobro.lateFee > 0 && (
            <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
              <span>Interés mora</span>
              <span>+ {formatCurrency(cobro.lateFee)}</span>
            </div>
          )}
          {cobro.status === 'partial' && (
            <>
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Pagado</span>
                <span>- {formatCurrency(cobro.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-neutral-900 dark:text-white pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <span>Pendiente</span>
                <span>{formatCurrency(cobro.pendingAmount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Section */}
      <div className="px-5 py-4 bg-neutral-50 dark:bg-[#141416] space-y-2">
        {/* Due Date */}
        <div className="flex items-center gap-2 text-sm">
          <CalendarBlank className="w-4 h-4 text-neutral-400" />
          <span className="text-neutral-500 dark:text-neutral-400">Vence:</span>
          <span className="text-neutral-700 dark:text-neutral-300">
            {new Date(cobro.dueDate).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Late indicator */}
        {cobro.daysLate > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Warning className="w-4 h-4" weight="fill" />
            <span className="font-medium">{cobro.daysLate} días de mora</span>
          </div>
        )}

        {/* Paid date */}
        {cobro.status === 'paid' && cobro.paidDate && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>Pagado el {new Date(cobro.paidDate).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
            })}</span>
          </div>
        )}

        {/* Reminders sent */}
        {cobro.remindersSent > 0 && (
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Bell className="w-4 h-4" />
            <span>{cobro.remindersSent} recordatorio{cobro.remindersSent > 1 ? 's' : ''} enviado{cobro.remindersSent > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
        {cobro.status !== 'paid' && onRegisterPayment && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegisterPayment(cobro);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            <CurrencyCircleDollar className="w-4 h-4" />
            Registrar pago
          </button>
        )}
        {cobro.status === 'paid' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>Pago completo</span>
          </div>
        )}
        {onClick && (
          <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-indigo-500 transition-colors ml-auto">
            Ver detalle
            <CaretRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default CobroCard;
