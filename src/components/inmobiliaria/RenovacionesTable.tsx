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
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
} from '@/components/ui/dropdown-menu';
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
    <th className={cn('text-left p-4', className)}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </th>
  );

  const hasSelection = selectedItems.size > 0;

  return (
    <div>
      <div className="p-5 space-y-5">
      {/* Filter Tabs and Status Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Bucket Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => setBucketFilter('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              bucketFilter === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inmobiliaria.finance.renewals.all')}
            <span className="px-1.5 py-0.5 rounded text-xs tabular-nums bg-muted">
              {bucketCounts.all}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('0-30')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              bucketFilter === '0-30'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inmobiliaria.finance.renewals.critical')}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs tabular-nums',
              bucketFilter === '0-30' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-muted'
            )}>
              {bucketCounts['0-30']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('31-60')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              bucketFilter === '31-60'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inmobiliaria.finance.renewals.urgent')}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs tabular-nums',
              bucketFilter === '31-60' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-muted'
            )}>
              {bucketCounts['31-60']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('61-90')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              bucketFilter === '61-90'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inmobiliaria.finance.renewals.upcoming')}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs tabular-nums',
              bucketFilter === '61-90' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted'
            )}>
              {bucketCounts['61-90']}
            </span>
          </button>
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('inmobiliaria.finance.renewals.statusLabel')}:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="pl-3 pr-8 py-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="all">{t('inmobiliaria.finance.renewals.allStatuses')}</option>
            <option value="pending">{t('inmobiliaria.finance.renewals.statusPending')}</option>
            <option value="notified">{t('inmobiliaria.finance.renewals.statusNotified')}</option>
            <option value="negotiating">{t('inmobiliaria.finance.renewals.statusNegotiating')}</option>
            <option value="approved">{t('inmobiliaria.finance.renewals.statusApproved')}</option>
            <option value="signed">{t('inmobiliaria.finance.renewals.statusSigned')}</option>
            <option value="completed">{t('inmobiliaria.finance.renewals.statusCompleted')}</option>
            <option value="terminated">{t('inmobiliaria.finance.renewals.statusTerminated')}</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedItems.size} {t('inmobiliaria.finance.renewals.selected')}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {onNotifyTenant && (
                <button
                  onClick={() => {
                    selectedItems.forEach(id => {
                      const item = data.find(r => r.id === id);
                      if (item) onNotifyTenant(item);
                    });
                    setSelectedItems(new Set());
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {t('inmobiliaria.finance.renewals.notify')}
                </button>
              )}
              {onStartRenewal && (
                <button
                  onClick={() => {
                    selectedItems.forEach(id => {
                      const item = data.find(r => r.id === id);
                      if (item) onStartRenewal(item);
                    });
                    setSelectedItems(new Set());
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  {t('inmobiliaria.finance.renewals.startRenewal')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="overflow-x-auto -mx-5 mt-5 border-t border-border">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.size === filteredAndSortedItems.length &&
                    filteredAndSortedItems.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600"
                />
              </th>
              <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.renewals.property')}</SortableHeader>
              <SortableHeader field="tenantName">{t('inmobiliaria.finance.renewals.tenant')}</SortableHeader>
              <SortableHeader field="propietarioName">{t('inmobiliaria.finance.renewals.owner')}</SortableHeader>
              <th className="p-4 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.finance.renewals.expiration')}
              </th>
              <SortableHeader field="daysUntilExpiry">{t('inmobiliaria.finance.renewals.days')}</SortableHeader>
              <SortableHeader field="currentRent">{t('inmobiliaria.finance.renewals.currentRent')}</SortableHeader>
              <th className="p-4 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.finance.renewals.proposed')}
              </th>
              <SortableHeader field="status">{t('inmobiliaria.finance.renewals.status')}</SortableHeader>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
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
                    'border-b border-neutral-50 dark:border-neutral-800 transition-colors',
                    isSelected && 'bg-indigo-50 dark:bg-indigo-900/20',
                    !isSelected && 'hover:bg-neutral-50 dark:hover:bg-[#141416]'
                  )}
                >
                  {/* Checkbox */}
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                      className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600"
                    />
                  </td>

                  {/* Property */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          isUrgent
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-indigo-100 dark:bg-indigo-900/30'
                        )}
                      >
                        <HouseLine
                          className={cn(
                            'w-5 h-5',
                            isUrgent
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[160px]">
                          {item.propertyTitle}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[160px]">
                          {item.propertyAddress}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Tenant */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[120px]">
                          {item.tenantName}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">
                          {item.tenantPhone}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Propietario */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate block max-w-[100px]">
                      {item.propietarioName}
                    </span>
                  </td>

                  {/* End Date */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {formatDate(item.leaseEndDate, locale)}
                    </span>
                  </td>

                  {/* Days Until Expiry */}
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        getUrgencyColor(item.urgencyBucket)
                      )}
                    >
                      {isUrgent && <Warning className="w-3.5 h-3.5" weight="fill" />}
                      {item.daysUntilExpiry}d
                    </span>
                  </td>

                  {/* Current Rent */}
                  <td className="p-4">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {formatCurrencyLocal(item.currentRent, locale)}
                    </span>
                  </td>

                  {/* Proposed Rent */}
                  <td className="p-4">
                    {item.proposedRent && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {formatCurrencyLocal(item.negotiatedRent || item.proposedRent, locale)}
                        </span>
                        {ipcIncrease && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <TrendUp className="w-3 h-3" />
                            +{ipcIncrease}% IPC
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                        getRenovacionStatusColor(item.status)
                      )}
                    >
                      {getRenovacionStatusLabel(item.status)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <DropdownList>
                      <DropdownListTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                        </button>
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
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer text-indigo-600 dark:text-indigo-400 focus:text-indigo-600 dark:focus:text-indigo-400"
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
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredAndSortedItems.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-emerald-600 dark:text-emerald-400" weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('inmobiliaria.finance.renewals.noRenewals')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {bucketFilter === 'all' && statusFilter === 'all'
                ? t('inmobiliaria.finance.renewals.noRenewalsDesc')
                : t('inmobiliaria.finance.renewals.noRenewalsFiltered')}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default RenovacionesTable;
