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
  Bell,
  Calculator,
  ClockCounterClockwise,
  CurrencyCircleDollar,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
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
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = data.length;
    const critical = data.filter(r => r.urgencyBucket === '0-30').length;
    const urgent = data.filter(r => r.urgencyBucket === '31-60').length;
    const upcoming = data.filter(r => r.urgencyBucket === '61-90').length;
    const completed = data.filter(r => r.status === 'completed').length;
    const inProgress = data.filter(r => ['notified', 'negotiating', 'approved', 'signed'].includes(r.status)).length;

    return { total, critical, urgent, upcoming, completed, inProgress };
  }, [data]);

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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-2 mb-1">
            <ArrowsClockwise className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Total
            </span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Renovaciones</p>
        </div>

        {/* Criticas (0-30 dias) */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Warning className="w-5 h-5 text-red-200" weight="fill" />
            <span className="text-sm font-medium text-red-100">Criticas</span>
          </div>
          <p className="text-2xl font-bold">{stats.critical}</p>
          <p className="text-xs text-red-200 mt-1">0-30 dias</p>
        </div>

        {/* Urgentes (31-60 dias) */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Urgentes
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{stats.urgent}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">31-60 dias</p>
        </div>

        {/* Proximas (61-90 dias) */}
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Proximas
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{stats.upcoming}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">61-90 dias</p>
        </div>

        {/* Completadas */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" weight="fill" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Completadas
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{stats.completed}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Este mes</p>
        </div>
      </div>

      {/* Filter Tabs and Status Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
            Todos
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-neutral-200 dark:bg-neutral-700">
              {bucketCounts.all}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('0-30')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '0-30'
                ? 'bg-white dark:bg-[#1a1a1c] text-red-700 dark:text-red-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            Criticas
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
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
            Urgentes
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {bucketCounts['31-60']}
            </span>
          </button>
          <button
            onClick={() => setBucketFilter('61-90')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              bucketFilter === '61-90'
                ? 'bg-white dark:bg-[#1a1a1c] text-blue-700 dark:text-blue-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            Proximas
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              {bucketCounts['61-90']}
            </span>
          </button>
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-500 dark:text-neutral-400">Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="notified">Notificado</option>
            <option value="negotiating">Negociando</option>
            <option value="approved">Aprobado</option>
            <option value="signed">Firmado</option>
            <option value="completed">Completado</option>
            <option value="terminated">Terminado</option>
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
            className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
          >
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {selectedItems.size} seleccionados
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  Notificar
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  Iniciar renovacion
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
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
              <SortableHeader field="propertyTitle">Propiedad</SortableHeader>
              <SortableHeader field="tenantName">Inquilino</SortableHeader>
              <SortableHeader field="propietarioName">Propietario</SortableHeader>
              <th className="p-4 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Vencimiento
              </th>
              <SortableHeader field="daysUntilExpiry">Dias</SortableHeader>
              <SortableHeader field="currentRent">Canon Actual</SortableHeader>
              <th className="p-4 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Propuesto
              </th>
              <SortableHeader field="status">Estado</SortableHeader>
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
                      {formatDate(item.leaseEndDate)}
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
                      {formatCurrency(item.currentRent)}
                    </span>
                  </td>

                  {/* Proposed Rent */}
                  <td className="p-4">
                    {item.proposedRent && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(item.negotiatedRent || item.proposedRent)}
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
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === item.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-52 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                          >
                            {onViewDetails && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewDetails(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm">Ver detalles</span>
                              </button>
                            )}
                            {onNotifyTenant && item.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNotifyTenant(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Bell className="w-4 h-4" />
                                <span className="text-sm">Notificar inquilino</span>
                              </button>
                            )}
                            {onStartRenewal && ['pending', 'notified'].includes(item.status) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartRenewal(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              >
                                <ArrowsClockwise className="w-4 h-4" />
                                <span className="text-sm">Iniciar negociacion</span>
                              </button>
                            )}
                            {onCalculateIPC && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCalculateIPC(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Calculator className="w-4 h-4" />
                                <span className="text-sm">Calcular IPC</span>
                              </button>
                            )}
                            {onViewHistory && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewHistory(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <ClockCounterClockwise className="w-4 h-4" />
                                <span className="text-sm">Ver historial</span>
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
              <CheckSquare className="w-8 h-8 text-emerald-600 dark:text-emerald-400" weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              Sin renovaciones pendientes
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {bucketFilter === 'all' && statusFilter === 'all'
                ? 'No hay contratos por renovar en los proximos 90 dias'
                : `No hay renovaciones con los filtros seleccionados`}
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

export default RenovacionesTable;
