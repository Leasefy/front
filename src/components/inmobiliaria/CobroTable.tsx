'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  CurrencyCircleDollar,
  Warning,
  CheckCircle,
  User,
  HouseLine,
  Envelope,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { IconButton } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency as formatCurrencyUtil } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'month' | 'totalAmount' | 'paidAmount' | 'pendingAmount' | 'status' | 'daysLate' | 'dueDate';
type SortDirection = 'asc' | 'desc';

// Mapeo status → variant del Badge de Cadence (reemplaza getCobroStatusColor).
const STATUS_BADGE_VARIANT = {
  pending: 'warning',
  paid: 'success',
  partial: 'default',
  late: 'destructive',
  defaulted: 'destructive',
} as const;

interface CobroTableProps {
  cobros: Cobro[];
  onCobroClick?: (cobro: Cobro) => void;
  onRegisterPayment?: (cobro: Cobro) => void;
  showSummary?: boolean;
}

/**
 * CobroTable - Full-featured data table for collections (cobros)
 * Includes sorting, row actions, and optional summary row
 */
export function CobroTable({
  cobros,
  onCobroClick,
  onRegisterPayment,
  showSummary = false,
}: CobroTableProps) {
  const { t, formatDate, formatCurrency } = useI18n();
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Status labels from i18n
  const STATUS_LABELS: Record<CobroStatus, string> = {
    pending: t('inmobiliaria.cobros.status.pending'),
    paid: t('inmobiliaria.cobros.status.paid'),
    partial: t('inmobiliaria.cobros.status.partial'),
    late: t('inmobiliaria.cobros.status.late'),
    defaulted: t('inmobiliaria.cobros.status.defaulted'),
  };

  /**
   * Format month string (2026-02) to localized display (Feb 2026)
   */
  const formatMonth = (month: string): string => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return formatDate(date, { month: 'short', year: 'numeric' });
  };

  // Sort cobros
  const sortedCobros = useMemo(() => {
    const result = [...cobros];

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'propertyTitle':
          aVal = a.propertyTitle.toLowerCase();
          bVal = b.propertyTitle.toLowerCase();
          break;
        case 'tenantName':
          aVal = a.tenantName.toLowerCase();
          bVal = b.tenantName.toLowerCase();
          break;
        case 'month':
          aVal = a.month;
          bVal = b.month;
          break;
        case 'totalAmount':
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case 'paidAmount':
          aVal = a.paidAmount;
          bVal = b.paidAmount;
          break;
        case 'pendingAmount':
          aVal = a.pendingAmount;
          bVal = b.pendingAmount;
          break;
        case 'status':
          const statusOrder: Record<CobroStatus, number> = {
            defaulted: 0,
            late: 1,
            pending: 2,
            partial: 3,
            paid: 4,
          };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'daysLate':
          aVal = a.daysLate;
          bVal = b.daysLate;
          break;
        case 'dueDate':
          aVal = a.dueDate;
          bVal = b.dueDate;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cobros, sortField, sortDirection]);

  // Calculate summary totals
  const summary = useMemo(() => {
    return cobros.reduce(
      (acc, cobro) => ({
        totalExpected: acc.totalExpected + cobro.totalAmount,
        totalCollected: acc.totalCollected + cobro.paidAmount,
        totalPending: acc.totalPending + cobro.pendingAmount,
      }),
      { totalExpected: 0, totalCollected: 0, totalPending: 0 }
    );
  }, [cobros]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn('text-left p-4', className)}>
      {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 hover:text-foreground"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </TableHead>
  );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="border-b border-border">
            <SortableHeader field="propertyTitle">{t('inmobiliaria.cobros.table.property')}</SortableHeader>
            <SortableHeader field="tenantName">{t('inmobiliaria.cobros.table.tenant')}</SortableHeader>
            <SortableHeader field="month">{t('inmobiliaria.cobros.table.month')}</SortableHeader>
            <SortableHeader field="totalAmount">{t('inmobiliaria.cobros.table.total')}</SortableHeader>
            <SortableHeader field="paidAmount">{t('inmobiliaria.cobros.table.paid')}</SortableHeader>
            <SortableHeader field="pendingAmount">{t('inmobiliaria.cobros.table.pending')}</SortableHeader>
            <SortableHeader field="status">{t('inmobiliaria.cobros.table.status')}</SortableHeader>
            <SortableHeader field="daysLate">{t('inmobiliaria.cobros.table.lateLabel')}</SortableHeader>
            <TableHead className="w-12 p-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCobros.map((cobro, index) => {
            const statusLabel = STATUS_LABELS[cobro.status];

            return (
              <motion.tr
                key={cobro.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onCobroClick?.(cobro)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                {/* Property */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
                      <HouseLine className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {cobro.propertyTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                        {cobro.propertyAddress}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Tenant */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[140px]">
                        {cobro.tenantName}
                      </p>
                      <div className="flex items-center gap-2">
                        {cobro.tenantEmail && (
                          <a
                            href={`mailto:${cobro.tenantEmail}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-muted transition-colors"
                            title={t('inmobiliaria.cobros.table.sendEmail')}
                          >
                            <Envelope className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                        )}
                        {cobro.tenantPhone && (
                          <a
                            href={`https://wa.me/${cobro.tenantPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-success-soft dark:hover:bg-success/30 transition-colors"
                            title="WhatsApp"
                          >
                            <WhatsappLogo className="w-3.5 h-3.5 text-success" weight="fill" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Month */}
                <TableCell className="p-4">
                  <span className="text-foreground capitalize">
                    {formatMonth(cobro.month)}
                  </span>
                </TableCell>

                {/* Total */}
                <TableCell className="p-4">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(cobro.totalAmount)}
                  </span>
                </TableCell>

                {/* Paid */}
                <TableCell className="p-4">
                  <span className={cn(
                    'font-medium',
                    cobro.paidAmount >= cobro.totalAmount
                      ? 'text-success'
                      : cobro.paidAmount > 0
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}>
                    {formatCurrency(cobro.paidAmount)}
                  </span>
                </TableCell>

                {/* Pending */}
                <TableCell className="p-4">
                  <span className={cn(
                    'font-medium',
                    cobro.pendingAmount > 0 && cobro.daysLate > 0
                      ? 'text-danger'
                      : cobro.pendingAmount > 0
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  )}>
                    {formatCurrency(cobro.pendingAmount)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="p-4">
                  <Badge variant={STATUS_BADGE_VARIANT[cobro.status]}>
                    {statusLabel}
                  </Badge>
                </TableCell>

                {/* Days Late */}
                <TableCell className="p-4">
                  {cobro.daysLate > 0 ? (
                    <div className="flex items-center gap-1.5 text-warning">
                      <Warning className="w-4 h-4" weight="fill" />
                      <span className="text-sm font-medium">{cobro.daysLate}d</span>
                    </div>
                  ) : cobro.status === 'paid' ? (
                    <div className="flex items-center gap-1.5 text-success">
                      <CheckCircle className="w-4 h-4" weight="fill" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="p-4">
                  <DropdownList>
                    <DropdownListTrigger asChild>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<DotsThree className="w-5 h-5" weight="bold" />}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Acciones"
                      />
                    </DropdownListTrigger>
                    <DropdownListContent align="end" className="w-44">
                      <DropdownListItem onSelect={() => onCobroClick?.(cobro)}>
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">{t('inmobiliaria.cobros.table.viewDetail')}</span>
                      </DropdownListItem>
                      {cobro.status !== 'paid' && onRegisterPayment && (
                        <DropdownListItem onSelect={() => onRegisterPayment(cobro)} className="text-primary">
                          <CurrencyCircleDollar className="w-4 h-4" />
                          <span className="text-sm">{t('inmobiliaria.cobros.table.registerPayment')}</span>
                        </DropdownListItem>
                      )}
                    </DropdownListContent>
                  </DropdownList>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>

        {/* Summary Row */}
        {showSummary && cobros.length > 0 && (
          <TableFooter>
            <TableRow className="bg-muted/30 border-t border-border">
              <TableCell colSpan={3} className="p-4">
                <span className="font-semibold text-foreground">
                  {t('inmobiliaria.cobros.table.totalSummary', { count: cobros.length })}
                </span>
              </TableCell>
              <TableCell className="p-4">
                <span className="font-bold text-foreground">
                  {formatCurrency(summary.totalExpected)}
                </span>
              </TableCell>
              <TableCell className="p-4">
                <span className="font-bold text-success">
                  {formatCurrency(summary.totalCollected)}
                </span>
              </TableCell>
              <TableCell className="p-4">
                <span className="font-bold text-warning">
                  {formatCurrency(summary.totalPending)}
                </span>
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {/* Empty State */}
      {sortedCobros.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <CurrencyCircleDollar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t('inmobiliaria.cobros.table.noCollections')}
          </h3>
          <p className="text-muted-foreground">
            {t('inmobiliaria.cobros.table.noCollectionsDesc')}
          </p>
        </div>
      )}
    </div>
  );
}

export default CobroTable;
