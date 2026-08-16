'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  ArrowsClockwise,
  CheckSquare,
  Warning,
  HouseLine,
  User,
  Funnel,
  Bell,
  Calculator,
  ClockCounterClockwise,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
} from '@/components/ui/dropdown-menu';
import { Chip } from '@leasefy/cadence';
import type { Renovacion, RenovacionStatus } from '@/lib/types/inmobiliaria';
import {
  getRenovacionStatusColor,
  getRenovacionStatusLabel,
  getUrgencyColor,
} from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'propietarioName' | 'daysUntilExpiry' | 'status' | 'currentRent';
type SortDirection = 'asc' | 'desc';
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';
type StatusFilter = 'all' | RenovacionStatus;

interface RenovacionesTableProps {
  data: Renovacion[];
  onStartRenewal?: (renovacion: Renovacion) => void;
  onNotifyTenant?: (renovacion: Renovacion) => void;
  onViewDetails?: (renovacion: Renovacion) => void;
  onCalculateIPC?: (renovacion: Renovacion) => void;
  onViewHistory?: (renovacion: Renovacion) => void;
}

/**
 * Format currency to Colombian Peso
 */
function formatCurrencyLocal(amount: number, loc: string): string {
  return new Intl.NumberFormat(loc === 'es' ? 'es-CL' : 'en-US', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to display
 */
function formatDate(dateStr: string, loc: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * RenovacionesTable - Contract renewals table
 * Shows expiring contracts with urgency indicators and workflow actions
 */
export function RenovacionesTable({
  data,
  onStartRenewal,
  onNotifyTenant,
  onViewDetails,
  onCalculateIPC,
  onViewHistory,
}: RenovacionesTableProps) {
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Count items by bucket
  const bucketCounts = useMemo(() => {
    return {
      all: data.length,
      '0-30': data.filter(r => r.urgencyBucket === '0-30').length,
      '31-60': data.filter(r => r.urgencyBucket === '31-60').length,
      '61-90': data.filter(r => r.urgencyBucket === '61-90').length,
      '90+': data.filter(r => r.urgencyBucket === '90+').length,
    };
  }, [data]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...data];

    // Apply bucket filter
    if (bucketFilter !== 'all') {
      result = result.filter((item) => item.urgencyBucket === bucketFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Sort
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
        case 'propietarioName':
          aVal = a.propietarioName.toLowerCase();
          bVal = b.propietarioName.toLowerCase();
          break;
        case 'daysUntilExpiry':
          aVal = a.daysUntilExpiry;
          bVal = b.daysUntilExpiry;
          break;
        case 'currentRent':
          aVal = a.currentRent;
          bVal = b.currentRent;
          break;
        case 'status':
          const statusOrder: Record<RenovacionStatus, number> = {
            terminated: 0,
            pending: 1,
            notified: 2,
            negotiating: 3,
            approved: 4,
            signed: 5,
            completed: 6,
          };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, bucketFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map((i) => i.id)));
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

  const hasSelection = selectedItems.size > 0;

  return (
    <div>
      <div className="p-5 space-y-5">
      {/* Filter Tabs and Status Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Bucket Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={bucketFilter === 'all'} onClick={() => setBucketFilter('all')}>
            {t('inmobiliaria.finance.renewals.all')}
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs tabular-nums bg-muted">
              {bucketCounts.all}
            </span>
          </Chip>
          <Chip selected={bucketFilter === '0-30'} onClick={() => setBucketFilter('0-30')}>
            {t('inmobiliaria.finance.renewals.critical')}
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded text-xs tabular-nums',
              bucketFilter === '0-30' ? 'bg-danger-soft text-danger' : 'bg-muted'
            )}>
              {bucketCounts['0-30']}
            </span>
          </Chip>
          <Chip selected={bucketFilter === '31-60'} onClick={() => setBucketFilter('31-60')}>
            {t('inmobiliaria.finance.renewals.urgent')}
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded text-xs tabular-nums',
              bucketFilter === '31-60' ? 'bg-warning-soft text-warning' : 'bg-muted'
            )}>
              {bucketCounts['31-60']}
            </span>
          </Chip>
          <Chip selected={bucketFilter === '61-90'} onClick={() => setBucketFilter('61-90')}>
            {t('inmobiliaria.finance.renewals.upcoming')}
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded text-xs tabular-nums',
              bucketFilter === '61-90' ? 'bg-primary-soft text-primary' : 'bg-muted'
            )}>
              {bucketCounts['61-90']}
            </span>
          </Chip>
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('inmobiliaria.finance.renewals.statusLabel')}:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-auto gap-2 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inmobiliaria.finance.renewals.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('inmobiliaria.finance.renewals.statusPending')}</SelectItem>
              <SelectItem value="notified">{t('inmobiliaria.finance.renewals.statusNotified')}</SelectItem>
              <SelectItem value="negotiating">{t('inmobiliaria.finance.renewals.statusNegotiating')}</SelectItem>
              <SelectItem value="approved">{t('inmobiliaria.finance.renewals.statusApproved')}</SelectItem>
              <SelectItem value="signed">{t('inmobiliaria.finance.renewals.statusSigned')}</SelectItem>
              <SelectItem value="completed">{t('inmobiliaria.finance.renewals.statusCompleted')}</SelectItem>
              <SelectItem value="terminated">{t('inmobiliaria.finance.renewals.statusTerminated')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedItems.size} {t('inmobiliaria.finance.renewals.selected')}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {onNotifyTenant && (
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => {
                    selectedItems.forEach(id => {
                      const item = data.find(r => r.id === id);
                      if (item) onNotifyTenant(item);
                    });
                    setSelectedItems(new Set());
                  }}
                  className="gap-2"
                >
                  <Bell className="w-4 h-4" />
                  {t('inmobiliaria.finance.renewals.notify')}
                </Button>
              )}
              {onStartRenewal && (
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => {
                    selectedItems.forEach(id => {
                      const item = data.find(r => r.id === id);
                      if (item) onStartRenewal(item);
                    });
                    setSelectedItems(new Set());
                  }}
                  className="gap-2"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  {t('inmobiliaria.finance.renewals.startRenewal')}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="overflow-x-auto -mx-5 mt-5 border-t border-border">
        <Table className="w-full min-w-[1100px]">
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="w-12 p-4">
                <Checkbox
                  checked={
                    selectedItems.size === filteredAndSortedItems.length &&
                    filteredAndSortedItems.length > 0
                  }
                  onCheckedChange={() => toggleSelectAll()}
                  aria-label="Seleccionar todo"
                />
              </TableHead>
              <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.renewals.property')}</SortableHeader>
              <SortableHeader field="tenantName">{t('inmobiliaria.finance.renewals.tenant')}</SortableHeader>
              <SortableHeader field="propietarioName">{t('inmobiliaria.finance.renewals.owner')}</SortableHeader>
              <TableHead className="p-4 text-left">
                {t('inmobiliaria.finance.renewals.expiration')}
              </TableHead>
              <SortableHeader field="daysUntilExpiry">{t('inmobiliaria.finance.renewals.days')}</SortableHeader>
              <SortableHeader field="currentRent">{t('inmobiliaria.finance.renewals.currentRent')}</SortableHeader>
              <TableHead className="p-4 text-left">
                {t('inmobiliaria.finance.renewals.proposed')}
              </TableHead>
              <SortableHeader field="status">{t('inmobiliaria.finance.renewals.status')}</SortableHeader>
              <TableHead className="w-12 p-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.map((item, index) => {
              const isUrgent = item.urgencyBucket === '0-30';
              const isSelected = selectedItems.has(item.id);
              const ipcIncrease = item.proposedRent
                ? ((item.proposedRent - item.currentRent) / item.currentRent * 100).toFixed(1)
                : null;

              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'border-b border-border/60 transition-colors',
                    isSelected && 'bg-primary-soft',
                    !isSelected && 'hover:bg-muted/50'
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="p-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectItem(item.id)}
                      aria-label="Seleccionar fila"
                    />
                  </TableCell>

                  {/* Property */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-md flex items-center justify-center shrink-0',
                          isUrgent
                            ? 'bg-danger-soft'
                            : 'bg-primary-soft'
                        )}
                      >
                        <HouseLine
                          className={cn(
                            'w-5 h-5',
                            isUrgent
                              ? 'text-danger'
                              : 'text-primary'
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[160px]">
                          {item.propertyTitle}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {item.propertyAddress}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tenant */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[120px]">
                          {item.tenantName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {item.tenantPhone}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Propietario */}
                  <TableCell className="p-4">
                    <span className="text-sm text-foreground truncate block max-w-[100px]">
                      {item.propietarioName}
                    </span>
                  </TableCell>

                  {/* End Date */}
                  <TableCell className="p-4">
                    <span className="text-sm text-foreground">
                      {formatDate(item.leaseEndDate, locale)}
                    </span>
                  </TableCell>

                  {/* Days Until Expiry */}
                  <TableCell className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        getUrgencyColor(item.urgencyBucket)
                      )}
                    >
                      {isUrgent && <Warning className="w-3.5 h-3.5" weight="fill" />}
                      {item.daysUntilExpiry}d
                    </span>
                  </TableCell>

                  {/* Current Rent */}
                  <TableCell className="p-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyLocal(item.currentRent, locale)}
                    </span>
                  </TableCell>

                  {/* Proposed Rent */}
                  <TableCell className="p-4">
                    {item.proposedRent && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrencyLocal(item.negotiatedRent || item.proposedRent, locale)}
                        </span>
                        {ipcIncrease && (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <TrendUp className="w-3 h-3" />
                            +{ipcIncrease}% IPC
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="p-4">
                    <span
                      className={cn(
                        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                        getRenovacionStatusColor(item.status)
                      )}
                    >
                      {getRenovacionStatusLabel(item.status)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="p-4">
                    <DropdownList>
                      <DropdownListTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          hideArrow
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <DotsThree className="w-5 h-5" weight="bold" />
                        </Button>
                      </DropdownListTrigger>
                      <DropdownListContent align="end" className="w-52">
                        {onViewDetails && (
                          <DropdownListItem
                            onSelect={() => onViewDetails(item)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{t('inmobiliaria.finance.renewals.viewDetails')}</span>
                          </DropdownListItem>
                        )}
                        {onNotifyTenant && item.status === 'pending' && (
                          <DropdownListItem
                            onSelect={() => onNotifyTenant(item)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                          >
                            <Bell className="w-4 h-4" />
                            <span>{t('inmobiliaria.finance.renewals.notifyTenant')}</span>
                          </DropdownListItem>
                        )}
                        {onStartRenewal && ['pending', 'notified'].includes(item.status) && (
                          <>
                            <DropdownListSeparator />
                            <DropdownListItem
                              onSelect={() => onStartRenewal(item)}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer text-primary focus:text-primary"
                            >
                              <ArrowsClockwise className="w-4 h-4" />
                              <span>{t('inmobiliaria.finance.renewals.startNegotiation')}</span>
                            </DropdownListItem>
                          </>
                        )}
                        {onCalculateIPC && (
                          <DropdownListItem
                            onSelect={() => onCalculateIPC(item)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                          >
                            <Calculator className="w-4 h-4" />
                            <span>{t('inmobiliaria.finance.renewals.calculateIPC')}</span>
                          </DropdownListItem>
                        )}
                        {onViewHistory && (
                          <DropdownListItem
                            onSelect={() => onViewHistory(item)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                          >
                            <ClockCounterClockwise className="w-4 h-4" />
                            <span>{t('inmobiliaria.finance.renewals.viewHistory')}</span>
                          </DropdownListItem>
                        )}
                      </DropdownListContent>
                    </DropdownList>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>

        {/* Empty State */}
        {filteredAndSortedItems.length === 0 && (
          <EmptyState
            icon={CheckSquare}
            title={t('inmobiliaria.finance.renewals.noRenewals')}
            description={
              bucketFilter === 'all' && statusFilter === 'all'
                ? t('inmobiliaria.finance.renewals.noRenewalsDesc')
                : t('inmobiliaria.finance.renewals.noRenewalsFiltered')
            }
          />
        )}
      </div>
      </div>
    </div>
  );
}

export default RenovacionesTable;
