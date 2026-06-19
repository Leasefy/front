'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  Phone,
  ArrowsClockwise,
  CheckSquare,
  Warning,
  HouseLine,
  User,
  CalendarBlank,
  Funnel,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { VencimientosReport, VencimientoItem, RenewalStatus } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'propietarioName' | 'daysUntilExpiry' | 'renewalStatus';
type SortDirection = 'asc' | 'desc';
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';

interface VencimientosTableProps {
  data: VencimientosReport;
  onStartRenewal?: (propertyId: string) => void;
  onContactTenant?: (propertyId: string) => void;
  onViewContract?: (item: VencimientoItem) => void;
  onBulkRenewal?: (propertyIds: string[]) => void;
  onBulkReminder?: (propertyIds: string[]) => void;
}

/**
 * Get bucket color classes
 */
function getBucketColor(bucket: VencimientoItem['bucket']): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<VencimientoItem['bucket'], { bg: string; text: string; border: string }> = {
    '0-30': {
      bg: 'bg-danger-soft',
      text: 'text-danger',
      border: 'border-danger/30 dark:border-danger/40',
    },
    '31-60': {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      border: 'border-warning/30 dark:border-warning/40',
    },
    '61-90': {
      bg: 'bg-primary-soft',
      text: 'text-primary',
      border: 'border-primary/30 dark:border-primary/40',
    },
    '90+': {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-600 dark:text-neutral-400',
      border: 'border-neutral-200 dark:border-neutral-700',
    },
  };
  return colors[bucket];
}

/**
 * Get renewal status display
 */
function getRenewalStatusDisplay(status: RenewalStatus, t: (key: string) => string): {
  label: string;
  bg: string;
  text: string;
} {
  const displays: Record<RenewalStatus, { label: string; bg: string; text: string }> = {
    pending: {
      label: t('inmobiliaria.finance.expirations.statusPending'),
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-600 dark:text-neutral-400',
    },
    negotiating: {
      label: t('inmobiliaria.finance.expirations.statusNegotiating'),
      bg: 'bg-primary-soft',
      text: 'text-primary',
    },
    renewed: {
      label: t('inmobiliaria.finance.expirations.statusRenewed'),
      bg: 'bg-success-soft',
      text: 'text-success',
    },
    terminating: {
      label: t('inmobiliaria.finance.expirations.statusTerminating'),
      bg: 'bg-danger-soft',
      text: 'text-danger',
    },
  };
  return displays[status];
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
 * VencimientosTable - Contract expirations table
 * Shows expiring contracts grouped by urgency buckets
 */
export function VencimientosTable({
  data,
  onStartRenewal,
  onContactTenant,
  onViewContract,
  onBulkRenewal,
  onBulkReminder,
}: VencimientosTableProps) {
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Count items by bucket
  const bucketCounts = useMemo(() => {
    const items = data.items;
    return {
      all: items.length,
      '0-30': data.summary.bucket0to30,
      '31-60': data.summary.bucket31to60,
      '61-90': data.summary.bucket61to90,
      '90+': data.summary.bucket90plus,
    };
  }, [data]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...data.items];

    // Apply bucket filter
    if (bucketFilter !== 'all') {
      result = result.filter((item) => item.bucket === bucketFilter);
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
        case 'renewalStatus':
          const statusOrder: Record<RenewalStatus, number> = {
            terminating: 0,
            pending: 1,
            negotiating: 2,
            renewed: 3,
          };
          aVal = statusOrder[a.renewalStatus];
          bVal = statusOrder[b.renewalStatus];
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data.items, bucketFilter, sortField, sortDirection]);

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
      setSelectedItems(new Set(filteredAndSortedItems.map((i) => i.propertyId)));
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
        className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </th>
  );

  const hasSelection = selectedItems.size > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Proximos 30 dias */}
        <div className="p-4 rounded-xl bg-danger-soft dark:bg-danger/12 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Warning className="w-5 h-5 text-danger" weight="fill" />
            <span className="text-sm font-medium text-danger">{t('inmobiliaria.finance.expirations.critical30d')}</span>
          </div>
          <p className="text-2xl font-bold">{data.summary.bucket0to30}</p>
          <p className="text-xs text-danger mt-1">{t('inmobiliaria.finance.expirations.contractsExpiring')}</p>
        </div>

        {/* 31-60 dias */}
        <div className="p-4 rounded-xl border border-warning/30 dark:border-warning/40 bg-warning-soft">
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              {t('inmobiliaria.finance.expirations.warning3160d')}
            </span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {data.summary.bucket31to60}
          </p>
        </div>

        {/* 61-90 dias */}
        <div className="p-4 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary-soft">
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t('inmobiliaria.finance.expirations.info6190d')}
            </span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {data.summary.bucket61to90}
          </p>
        </div>

        {/* Total */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-1">
            <HouseLine className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.expirations.total')}
            </span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {data.summary.totalVencimientos}
          </p>
        </div>
      </div>

      {/* Filter Tabs and Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Bucket Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-x-auto">
          <button
            onClick={() => setBucketFilter('all')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === 'all'
                ? 'bg-white dark:bg-card text-neutral-900 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            <Funnel className="w-4 h-4" />
            {t('inmobiliaria.finance.expirations.all')}
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-neutral-200 dark:bg-neutral-700">
              {bucketCounts.all}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('0-30')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '0-30'
                ? 'bg-white dark:bg-card text-danger'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            0-30d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-danger-soft text-danger">
              {bucketCounts['0-30']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('31-60')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '31-60'
                ? 'bg-white dark:bg-card text-warning'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            31-60d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-warning-soft text-warning">
              {bucketCounts['31-60']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('61-90')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '61-90'
                ? 'bg-white dark:bg-card text-primary'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            61-90d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-primary-soft text-primary">
              {bucketCounts['61-90']}
            </span>
          </button>
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {hasSelection && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {selectedItems.size} {t('inmobiliaria.finance.expirations.selected')}
              </span>
              {onBulkRenewal && (
                <button
                  onClick={() => onBulkRenewal(Array.from(selectedItems))}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90 transition-colors"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  {t('inmobiliaria.finance.expirations.startRenewal')}
                </button>
              )}
              {onBulkReminder && (
                <button
                  onClick={() => onBulkReminder(Array.from(selectedItems))}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-card text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <EnvelopeSimple className="w-4 h-4" />
                  {t('inmobiliaria.finance.expirations.sendReminders')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-card">
        <table className="w-full min-w-[1000px]">
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
              <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.expirations.property')}</SortableHeader>
              <SortableHeader field="tenantName">{t('inmobiliaria.finance.expirations.tenant')}</SortableHeader>
              <SortableHeader field="propietarioName">{t('inmobiliaria.finance.expirations.owner')}</SortableHeader>
              <th className="p-4 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('inmobiliaria.finance.expirations.expiration')}
              </th>
              <SortableHeader field="daysUntilExpiry">{t('inmobiliaria.finance.expirations.days')}</SortableHeader>
              <SortableHeader field="renewalStatus">{t('inmobiliaria.finance.expirations.status')}</SortableHeader>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map((item, index) => {
              const bucketColors = getBucketColor(item.bucket);
              const statusDisplay = getRenewalStatusDisplay(item.renewalStatus, t);
              const isUrgent = item.bucket === '0-30';
              const isSelected = selectedItems.has(item.propertyId);

              return (
                <motion.tr
                  key={item.consignacionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'border-b border-neutral-50 dark:border-neutral-800 transition-colors',
                    isSelected && 'bg-primary-soft',
                    !isSelected && 'hover:bg-neutral-50 dark:hover:bg-muted/20'
                  )}
                >
                  {/* Checkbox */}
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.propertyId)}
                      className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600"
                    />
                  </td>

                  {/* Property */}
                  <td className="p-4">
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
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[120px]">
                          {item.tenantName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Propietario */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate block max-w-[120px]">
                      {item.propietarioName}
                    </span>
                  </td>

                  {/* End Date */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {formatDate(item.contractEndDate, locale)}
                    </span>
                  </td>

                  {/* Days Until Expiry */}
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        bucketColors.bg,
                        bucketColors.text
                      )}
                    >
                      {isUrgent && <Warning className="w-3.5 h-3.5" weight="fill" />}
                      {item.daysUntilExpiry}d
                    </span>
                  </td>

                  {/* Renewal Status */}
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                        statusDisplay.bg,
                        statusDisplay.text
                      )}
                    >
                      {statusDisplay.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.consignacionId ? null : item.consignacionId);
                        }}
                        className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === item.consignacionId && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-card z-10"
                          >
                            {onContactTenant && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContactTenant(item.propertyId);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.finance.expirations.contactTenant')}</span>
                              </button>
                            )}
                            {onStartRenewal && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartRenewal(item.propertyId);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-primary hover:bg-primary-soft dark:hover:bg-primary/20 transition-colors"
                              >
                                <ArrowsClockwise className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.finance.expirations.startRenewal')}</span>
                              </button>
                            )}
                            {onViewContract && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewContract(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.finance.expirations.viewContract')}</span>
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredAndSortedItems.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-soft flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-success" weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('inmobiliaria.finance.expirations.noExpirations')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {bucketFilter === 'all'
                ? t('inmobiliaria.finance.expirations.noExpirationsDesc')
                : t('inmobiliaria.finance.expirations.noExpirationsRange', { range: bucketFilter })}
            </p>
          </div>
        )}

        {/* Close dropdown on click outside */}
        {openMenuId && (
          <div className="fixed inset-0 z-[5]" onClick={() => setOpenMenuId(null)} />
        )}
      </div>
    </div>
  );
}

export default VencimientosTable;
