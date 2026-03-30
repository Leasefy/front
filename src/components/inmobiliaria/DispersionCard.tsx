'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bank,
  Buildings,
  CheckCircle,
  Warning,
  SpinnerGap,
  CurrencyCircleDollar,
  CalendarBlank,
  CaretRight,
  CaretDown,
  Receipt,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Dispersion, DispersionStatus } from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getDispersionStatusColor,
  getDispersionStatusLabel,
} from '@/lib/types/inmobiliaria';

interface DispersionCardProps {
  dispersion: Dispersion;
  onViewDetail?: (dispersion: Dispersion) => void;
  onProcess?: (dispersion: Dispersion) => void;
  compact?: boolean;
}

// Status border colors for left accent
const STATUS_BORDER_COLORS: Record<DispersionStatus, string> = {
  pending: 'border-l-amber-500',
  processing: 'border-l-blue-500',
  completed: 'border-l-emerald-500',
  failed: 'border-l-red-500',
};

/**
 * Format month string (2026-02) to Spanish display (Febrero 2026)
 */
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

/**
 * Format bank account for display with partial masking
 */
function formatBankAccount(
  bank: string,
  accountType: string,
  accountNumber: string
): string {
  const bankLabels: Record<string, string> = {
    bancolombia: 'Bancolombia',
    davivienda: 'Davivienda',
    bbva: 'BBVA',
    bogota: 'Banco de Bogotá',
    occidente: 'Banco de Occidente',
    itau: 'Itaú',
    cajasocial: 'Caja Social',
    popular: 'Banco Popular',
  };
  const typeLabels: Record<string, string> = {
    savings: 'Ahorros',
    checking: 'Corriente',
  };

  const bankLabel = bankLabels[bank] || bank;
  const typeLabel = typeLabels[accountType] || accountType;
  return `${bankLabel} · ${typeLabel} ${accountNumber}`;
}

/**
 * DispersionCard - Card for displaying individual dispersion (disbursement) info
 * Shows propietario, amounts, status, and action buttons
 */
export function DispersionCard({
  dispersion,
  onViewDetail,
  onProcess,
  compact = false,
}: DispersionCardProps) {
  const [showProperties, setShowProperties] = useState(false);

  const statusColor = getDispersionStatusColor(dispersion.status);
  const statusLabel = getDispersionStatusLabel(dispersion.status);
  const borderColor = STATUS_BORDER_COLORS[dispersion.status];

  // Compact variant - single row for list views
  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => onViewDetail?.(dispersion)}
        className={cn(
          'w-full flex items-center gap-4 p-4 rounded-xl border-l-4 border bg-white dark:bg-[#1a1a1c] border-neutral-200 dark:border-neutral-700 cursor-pointer transition-all duration-200 hover:shadow-md',
          borderColor
        )}
      >
        {/* Propietario */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {dispersion.propietarioName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate capitalize">
            {formatMonth(dispersion.month)} · {dispersion.items.length}{' '}
            {dispersion.items.length === 1 ? 'propiedad' : 'propiedades'}
          </p>
        </div>

        {/* Net Amount */}
        <div className="text-right">
          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            {formatCurrency(dispersion.netToPropietario)}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
            statusColor
          )}
        >
          {statusLabel}
        </span>

        {/* Processing spinner */}
        {dispersion.status === 'processing' && (
          <SpinnerGap className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
        )}
      </motion.div>
    );
  }

  // Full card variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'w-full rounded-xl border-l-4 border bg-white dark:bg-[#1a1a1c] overflow-hidden transition-all duration-200 group hover:shadow-lg',
        borderColor,
        'border-neutral-200 dark:border-neutral-700',
        onViewDetail && 'cursor-pointer'
      )}
      onClick={() => onViewDetail?.(dispersion)}
    >
      {/* Header Section */}
      <div className="p-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-neutral-400 shrink-0" />
              <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                {dispersion.propietarioName}
              </h3>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
              {formatMonth(dispersion.month)}
            </p>
          </div>
          <span
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
              statusColor
            )}
          >
            {dispersion.status === 'processing' && (
              <SpinnerGap className="w-3 h-3 animate-spin" />
            )}
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Bank Account Section */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <Bank className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-0.5">
              Cuenta de destino
            </p>
            <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
              {formatBankAccount(
                dispersion.propietarioBankAccount.bank,
                dispersion.propietarioBankAccount.accountType,
                dispersion.propietarioBankAccount.accountNumber
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 space-y-3">
        {/* Net Amount - Prominent */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Neto a dispersar
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(dispersion.netToPropietario)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
            <span>Total recaudado</span>
            <span>{formatCurrency(dispersion.totalCollected)}</span>
          </div>
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span>Comision agencia</span>
            <span>- {formatCurrency(dispersion.totalCommission)}</span>
          </div>
        </div>
      </div>

      {/* Properties Summary */}
      <div className="px-5 py-4 bg-neutral-50 dark:bg-[#141416]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowProperties(!showProperties);
          }}
          className="w-full flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Buildings className="w-4 h-4 text-neutral-400" />
            <span>
              {dispersion.items.length}{' '}
              {dispersion.items.length === 1 ? 'propiedad' : 'propiedades'}{' '}
              incluidas
            </span>
          </div>
          <CaretDown
            className={cn(
              'w-4 h-4 text-neutral-400 transition-transform',
              showProperties && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {showProperties && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                {dispersion.items.map((item) => (
                  <div
                    key={item.cobroId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[180px]">
                      {item.propertyTitle}
                    </span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {formatCurrency(item.netAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Section */}
      <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
        {/* Completed: Show transfer info */}
        {dispersion.status === 'completed' &&
          dispersion.processedAt &&
          dispersion.transferReference && (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" weight="fill" />
                <span>
                  Procesado el{' '}
                  {new Date(dispersion.processedAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Receipt className="w-4 h-4" />
                <span className="font-mono text-xs">
                  Ref: {dispersion.transferReference}
                </span>
              </div>
            </>
          )}

        {/* Processing: Show processing message */}
        {dispersion.status === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <SpinnerGap className="w-4 h-4 animate-spin" />
            <span>Procesando transferencia...</span>
          </div>
        )}

        {/* Pending: Show pending info */}
        {dispersion.status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <CalendarBlank className="w-4 h-4" />
            <span>Pendiente de procesamiento</span>
          </div>
        )}

        {/* Failed: Show error reason */}
        {dispersion.status === 'failed' && dispersion.failureReason && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <Warning className="w-4 h-4" weight="fill" />
            <span>{dispersion.failureReason}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
        {dispersion.status === 'pending' && onProcess && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProcess(dispersion);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white uppercase tracking-wide font-mono text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <PaperPlaneTilt className="w-4 h-4" />
            Procesar
          </button>
        )}
        {dispersion.status === 'failed' && onProcess && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProcess(dispersion);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <CurrencyCircleDollar className="w-4 h-4" />
            Reintentar
          </button>
        )}
        {dispersion.status === 'completed' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>Dispersado</span>
          </div>
        )}
        {dispersion.status === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <SpinnerGap className="w-4 h-4 animate-spin" />
            <span>En proceso</span>
          </div>
        )}
        {onViewDetail && (
          <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-indigo-500 transition-colors ml-auto">
            Ver detalle
            <CaretRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * DispersionCardCompact - Compact variant export
 */
export function DispersionCardCompact(
  props: Omit<DispersionCardProps, 'compact'>
) {
  return <DispersionCard {...props} compact />;
}

export default DispersionCard;
