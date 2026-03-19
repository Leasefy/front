'use client';

import { useState, useMemo } from 'react';
import { CaretDown, CaretUp, CaretUpDown, Check, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { PlanProgressBar } from './PlanProgressBar';
import { PlanStatusBadge, PlanStatusType } from './PlanStatusBadge';

export interface PlanTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  // Built-in renderers
  type?: 'text' | 'avatar' | 'status' | 'progress' | 'date' | 'currency' | 'badge';
  statusKey?: keyof T; // For status type
  progressKey?: keyof T; // For progress type
  avatarKey?: keyof T; // For avatar (image url)
  nameKey?: keyof T; // For avatar name
  subtitleKey?: keyof T; // For avatar subtitle
}

export interface PlanTableProps<T> {
  data: T[];
  columns: PlanTableColumn<T>[];
  keyExtractor: (row: T) => string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  stickyHeader?: boolean;
  // Pagination props
  pagination?: boolean;
  pageSize?: number;
}

export function PlanTable<T extends object>({
  data,
  columns,
  keyExtractor,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No hay datos disponibles',
  loading = false,
  className,
  stickyHeader = false,
  pagination = false,
  pageSize = 5,
}: PlanTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const allSelected = data.length > 0 && selectedKeys.length === data.length;
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(keyExtractor));
    }
  };

  const handleSelectRow = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter(k => k !== key));
    } else {
      onSelectionChange?.([...selectedKeys, key]);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortConfig.key];
      const bVal = (b as Record<string, unknown>)[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Pagination calculations
  const totalPages = pagination ? Math.ceil(sortedData.length / pageSize) : 1;
  const startIndex = pagination ? (currentPage - 1) * pageSize : 0;
  const endIndex = pagination ? startIndex + pageSize : sortedData.length;
  const paginatedData = pagination ? sortedData.slice(startIndex, endIndex) : sortedData;

  // Reset to page 1 when data changes
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const renderCell = (row: T, column: PlanTableColumn<T>, index: number) => {
    if (column.render) {
      return column.render(row, index);
    }

    const value = row[column.key as keyof T];

    switch (column.type) {
      case 'avatar':
        const avatarUrl = column.avatarKey ? row[column.avatarKey] : null;
        const name = column.nameKey ? String(row[column.nameKey] || '') : '';
        const subtitle = column.subtitleKey ? String(row[column.subtitleKey] || '') : '';
        return (
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img
                src={String(avatarUrl)}
                alt={name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-plan-secondary font-medium text-xs">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-plan-primary truncate">{name}</p>
              {subtitle && (
                <p className="text-[11px] text-plan-muted truncate">{subtitle}</p>
              )}
            </div>
          </div>
        );

      case 'status':
        const statusValue = column.statusKey ? row[column.statusKey] : value;
        return (
          <PlanStatusBadge
            status={String(statusValue) as PlanStatusType}
            size="sm"
          />
        );

      case 'progress':
        const progressValue = column.progressKey ? Number(row[column.progressKey]) : Number(value);
        return (
          <div className="flex items-center gap-2">
            <div className="w-20">
              <PlanProgressBar value={progressValue} size="sm" />
            </div>
            <span className="text-[11px] font-medium text-plan-secondary w-8">
              {Math.round(progressValue)}%
            </span>
          </div>
        );

      case 'date':
        const date = value instanceof Date ? value : new Date(String(value));
        return (
          <span className="text-sm text-plan-secondary">
            {date.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        );

      case 'currency':
        return (
          <span className="text-sm font-medium text-plan-primary">
            ${Number(value).toLocaleString('es-CL')}
          </span>
        );

      case 'badge':
        return (
          <span className="px-2 py-0.5 bg-muted text-[11px] font-medium text-plan-secondary">
            {String(value)}
          </span>
        );

      default:
        return (
          <span className="text-sm text-plan-primary">{String(value || '-')}</span>
        );
    }
  };

  if (loading) {
    return (
      <div className={cn('bg-white dark:bg-card border border-plan-border overflow-hidden', className)}>
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-plan-border border-t-plan-status-green rounded-full mx-auto" />
          <p className="text-[13px] text-plan-muted mt-3">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-card border border-plan-border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={cn(
            'border-b border-plan-border',
            stickyHeader && 'sticky top-0 z-10 bg-white dark:bg-card'
          )}>
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <button
                    onClick={handleSelectAll}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      allSelected
                        ? 'bg-primary border-primary text-white'
                        : someSelected
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:border-plan-muted'
                    )}
                  >
                    {(allSelected || someSelected) && <Check className="w-2.5 h-2.5" />}
                  </button>
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-2.5 text-left text-[11px] font-normal text-plan-muted font-mono uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:text-plan-secondary select-none'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <span className="text-muted-foreground">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <CaretUp className="w-3 h-3" />
                          ) : (
                            <CaretDown className="w-3 h-3" />
                          )
                        ) : (
                          <CaretUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-10 text-center text-[13px] text-plan-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const key = keyExtractor(row);
                const isSelected = selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    className={cn(
                      'transition-colors duration-100',
                      isSelected && 'bg-yellow-50',
                      onRowClick && 'cursor-pointer hover:bg-muted',
                      !isSelected && !onRowClick && 'hover:bg-muted'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="w-10 px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleSelectRow(key)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-border hover:border-plan-muted'
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </button>
                      </td>
                    )}
                    {columns.map(column => (
                      <td key={column.key} className="px-3 py-2.5">
                        {renderCell(row, column, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && sortedData.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-plan-border">
          <p className="text-sm text-plan-secondary">
            Mostrando {startIndex + 1}-{Math.min(endIndex, sortedData.length)} de {sortedData.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors',
                currentPage === 1
                  ? 'bg-muted text-plan-muted cursor-not-allowed'
                  : 'bg-muted text-plan-secondary hover:bg-muted hover:text-plan-primary'
              )}
            >
              <CaretLeft className="w-4 h-4" />
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-8 h-8 text-sm font-medium rounded-sm transition-colors',
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'bg-muted text-plan-secondary hover:bg-muted hover:text-plan-primary'
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors',
                currentPage === totalPages
                  ? 'bg-muted text-plan-muted cursor-not-allowed'
                  : 'bg-muted text-plan-secondary hover:bg-muted hover:text-plan-primary'
              )}
            >
              Siguiente
              <CaretRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
