'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
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
  }, [data.length, currentPage, totalPages]);

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
              <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] font-medium text-xs">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#111827] truncate">{name}</p>
              {subtitle && (
                <p className="text-[11px] text-[#9CA3AF] truncate">{subtitle}</p>
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
            <span className="text-[11px] font-medium text-[#6B7280] w-8">
              {Math.round(progressValue)}%
            </span>
          </div>
        );

      case 'date':
        const date = value instanceof Date ? value : new Date(String(value));
        return (
          <span className="text-sm text-[#6B7280]">
            {date.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        );

      case 'currency':
        return (
          <span className="text-sm font-medium text-[#111827]">
            ${Number(value).toLocaleString('es-CL')}
          </span>
        );

      case 'badge':
        return (
          <span className="px-2 py-0.5 bg-[#F3F4F6] text-[11px] font-medium text-[#6B7280]">
            {String(value)}
          </span>
        );

      default:
        return (
          <span className="text-sm text-[#111827]">{String(value || '-')}</span>
        );
    }
  };

  if (loading) {
    return (
      <div className={cn('bg-white border border-[#E5E7EB] overflow-hidden', className)}>
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#E5E7EB] border-t-[#22C55E] rounded-full mx-auto" />
          <p className="text-[13px] text-[#9CA3AF] mt-3">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white border border-[#E5E7EB] overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={cn(
            'border-b border-[#E5E7EB]',
            stickyHeader && 'sticky top-0 z-10 bg-white'
          )}>
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <button
                    onClick={handleSelectAll}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      allSelected
                        ? 'bg-[#111827] border-[#111827] text-white'
                        : someSelected
                          ? 'bg-[#111827]/10 border-[#111827]'
                          : 'border-[#D1D5DB] hover:border-[#9CA3AF]'
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
                    'px-3 py-2.5 text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:text-[#6B7280] select-none'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <span className="text-[#D1D5DB]">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-10 text-center text-[13px] text-[#9CA3AF]"
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
                      isSelected && 'bg-[#FEFCE8]',
                      onRowClick && 'cursor-pointer hover:bg-[#F9FAFB]',
                      !isSelected && !onRowClick && 'hover:bg-[#FAFAFA]'
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
                              ? 'bg-[#111827] border-[#111827] text-white'
                              : 'border-[#D1D5DB] hover:border-[#9CA3AF]'
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">
            Mostrando {startIndex + 1}-{Math.min(endIndex, sortedData.length)} de {sortedData.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors',
                currentPage === 1
                  ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
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
                      ? 'bg-[#111827] text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]'
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
                  ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]'
              )}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
