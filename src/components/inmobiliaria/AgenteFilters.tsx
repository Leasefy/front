'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconButton, Chip } from '@leasefy/cadence';
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
const STATUS_VALUES: (AgenteStatus | 'all')[] = ['all', 'active', 'invited', 'inactive', 'on_leave'];
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

  const ROLE_OPTIONS: { value: AgenteRole | 'all'; label: string }[] = [
    { value: 'all', label: t('inmobiliaria.agente.all') },
    { value: 'agent', label: t('inmobiliaria.agente.roleAgent') },
    { value: 'coordinator', label: t('inmobiliaria.agente.roleCoordinator') },
    { value: 'director', label: t('inmobiliaria.agente.roleDirector') },
  ];

  const STATUS_OPTIONS: { value: AgenteStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('inmobiliaria.agente.all') },
    { value: 'active', label: t('inmobiliaria.agente.statusActive') },
    { value: 'invited', label: t('inmobiliaria.agente.statusInvited') },
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

  return (
    <div>
      {/* Search and Actions Bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder={t('inmobiliaria.agente.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4"
          />
          {filters.search && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('search', '')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              icon={<X className="w-4 h-4 text-muted-foreground" />}
            />
          )}
        </div>

        {/* Filter Toggle */}
        <Chip
          selected={showFilters || activeFiltersCount > 0}
          onClick={() => setShowFilters(!showFilters)}
          icon={<Funnel className="w-4 h-4" />}
          aria-expanded={showFilters}
        >
          {t('inmobiliaria.agente.filters')}
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums text-xs font-semibold min-w-[20px] text-center">
              {activeFiltersCount}
            </span>
          )}
        </Chip>
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
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t('inmobiliaria.agente.role')}
                  </label>
                  <Select
                    value={filters.role}
                    onValueChange={(value) => updateFilter('role', value as AgenteRole | 'all')}
                  >
                    <SelectTrigger className="min-w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t('inmobiliaria.agente.status')}
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => updateFilter('status', value as AgenteStatus | 'all')}
                  >
                    <SelectTrigger className="min-w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t('inmobiliaria.agente.sortBy')}
                  </label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => updateFilter('sortBy', value as AgenteFiltersState['sortBy'])}
                  >
                    <SelectTrigger className="min-w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="link"
                  hideArrow
                  onClick={clearAllFilters}
                  className="mt-4 px-0"
                >
                  {t('inmobiliaria.agente.clearFilters')}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgenteFilters;
