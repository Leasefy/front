'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bank,
  Buildings,
  CheckCircle,
  Warning,
  CurrencyCircleDollar,
  CalendarBlank,
  CaretRight,
  CaretDown,
  Receipt,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';
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
  pending: 'border-l-warning',
  processing: 'border-l-primary',
  completed: 'border-l-success',
  failed: 'border-l-danger',
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
          'w-full flex items-center gap-4 p-4 rounded-xl border-l-4 border bg-surface dark:bg-card border-border dark:border-border-strong cursor-pointer transition-all duration-200 hover:',
          borderColor
        )}
      >
        {/* Propietario */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg dark:text-white truncate text-sm">
            {dispersion.propietarioName}
          </p>
          <p className="text-xs text-fg-muted dark:text-fg-subtle truncate capitalize">
            {formatMonth(dispersion.month)} · {dispersion.items.length}{' '}
            {dispersion.items.length === 1 ? 'propiedad' : 'propiedades'}
          </p>
        </div>

        {/* Net Amount */}
        <div className="text-right">
          <p className="font-bold text-success text-sm">
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
          <Spinner size="sm" className="shrink-0" />
        )}
      </motion.div>
    );
  }

  // Full card variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'w-full rounded-xl border-l-4 border bg-surface dark:bg-card overflow-hidden transition-all duration-200 group hover:',
        borderColor,
        'border-border dark:border-border-strong',
        onViewDetail && 'cursor-pointer'
      )}
      onClick={() => onViewDetail?.(dispersion)}
    >
      {/* Header Section */}
      <div className="p-5 pb-4 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-fg-subtle shrink-0" />
              <h3 className="font-semibold text-fg dark:text-white line-clamp-1">
                {dispersion.propietarioName}
              </h3>
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle capitalize">
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
              <Spinner size="xs" variant="current" />
            )}
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Bank Account Section */}
      <div className="px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <Bank className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-0.5">
              Cuenta de destino
            </p>
            <p className="font-medium text-fg dark:text-white truncate text-sm">
              {/* Sin cuenta se dice, no se inventa: es a dónde va la plata. */}
              {dispersion.propietarioBankAccount
                ? formatBankAccount(
                    dispersion.propietarioBankAccount.bank,
                    dispersion.propietarioBankAccount.accountType,
                    dispersion.propietarioBankAccount.accountNumber
                  )
                : 'No registrada'}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 space-y-3">
        {/* Net Amount - Prominent */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-muted dark:text-fg-subtle">
            Neto a dispersar
          </span>
          <span className="text-xl font-bold text-success">
            {formatCurrency(dispersion.netToPropietario)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-fg-muted dark:text-fg-subtle">
            <span>Total recaudado</span>
            <span>{formatCurrency(dispersion.totalCollected)}</span>
          </div>
          <div className="flex items-center justify-between text-warning">
            <span>Comision agencia</span>
            <span>- {formatCurrency(dispersion.totalCommission)}</span>
          </div>
        </div>
      </div>

      {/* Properties Summary */}
      <div className="px-5 py-4 bg-surface-muted dark:bg-muted/20">
        {/* allowlist: collapsible disclosure toggle (count + caret) driving a framer-motion height
            animation inside a clickable card — Cadence Accordion would replace the bespoke animation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowProperties(!showProperties);
          }}
          aria-expanded={showProperties}
          className="w-full flex items-center justify-between text-sm text-fg dark:text-fg-subtle hover:text-fg dark:hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Buildings className="w-4 h-4 text-fg-subtle" />
            <span>
              {dispersion.items.length}{' '}
              {dispersion.items.length === 1 ? 'propiedad' : 'propiedades'}{' '}
              incluidas
            </span>
          </div>
          <CaretDown
            className={cn(
              'w-4 h-4 text-fg-subtle transition-transform',
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
              <div className="mt-3 space-y-2 border-t border-border dark:border-border-strong pt-3">
                {dispersion.items.map((item) => (
                  <div
                    key={item.cobroId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-fg-muted dark:text-fg-subtle truncate max-w-[180px]">
                      {item.propertyTitle}
                    </span>
                    <span className="text-fg dark:text-white font-medium">
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
      <div className="px-5 py-4 border-t border-border-faint dark:border-border-strong space-y-2">
        {/* Completed: Show transfer info */}
        {dispersion.status === 'completed' &&
          dispersion.processedAt &&
          dispersion.transferReference && (
            <>
              <div className="flex items-center gap-2 text-sm text-success">
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
              <div className="flex items-center gap-2 text-sm text-fg-muted dark:text-fg-subtle">
                <Receipt className="w-4 h-4" />
                <span className="font-mono text-xs">
                  Ref: {dispersion.transferReference}
                </span>
              </div>
            </>
          )}

        {/* Processing: Show processing message */}
        {dispersion.status === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Spinner size="sm" variant="current" />
            <span>Procesando transferencia...</span>
          </div>
        )}

        {/* Pending: Show pending info */}
        {dispersion.status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-warning">
            <CalendarBlank className="w-4 h-4" />
            <span>Pendiente de procesamiento</span>
          </div>
        )}

        {/* Failed: Show error reason */}
        {dispersion.status === 'failed' && dispersion.failureReason && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <Warning className="w-4 h-4" weight="fill" />
            <span>{dispersion.failureReason}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-between border-t border-border-faint dark:border-border-strong">
        {dispersion.status === 'pending' && onProcess && (
          <Button
            size="sm"
            hideArrow
            onClick={(e) => {
              e.stopPropagation();
              onProcess(dispersion);
            }}
          >
            <PaperPlaneTilt className="w-4 h-4" />
            Procesar
          </Button>
        )}
        {dispersion.status === 'failed' && onProcess && (
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={(e) => {
              e.stopPropagation();
              onProcess(dispersion);
            }}
            className="text-warning border-warning/30"
          >
            <CurrencyCircleDollar className="w-4 h-4" />
            Reintentar
          </Button>
        )}
        {dispersion.status === 'completed' && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span>Dispersado</span>
          </div>
        )}
        {dispersion.status === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Spinner size="sm" variant="current" />
            <span>En proceso</span>
          </div>
        )}
        {onViewDetail && (
          <div className="flex items-center gap-1 text-sm text-fg-muted dark:text-fg-subtle group-hover:text-primary transition-colors ml-auto">
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
