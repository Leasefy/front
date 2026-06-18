'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';

export interface AgenteFiltersState {
  search: string;
  role: AgenteRole | 'all';
  status: AgenteStatus | 'all';
  sortBy: 'name' | 'closedThisMonth' | 'commissionsThisMonth';
}

interface AgenteFiltersProps {
  filters: AgenteFiltersState;
  onFiltersChange: (filters: AgenteFiltersState) => void;
  agentes: Agente[];
}

// Role/status/sort option values - labels are translated in component
const ROLE_VALUES: (AgenteRole | 'all')[] = ['all', 'agent', 'coordinator', 'director'];
const STATUS_VALUES: (AgenteStatus | 'all')[] = ['all', 'active', 'inactive', 'on_leave'];
const SORT_VALUES: AgenteFiltersState['sortBy'][] = ['name', 'closedThisMonth', 'commissionsThisMonth'];

/**
 * AgenteFilters - Filter bar for agentes page
 * Includes search, role, status, and sort filters
 */
export function AgenteFilters({
  filters,
  onFiltersChange,
  agentes,
}: AgenteFiltersProps) {
  const { t } = useI18n();
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const ROLE_OPTIONS: { value: AgenteRole | 'all'; label: string }[] = [
    { value: 'all', label: t('inmobiliaria.agente.all') },
    { value: 'agent', label: t('inmobiliaria.agente.roleAgent') },
    { value: 'coordinator', label: t('inmobiliaria.agente.roleCoordinator') },
    { value: 'director', label: t('inmobiliaria.agente.roleDirector') },
  ];

  const STATUS_OPTIONS: { value: AgenteStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('inmobiliaria.agente.all') },
    { value: 'active', label: t('inmobiliaria.agente.statusActive') },
    { value: 'inactive', label: t('inmobiliaria.agente.statusInactive') },
    { value: 'on_leave', label: t('inmobiliaria.agente.statusOnLeaveShort') },
  ];

  const SORT_OPTIONS: { value: AgenteFiltersState['sortBy']; label: string }[] = [
    { value: 'name', label: t('inmobiliaria.agente.name') },
    { value: 'closedThisMonth', label: t('inmobiliaria.agente.closingsMonth') },
    { value: 'commissionsThisMonth', label: t('inmobiliaria.agente.commissions') },
  ];

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.role !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.sortBy !== 'name') count++;
    return count;
  }, [filters]);

  const updateFilter = <K extends keyof AgenteFiltersState>(
    key: K,
    value: AgenteFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      role: 'all',
      status: 'all',
      sortBy: 'name',
    });
  };

  // Get labels for current selections
  const getRoleLabel = () => {
    const option = ROLE_OPTIONS.find((o) => o.value === filters.role);
    return option?.label || t('inmobiliaria.agente.all');
  };

  const getStatusLabel = () => {
    const option = STATUS_OPTIONS.find((o) => o.value === filters.status);
    return option?.label || t('inmobiliaria.agente.all');
  };

  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((o) => o.value === filters.sortBy);
    return option?.label || t('inmobiliaria.agente.name');
  };

  return (
    <div>
      {/* Search and Actions Bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('inmobiliaria.agente.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-md border transition-all',
            showFilters || activeFiltersCount > 0
              ? 'border-primary/30 bg-primary-soft text-primary'
              : 'border-border bg-background text-fg-muted hover:text-fg hover:border-fg/30'
          )}
        >
          <Funnel className="w-4 h-4" />
          <span className="text-sm font-medium">{t('inmobiliaria.agente.filters')}</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums text-xs font-semibold min-w-[20px] text-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-4 bg-muted/30">
              <div className="flex flex-wrap gap-4">
                {/* Role Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t('inmobiliaria.agente.role')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-all min-w-[130px] justify-between',
                      filters.role !== 'all'
                        ? 'border-primary/30 bg-primary-soft text-primary'
                        : 'border-border bg-background text-fg-muted hover:bg-muted'
                    )}
                  >
                    <span>{getRoleLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'role' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-border bg-card z-20"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { updateFilter('role', option.value); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-md text-left text-sm transition-colors',
                              filters.role === option.value
                                ? 'bg-primary-soft text-primary'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t('inmobiliaria.agente.status')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-all min-w-[130px] justify-between',
                      filters.status !== 'all'
                        ? 'border-primary/30 bg-primary-soft text-primary'
                        : 'border-border bg-background text-fg-muted hover:bg-muted'
                    )}
                  >
                    <span>{getStatusLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'status' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-border bg-card z-20"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { updateFilter('status', option.value); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-md text-left text-sm transition-colors',
                              filters.status === option.value
                                ? 'bg-primary-soft text-primary'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sort Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t('inmobiliaria.agente.sortBy')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'sortBy' ? null : 'sortBy')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-all min-w-[130px] justify-between',
                      filters.sortBy !== 'name'
                        ? 'border-primary/30 bg-primary-soft text-primary'
                        : 'border-border bg-background text-fg-muted hover:bg-muted'
                    )}
                  >
                    <span>{getSortLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'sortBy' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-border bg-card z-20"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { updateFilter('sortBy', option.value); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-md text-left text-sm transition-colors',
                              filters.sortBy === option.value
                                ? 'bg-primary-soft text-primary'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-primary underline-offset-4 hover:underline font-medium"
                >
                  {t('inmobiliaria.agente.clearFilters')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdown on click outside */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

export default AgenteFilters;
