'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  SortAscending,
  SortDescending,
  CaretDown,
  Buildings,
  User,
  Warning,
  DotsThree,
  PencilSimple,
  Eye,
  TrashSimple,
  Envelope,
  Phone,
  X,
  Export,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'name' | 'propertyCount' | 'totalMonthlyRent' | 'pendingBalance' | 'lastPaymentDate';
type SortDirection = 'asc' | 'desc';

interface PropietarioTableProps {
  propietarios: Propietario[];
  onView: (propietario: Propietario) => void;
  onEdit: (propietario: Propietario) => void;
  onDelete: (propietario: Propietario) => void;
  onExport?: () => void;
}

/**
 * PropietarioTable - Full-featured data table for propietarios
 * Includes search, filters, sorting, and row actions
 */
export function PropietarioTable({
  propietarios,
  onView,
  onEdit,
  onDelete,
  onExport,
}: PropietarioTableProps) {
  const { t, locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterPending, setFilterPending] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'person' | 'company'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort propietarios
  const filteredPropietarios = useMemo(() => {
    let result = [...propietarios];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          p.documentNumber.includes(query) ||
          p.phone.includes(query)
      );
    }

    // Pending balance filter
    if (filterPending) {
      result = result.filter((p) => p.pendingBalance > 0);
    }

    // Type filter
    if (filterType === 'person') {
      result = result.filter((p) => p.documentType !== 'NIT');
    } else if (filterType === 'company') {
      result = result.filter((p) => p.documentType === 'NIT');
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortField] ?? '';
      let bVal: string | number = b[sortField] ?? '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [propietarios, searchQuery, sortField, sortDirection, filterPending, filterType]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const activeFiltersCount = [filterPending, filterType !== 'all'].filter(Boolean).length;

  return (
    <div>
      {/* Search and Filters Bar */}
      <div className="p-4 space-y-4 border-b border-border">
        {/* Row 1: Search + Export */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('inmobiliaria.propietario.table.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-medium"
            >
              <Export className="w-4 h-4" />
              <span className="text-sm">{t('inmobiliaria.propietario.table.export')}</span>
            </button>
          )}
        </div>

        {/* Row 2: Inline Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
            {[
              { value: 'all', label: t('inmobiliaria.propietario.table.all') },
              { value: 'person', label: t('inmobiliaria.propietario.table.person') },
              { value: 'company', label: t('inmobiliaria.propietario.table.company') },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value as typeof filterType)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filterType === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-border" />

          {/* Pending Balance Toggle */}
          <button
            onClick={() => setFilterPending(!filterPending)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filterPending
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            )}
          >
            <Warning className="w-4 h-4" />
            {t('inmobiliaria.propietario.table.withPendingBalance')}
          </button>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterPending(false);
                setFilterType('all');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Funnel className="w-4 h-4" weight="fill" />
              {t('inmobiliaria.propietario.table.clear')}
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Results Count */}
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {filteredPropietarios.length} {t('inmobiliaria.propietario.table.of')} {propietarios.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  {t('inmobiliaria.propietario.table.owner')}
                  {sortField === 'name' && <SortIcon className="w-3.5 h-3.5" />}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('propertyCount')}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  {t('inmobiliaria.propietario.table.properties')}
                  {sortField === 'propertyCount' && <SortIcon className="w-3.5 h-3.5" />}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('totalMonthlyRent')}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  {t('inmobiliaria.propietario.table.monthlyRent')}
                  {sortField === 'totalMonthlyRent' && <SortIcon className="w-3.5 h-3.5" />}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('pendingBalance')}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  {t('inmobiliaria.propietario.table.pending')}
                  {sortField === 'pendingBalance' && <SortIcon className="w-3.5 h-3.5" />}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('lastPaymentDate')}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  {t('inmobiliaria.propietario.table.lastPayment')}
                  {sortField === 'lastPaymentDate' && <SortIcon className="w-3.5 h-3.5" />}
                </button>
              </th>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPropietarios.map((propietario, index) => {
              const isCompany = propietario.documentType === 'NIT';
              const hasPending = propietario.pendingBalance > 0;

              return (
                <motion.tr
                  key={propietario.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onView(propietario)}
                  className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  {/* Propietario */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          isCompany
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        )}
                      >
                        {isCompany ? <Buildings className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {propietario.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {propietario.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Properties */}
                  <td className="p-4">
                    <div>
                      <span className="font-semibold text-foreground tabular-nums">
                        {propietario.propertyCount}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({propietario.activeLeases} {t('inmobiliaria.propietario.table.rented')})
                      </span>
                    </div>
                  </td>

                  {/* Monthly Rent */}
                  <td className="p-4">
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(propietario.totalMonthlyRent)}
                    </span>
                  </td>

                  {/* Pending Balance */}
                  <td className="p-4">
                    {hasPending ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium tabular-nums">
                        <Warning className="w-3.5 h-3.5" />
                        {formatCurrency(propietario.pendingBalance)}
                      </span>
                    ) : (
                      <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                        {t('inmobiliaria.propietario.table.upToDate')}
                      </span>
                    )}
                  </td>

                  {/* Last Payment */}
                  <td className="p-4">
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {propietario.lastPaymentDate
                        ? new Date(propietario.lastPaymentDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === propietario.id ? null : propietario.id);
                        }}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <DotsThree className="w-5 h-5 text-muted-foreground" weight="bold" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === propietario.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-border bg-card shadow-xl z-10"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onView(propietario);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.propietario.table.viewDetail')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(propietario);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                            >
                              <PencilSimple className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.propietario.table.edit')}</span>
                            </button>
                            <a
                              href={`mailto:${propietario.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                            >
                              <Envelope className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.propietario.table.sendEmail')}</span>
                            </a>
                            <a
                              href={`tel:${propietario.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.propietario.table.call')}</span>
                            </a>
                            <div className="h-px bg-border my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(propietario);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <TrashSimple className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.propietario.table.delete')}</span>
                            </button>
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
        {filteredPropietarios.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {t('inmobiliaria.propietario.table.noResults')}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? t('inmobiliaria.propietario.table.tryOtherTerms')
                : t('inmobiliaria.propietario.table.addFirstOwner')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropietarioTable;
