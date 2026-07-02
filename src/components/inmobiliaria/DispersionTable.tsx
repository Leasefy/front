'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  PaperPlaneTilt,
  CheckCircle,
  Warning,
  User,
  Bank,
  ArrowsClockwise,
  DownloadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { IconButton } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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
import type { Dispersion, DispersionStatus } from '@/lib/types/inmobiliaria';

type SortField =
  | 'propietarioName'
  | 'month'
  | 'properties'
  | 'totalCollected'
  | 'totalCommission'
  | 'netToPropietario'
  | 'status'
  | 'processedAt';
type SortDirection = 'asc' | 'desc';

// Mapeo status → variant del Badge de Cadence (reemplaza getDispersionStatusColor).
const STATUS_BADGE_VARIANT = {
  pending: 'warning',
  processing: 'default',
  completed: 'success',
  failed: 'destructive',
} as const;

interface DispersionTableProps {
  dispersiones: Dispersion[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onViewDetail?: (dispersion: Dispersion) => void;
  onProcess?: (dispersion: Dispersion) => void;
  onDownloadExtracto?: (dispersion: Dispersion) => void;
  showSummary?: boolean;
}

// formatMonth removed - now uses i18n formatDate

/**
 * DispersionTable - Data table for dispersiones (disbursements)
 * Pure display component with sorting and row actions
 * Filtering and pagination handled by parent
 */
export function DispersionTable({
  dispersiones,
  onSort,
  onViewDetail,
  onProcess,
  onDownloadExtracto,
  showSummary = false,
}: DispersionTableProps) {
  const { t, formatDate, formatCurrency } = useI18n();
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort dispersiones
  const sortedDispersiones = useMemo(() => {
    const result = [...dispersiones];

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'propietarioName':
          aVal = a.propietarioName.toLowerCase();
          bVal = b.propietarioName.toLowerCase();
          break;
        case 'month':
          aVal = a.month;
          bVal = b.month;
          break;
        case 'properties':
          aVal = a.items.length;
          bVal = b.items.length;
          break;
        case 'totalCollected':
          aVal = a.totalCollected;
          bVal = b.totalCollected;
          break;
        case 'totalCommission':
          aVal = a.totalCommission;
          bVal = b.totalCommission;
          break;
        case 'netToPropietario':
          aVal = a.netToPropietario;
          bVal = b.netToPropietario;
          break;
        case 'status':
          const statusOrder: Record<DispersionStatus, number> = {
            failed: 0,
            pending: 1,
            processing: 2,
            completed: 3,
          };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'processedAt':
          aVal = a.processedAt || '';
          bVal = b.processedAt || '';
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [dispersiones, sortField, sortDirection]);

  // Calculate summary totals
  const summary = useMemo(() => {
    return dispersiones.reduce(
      (acc, d) => ({
        totalCollected: acc.totalCollected + d.totalCollected,
        totalCommissions: acc.totalCommissions + d.totalCommission,
        totalToDisburse: acc.totalToDisburse + d.netToPropietario,
        pending: acc.pending + (d.status === 'pending' ? 1 : 0),
        processing: acc.processing + (d.status === 'processing' ? 1 : 0),
        completed: acc.completed + (d.status === 'completed' ? 1 : 0),
        failed: acc.failed + (d.status === 'failed' ? 1 : 0),
      }),
      {
        totalCollected: 0,
        totalCommissions: 0,
        totalToDisburse: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      }
    );
  }, [dispersiones]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      onSort?.(field, newDirection);
    } else {
      setSortField(field);
      setSortDirection('asc');
      onSort?.(field, 'asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={cn('text-left p-4', className)}>
      {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
            <SortableHeader field="propietarioName">{t('inmobiliaria.dispersiones.tableView.propietario')}</SortableHeader>
            <SortableHeader field="month">{t('inmobiliaria.dispersiones.tableView.month')}</SortableHeader>
            <SortableHeader field="properties">{t('inmobiliaria.dispersiones.tableView.properties')}</SortableHeader>
            <SortableHeader field="totalCollected">{t('inmobiliaria.dispersiones.tableView.collected')}</SortableHeader>
            <SortableHeader field="totalCommission">{t('inmobiliaria.dispersiones.tableView.commission')}</SortableHeader>
            <SortableHeader field="netToPropietario">{t('inmobiliaria.dispersiones.tableView.net')}</SortableHeader>
            <SortableHeader field="status">{t('inmobiliaria.dispersiones.tableView.status')}</SortableHeader>
            <SortableHeader field="processedAt">{t('inmobiliaria.dispersiones.tableView.paymentDate')}</SortableHeader>
            <TableHead className="w-12 p-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDispersiones.map((dispersion, index) => {
            const statusLabel = t(`inmobiliaria.dispersiones.statusLabels.${dispersion.status}`);

            return (
              <motion.tr
                key={dispersion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onViewDetail?.(dispersion)}
                className={cn(
                  'border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors',
                  dispersion.status === 'completed' && 'opacity-75'
                )}
              >
                {/* Propietario */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-brand flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {dispersion.propietarioName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[180px]">
                        <Bank className="w-3 h-3" />
                        <span>
                          {dispersion.propietarioBankAccount.accountNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Month */}
                <TableCell className="p-4">
                  <span className="text-foreground capitalize">
                    {formatDate(dispersion.month + '-01', { month: 'short', year: 'numeric' })}
                  </span>
                </TableCell>

                {/* Properties Count */}
                <TableCell className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-foreground text-sm font-medium tabular-nums">
                    {dispersion.items.length}
                  </span>
                </TableCell>

                {/* Total Collected */}
                <TableCell className="p-4">
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(dispersion.totalCollected)}
                  </span>
                </TableCell>

                {/* Commission */}
                <TableCell className="p-4">
                  <span className="font-medium text-primary tabular-nums">
                    {formatCurrency(dispersion.totalCommission)}
                  </span>
                </TableCell>

                {/* Net Amount */}
                <TableCell className="p-4">
                  <span className="font-bold text-foreground tabular-nums">
                    {formatCurrency(dispersion.netToPropietario)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="p-4">
                  <Badge variant={STATUS_BADGE_VARIANT[dispersion.status]} className="gap-1.5">
                    {dispersion.status === 'processing' && (
                      <Spinner size="xs" variant="current" />
                    )}
                    {statusLabel}
                  </Badge>
                </TableCell>

                {/* Payment Date */}
                <TableCell className="p-4">
                  {dispersion.status === 'completed' && dispersion.processedAt ? (
                    <div className="flex items-center gap-1.5 text-foreground">
                      <CheckCircle className="w-4 h-4" weight="fill" />
                      <span className="text-sm tabular-nums">
                        {formatDate(dispersion.processedAt, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  ) : dispersion.status === 'failed' ? (
                    <div className="flex items-center gap-1.5 text-danger">
                      <Warning className="w-4 h-4" weight="fill" />
                      <span className="text-sm">{t('inmobiliaria.dispersiones.tableView.error')}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      —
                    </span>
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
                    <DropdownListContent align="end" className="w-48">
                      <DropdownListItem onSelect={() => onViewDetail?.(dispersion)}>
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">{t('inmobiliaria.dispersiones.tableView.viewDetail')}</span>
                      </DropdownListItem>

                      {dispersion.status === 'pending' && onProcess && (
                        <DropdownListItem onSelect={() => onProcess(dispersion)} className="text-primary">
                          <PaperPlaneTilt className="w-4 h-4" />
                          <span className="text-sm">{t('inmobiliaria.dispersiones.tableView.process')}</span>
                        </DropdownListItem>
                      )}

                      {dispersion.status === 'failed' && onProcess && (
                        <DropdownListItem onSelect={() => onProcess(dispersion)} className="text-warning">
                          <ArrowsClockwise className="w-4 h-4" />
                          <span className="text-sm">{t('inmobiliaria.dispersiones.tableView.retry')}</span>
                        </DropdownListItem>
                      )}

                      {dispersion.status === 'completed' && onDownloadExtracto && (
                        <DropdownListItem onSelect={() => onDownloadExtracto(dispersion)}>
                          <DownloadSimple className="w-4 h-4" />
                          <span className="text-sm">{t('inmobiliaria.dispersiones.tableView.downloadExtracto')}</span>
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
        {showSummary && dispersiones.length > 0 && (
          <TableFooter>
            <TableRow className="bg-muted/30 border-t-2 border-border">
              <TableCell colSpan={3} className="p-4">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-foreground">
                    {t('inmobiliaria.dispersiones.tableView.totalCount', { count: dispersiones.length })}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    {summary.pending > 0 && (
                      <Badge variant="warning" className="tabular-nums">
                        {t('inmobiliaria.dispersiones.tableView.pendingAbbr', { count: summary.pending })}
                      </Badge>
                    )}
                    {summary.processing > 0 && (
                      <Badge variant="default" className="tabular-nums">
                        {t('inmobiliaria.dispersiones.tableView.processingAbbr', { count: summary.processing })}
                      </Badge>
                    )}
                    {summary.completed > 0 && (
                      <Badge variant="secondary" className="tabular-nums">
                        {t('inmobiliaria.dispersiones.tableView.completedAbbr', { count: summary.completed })}
                      </Badge>
                    )}
                    {summary.failed > 0 && (
                      <Badge variant="destructive" className="tabular-nums">
                        {t('inmobiliaria.dispersiones.tableView.failedAbbr', { count: summary.failed })}
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="p-4">
                <span className="font-bold text-foreground tabular-nums">
                  {formatCurrency(summary.totalCollected)}
                </span>
              </TableCell>
              <TableCell className="p-4">
                <span className="font-bold text-primary tabular-nums">
                  {formatCurrency(summary.totalCommissions)}
                </span>
              </TableCell>
              <TableCell className="p-4">
                <span className="font-bold text-foreground tabular-nums">
                  {formatCurrency(summary.totalToDisburse)}
                </span>
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {/* Empty State */}
      {sortedDispersiones.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <PaperPlaneTilt className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t('inmobiliaria.dispersiones.tableView.emptyTitle')}
          </h3>
          <p className="text-muted-foreground">
            {t('inmobiliaria.dispersiones.tableView.emptyDescription')}
          </p>
        </div>
      )}
    </div>
  );
}

export default DispersionTable;
