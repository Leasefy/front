'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
  CaretLeft,
  CaretRight,
  CalendarBlank,
  User,
  PaperPlaneTilt,
  DownloadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { DispersionStatus } from '@/lib/types/inmobiliaria';

export interface DispersionFiltersState {
  month: string; // '2026-02'
  status: DispersionStatus | 'all';
  propietarioId: string | 'all';
  search: string;
}

interface PropietarioOption {
  id: string;
  name: string;
}

interface DispersionFiltersProps {
  filters: DispersionFiltersState;
  onFiltersChange: (filters: DispersionFiltersState) => void;
  propietarios: PropietarioOption[];
  statusCounts: Record<DispersionStatus | 'all', number>;
  onGenerateDispersiones?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

// Status tabs configuration
const STATUS_TABS: { value: DispersionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'processing', label: 'Procesando' },
  { value: 'completed', label: 'Completadas' },
  { value: 'failed', label: 'Fallidas' },
];

/**
 * Parse month string to date
 */
function parseMonth(month: string): Date {
  const [year, monthNum] = month.split('-');
  return new Date(parseInt(year), parseInt(monthNum) - 1, 1);
}

/**
 * Format month string (2026-02) to Spanish display (Febrero 2026)
 */
function formatMonth(month: string): string {
  const date = parseMonth(month);
  return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

/**
 * Navigate to previous or next month
 */
function navigateMonth(currentMonth: string, direction: 'prev' | 'next'): string {
  const date = parseMonth(currentMonth);
  date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get last N months including current month
 */
function getRecentMonths(count: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
    months.push({ value, label });
  }

  return months;
}

/**
 * DispersionFilters - Filter bar for dispersiones (disbursements) page
 * Includes month navigation, status tabs, propietario filter, and quick actions
 */
export function DispersionFilters({
  filters,
  onFiltersChange,
  propietarios,
  statusCounts,
  onGenerateDispersiones,
  onExportExcel,
  onExportPdf,
}: DispersionFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // Recent months for dropdown
  const recentMonths = useMemo(() => getRecentMonths(12), []);

  // Count active filters (excluding month and default status)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.propietarioId !== 'all') count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof DispersionFiltersState>(
      key: K,
      value: DispersionFiltersState[K]
    ) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    const currentMonth = recentMonths[0]?.value || filters.month;
    onFiltersChange({
      month: currentMonth,
      status: 'all',
      propietarioId: 'all',
      search: '',
    });
    setSearchInput('');
  }, [recentMonths, filters.month, onFiltersChange]);

  // Get current propietario name
  const getPropietarioLabel = () => {
    if (filters.propietarioId === 'all') return 'Todos';
    const propietario = propietarios.find((p) => p.id === filters.propietarioId);
    return propietario?.name || 'Todos';
  };

  // Check if current month is the most recent
  const isCurrentMonth = recentMonths[0]?.value === filters.month;

  return (
    <div className="space-y-4">
      {/* Month Navigation and Quick Actions */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        {/* Month Selector with Navigation */}
        <div className="flex items-center gap-2">
          {/* Previous Month */}
          <button
            onClick={() => updateFilter('month', navigateMonth(filters.month, 'prev'))}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-[#141416] transition-all"
            aria-label="Mes anterior"
          >
            <CaretLeft className="w-5 h-5" />
          </button>

          {/* Month Dropdown */}
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === 'month' ? null : 'month')
              }
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all min-w-[200px] justify-between"
            >
              <div className="flex items-center gap-2">
                <CalendarBlank className="w-5 h-5 text-neutral-400" />
                <span className="font-medium capitalize">
                  {formatMonth(filters.month)}
                </span>
              </div>
              <CaretDown className="w-4 h-4 text-neutral-400" />
            </button>
            <AnimatePresence>
              {openDropdown === 'month' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-64 overflow-y-auto"
                >
                  {recentMonths.map((month) => (
                    <button
                      key={month.value}
                      onClick={() => {
                        updateFilter('month', month.value);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-left text-sm capitalize transition-colors',
                        filters.month === month.value
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      )}
                    >
                      {month.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Next Month */}
          <button
            onClick={() => updateFilter('month', navigateMonth(filters.month, 'next'))}
            disabled={isCurrentMonth}
            className={cn(
              'p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] transition-all',
              isCurrentMonth
                ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                : 'text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-[#141416]'
            )}
            aria-label="Mes siguiente"
          >
            <CaretRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {onGenerateDispersiones && (
            <button
              onClick={onGenerateDispersiones}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium text-sm hover:bg-indigo-600 transition-colors"
            >
              <PaperPlaneTilt className="w-4 h-4" />
              Generar Dispersiones
            </button>
          )}

          {/* Export Dropdown */}
          {(onExportExcel || onExportPdf) && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all"
              >
                <DownloadSimple className="w-4 h-4" />
                Exportar
                <CaretDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
                  >
                    {onExportExcel && (
                      <button
                        onClick={() => {
                          onExportExcel();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Excel (.xlsx)
                      </button>
                    )}
                    {onExportPdf && (
                      <button
                        onClick={() => {
                          onExportPdf();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        PDF
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.value] || 0;
          const isActive = filters.status === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => updateFilter('status', tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center',
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Propietario Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por propietario..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilter('search', '');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Propietario Filter + Active Filters */}
        <div className="flex items-center gap-3">
          {/* Propietario Dropdown */}
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === 'propietario' ? null : 'propietario')
              }
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[180px] justify-between border',
                filters.propietarioId !== 'all'
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[120px]">
                  {getPropietarioLabel()}
                </span>
              </div>
              <CaretDown className="w-4 h-4 shrink-0" />
            </button>
            <AnimatePresence>
              {openDropdown === 'propietario' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 w-64 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-64 overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      updateFilter('propietarioId', 'all');
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      filters.propietarioId === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    Todos los propietarios
                  </button>
                  {propietarios.map((propietario) => (
                    <button
                      key={propietario.id}
                      onClick={() => {
                        updateFilter('propietarioId', propietario.id);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors truncate',
                        filters.propietarioId === propietario.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      )}
                    >
                      {propietario.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Filters Indicator */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Funnel className="w-4 h-4" weight="fill" />
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Close dropdowns on click outside */}
      {(openDropdown || showExportMenu) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setOpenDropdown(null);
            setShowExportMenu(false);
          }}
        />
      )}
    </div>
  );
}

export default DispersionFilters;
