'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretDown,
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  DoorOpen,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DispersionItem, Consignacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface ComisionDesgloseProps {
  items: DispersionItem[];
  variant?: 'full' | 'compact';
  showPercentages?: boolean;
  className?: string;
}

/**
 * Get icon for property type based on title keywords
 */
function getPropertyTypeIcon(title: string) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('casa')) return House;
  if (lowerTitle.includes('local') || lowerTitle.includes('comercial')) return Storefront;
  if (lowerTitle.includes('bodega')) return Warehouse;
  if (lowerTitle.includes('oficina')) return Briefcase;
  if (lowerTitle.includes('estudio')) return DoorOpen;
  return Buildings; // Default for apartments
}

/**
 * Calculate totals from items
 */
function calculateTotals(items: DispersionItem[]) {
  return items.reduce(
    (acc, item) => ({
      totalCollected: acc.totalCollected + item.rentCollected,
      totalCommission: acc.totalCommission + item.commissionAmount,
      totalNet: acc.totalNet + item.netAmount,
    }),
    { totalCollected: 0, totalCommission: 0, totalNet: 0 }
  );
}

/**
 * Commission percentage badge with color coding
 */
function CommissionBadge({ percent }: { percent: number }) {
  const colorClass =
    percent >= 12
      ? 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-primary'
      : percent >= 10
      ? 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-primary'
      : 'bg-success-soft text-success dark:bg-success/15 dark:text-success';

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>
      <Percent className="w-3 h-3" weight="bold" />
      {percent}%
    </span>
  );
}

/**
 * Progress bar showing commission vs net ratio
 */
function CommissionRatioBar({
  commission,
  net,
  className,
  t,
}: {
  commission: number;
  net: number;
  className?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const total = commission + net;
  const commissionPercent = total > 0 ? (commission / total) * 100 : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-primary font-medium">
          {t('inmobiliaria.finance.commBreakdown.commission')}: {formatCurrency(commission)}
        </span>
        <span className="text-success font-medium">
          {t('inmobiliaria.finance.commBreakdown.net')}: {formatCurrency(net)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${commissionPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-primary"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - commissionPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-success"
        />
      </div>
    </div>
  );
}

/**
 * ComisionDesglose - Commission breakdown per property
 * Shows a table with property-level commission details
 */
export function ComisionDesglose({
  items,
  variant = 'full',
  showPercentages = true,
  className,
}: ComisionDesgloseProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = React.useState(variant === 'full');
  const totals = React.useMemo(() => calculateTotals(items), [items]);

  // Compact variant - just show summary with expand option
  if (variant === 'compact' && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left group hover:bg-muted/30 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? t('inmobiliaria.finance.commBreakdown.property') : t('inmobiliaria.finance.commBreakdown.properties')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {formatCurrency(totals.totalCommission)}
          </span>
          <CaretDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        variant === 'full' && 'rounded-xl border border-border bg-card overflow-hidden',
        className
      )}
    >
      {/* Header (only in compact expanded mode) */}
      {variant === 'compact' && isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-border hover:bg-muted/30 transition-colors"
        >
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? t('inmobiliaria.finance.commBreakdown.property') : t('inmobiliaria.finance.commBreakdown.properties')}
          </span>
          <CaretDown className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">{t('inmobiliaria.finance.commBreakdown.propertyHeader')}</TableHead>
              <TableHead className="text-right">{t('inmobiliaria.finance.commBreakdown.collected')}</TableHead>
              {showPercentages && <TableHead className="text-center">{t('inmobiliaria.finance.commBreakdown.commission')}</TableHead>}
              <TableHead className="text-right">{t('inmobiliaria.finance.commBreakdown.commAmount')}</TableHead>
              <TableHead className="text-right">{t('inmobiliaria.finance.commBreakdown.net')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {items.map((item, index) => {
                const Icon = getPropertyTypeIcon(item.propertyTitle);
                return (
                  <motion.tr
                    key={item.cobroId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-foreground truncate max-w-[200px]">
                          {item.propertyTitle}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(item.rentCollected)}
                    </TableCell>
                    {showPercentages && (
                      <TableCell className="text-center">
                        <CommissionBadge percent={item.commissionPercent} />
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(item.commissionAmount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(item.netAmount)}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>
                <span className="text-foreground">{t('inmobiliaria.finance.commBreakdown.total')} ({items.length} {t('inmobiliaria.finance.commBreakdown.properties')})</span>
              </TableCell>
              <TableCell className="text-right text-foreground">
                {formatCurrency(totals.totalCollected)}
              </TableCell>
              {showPercentages && <TableCell />}
              <TableCell className="text-right text-primary">
                {formatCurrency(totals.totalCommission)}
              </TableCell>
              <TableCell className="text-right text-success">
                {formatCurrency(totals.totalNet)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Commission Ratio Visualization - only for full variant */}
      {variant === 'full' && (
        <div className="p-4 border-t border-border bg-muted/30">
          <CommissionRatioBar commission={totals.totalCommission} net={totals.totalNet} t={t} />
        </div>
      )}
    </motion.div>
  );
}

/**
 * ComisionDesgloseCompact - Minimal variant for inline use
 */
export function ComisionDesgloseCompact({
  items,
  className,
}: {
  items: DispersionItem[];
  className?: string;
}) {
  const { t } = useI18n();
  const totals = React.useMemo(() => calculateTotals(items), [items]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? t('inmobiliaria.finance.commBreakdown.property') : t('inmobiliaria.finance.commBreakdown.properties')}
        </span>
        <span className="text-sm font-medium text-primary">
          {formatCurrency(totals.totalCommission)} {t('inmobiliaria.finance.commBreakdown.inCommissions')}
        </span>
      </div>
      <CommissionRatioBar commission={totals.totalCommission} net={totals.totalNet} t={t} />
    </div>
  );
}

export default ComisionDesglose;
