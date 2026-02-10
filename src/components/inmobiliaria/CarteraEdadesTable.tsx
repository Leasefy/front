'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  Phone,
  Envelope,
  WhatsappLogo,
  User,
  HouseLine,
  Warning,
  Download,
  Funnel,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { CarteraReport, CarteraItem } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'propietarioName' | 'agenteName' | 'month' | 'pendingAmount' | 'daysLate';
type SortDirection = 'asc' | 'desc';
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';

interface CarteraEdadesTableProps {
  data: CarteraReport;
  onExport?: () => void;
  onContactTenant?: (item: CarteraItem) => void;
  onViewCobro?: (item: CarteraItem) => void;
  onNotifyAgent?: (item: CarteraItem) => void;
}

/**
 * Get bucket color classes
 */
function getBucketColor(bucket: CarteraItem['bucket']): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<CarteraItem['bucket'], { bg: string; text: string; border: string }> = {
    '0-30': {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    '31-60': {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    },
    '61-90': {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
    },
    '90+': {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
  };
  return colors[bucket];
}

/**
 * Format month string to Spanish display
 */
function formatMonth(month: string, loc: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', { month: 'short', year: 'numeric' });
}

/**
 * CarteraEdadesTable - Aging receivables analysis table
 * Shows receivables grouped by 30/60/90+ day buckets with actions
 */
export function CarteraEdadesTable({
  data,
  onExport,
  onContactTenant,
  onViewCobro,
  onNotifyAgent,
}: CarteraEdadesTableProps) {
  const { t, locale } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('daysLate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Count items by bucket
  const bucketCounts = useMemo(() => {
    const items = data.items;
    return {
      all: items.length,
      '0-30': items.filter((i) => i.bucket === '0-30').length,
      '31-60': items.filter((i) => i.bucket === '31-60').length,
      '61-90': items.filter((i) => i.bucket === '61-90').length,
      '90+': items.filter((i) => i.bucket === '90+').length,
    };
  }, [data.items]);

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
        case 'agenteName':
          aVal = a.agenteName.toLowerCase();
          bVal = b.agenteName.toLowerCase();
          break;
        case 'month':
          aVal = a.month;
          bVal = b.month;
          break;
        case 'pendingAmount':
          aVal = a.pendingAmount;
          bVal = b.pendingAmount;
          break;
        case 'daysLate':
          aVal = a.daysLate;
          bVal = b.daysLate;
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
      setSortDirection('desc');
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Pendiente */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
          <p className="text-sm font-medium text-red-100">{t('inmobiliaria.finance.aging.totalPending')}</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalPending)}</p>
          <p className="text-xs text-red-200 mt-1">{data.items.length} {t('inmobiliaria.finance.aging.overdueCharges')}</p>
        </div>

        {/* 0-30 dias */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t('inmobiliaria.finance.aging.days030')}</p>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
            {formatCurrency(data.summary.bucket0to30)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
            {bucketCounts['0-30']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>

        {/* 31-60 dias */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('inmobiliaria.finance.aging.days3160')}</p>
          <p className="text-xl font-bold text-amber-800 dark:text-amber-300">
            {formatCurrency(data.summary.bucket31to60)}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            {bucketCounts['31-60']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>

        {/* 61-90 dias */}
        <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">{t('inmobiliaria.finance.aging.days6190')}</p>
          <p className="text-xl font-bold text-orange-800 dark:text-orange-300">
            {formatCurrency(data.summary.bucket61to90)}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
            {bucketCounts['61-90']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>

        {/* 90+ dias */}
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{t('inmobiliaria.finance.aging.days90plus')}</p>
          <p className="text-xl font-bold text-red-800 dark:text-red-300">
            {formatCurrency(data.summary.bucket90plus)}
          </p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            {bucketCounts['90+']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>
      </div>

      {/* Filter Tabs and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Bucket Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-x-auto">
          <button
            onClick={() => setBucketFilter('all')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === 'all'
                ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            <Funnel className="w-4 h-4" />
            {t('inmobiliaria.finance.aging.all')}
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-neutral-200 dark:bg-neutral-700">
              {bucketCounts.all}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('0-30')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '0-30'
                ? 'bg-white dark:bg-[#1a1a1c] text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            0-30d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {bucketCounts['0-30']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('31-60')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '31-60'
                ? 'bg-white dark:bg-[#1a1a1c] text-amber-700 dark:text-amber-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            31-60d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {bucketCounts['31-60']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('61-90')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '61-90'
                ? 'bg-white dark:bg-[#1a1a1c] text-orange-700 dark:text-orange-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            61-90d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              {bucketCounts['61-90']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('90+')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '90+'
                ? 'bg-white dark:bg-[#1a1a1c] text-red-700 dark:text-red-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            90+d
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              {bucketCounts['90+']}
            </span>
          </button>
        </div>

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">{t('inmobiliaria.finance.aging.exportExcel')}</span>
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.aging.property')}</SortableHeader>
              <SortableHeader field="tenantName">{t('inmobiliaria.finance.aging.tenant')}</SortableHeader>
              <SortableHeader field="propietarioName">{t('inmobiliaria.finance.aging.owner')}</SortableHeader>
              <SortableHeader field="agenteName">{t('inmobiliaria.finance.aging.agent')}</SortableHeader>
              <SortableHeader field="month">{t('inmobiliaria.finance.aging.month')}</SortableHeader>
              <SortableHeader field="pendingAmount">{t('inmobiliaria.finance.aging.pending')}</SortableHeader>
              <SortableHeader field="daysLate">{t('inmobiliaria.finance.aging.overdue')}</SortableHeader>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map((item, index) => {
              const bucketColors = getBucketColor(item.bucket);

              return (
                <motion.tr
                  key={item.cobroId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#141416] transition-colors"
                >
                  {/* Property */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <HouseLine className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`tel:${item.tenantPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            title={t('inmobiliaria.finance.aging.call')}
                          >
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                          </a>
                          <a
                            href={`https://wa.me/${item.tenantPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                            title="WhatsApp"
                          >
                            <WhatsappLogo
                              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                              weight="fill"
                            />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Propietario */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate block max-w-[120px]">
                      {item.propietarioName}
                    </span>
                  </td>

                  {/* Agente */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate block max-w-[120px]">
                      {item.agenteName}
                    </span>
                  </td>

                  {/* Month */}
                  <td className="p-4">
                    <span className="text-neutral-700 dark:text-neutral-300 capitalize text-sm">
                      {formatMonth(item.month, locale)}
                    </span>
                  </td>

                  {/* Pending Amount */}
                  <td className="p-4">
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(item.pendingAmount)}
                    </span>
                  </td>

                  {/* Days Late */}
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        bucketColors.bg,
                        bucketColors.text
                      )}
                    >
                      <Warning className="w-3.5 h-3.5" weight="fill" />
                      {item.daysLate}d
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.cobroId ? null : item.cobroId);
                        }}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === item.cobroId && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                          >
                            {onContactTenant && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContactTenant(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.finance.aging.contactTenant')}</span>
                              </button>
                            )}
                            {onViewCobro && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewCobro(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.finance.aging.viewCharge')}</span>
                              </button>
                            )}
                            {onNotifyAgent && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNotifyAgent(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              >
                                <Envelope className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.finance.aging.notifyAgent')}</span>
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Warning className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('inmobiliaria.finance.aging.noOverdue')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {bucketFilter === 'all'
                ? t('inmobiliaria.finance.aging.noOverdueDesc')
                : t('inmobiliaria.finance.aging.noOverdueRange', { range: bucketFilter })}
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

export default CarteraEdadesTable;
