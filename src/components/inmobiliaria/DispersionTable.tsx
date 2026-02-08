'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  PaperPlaneTilt,
  SpinnerGap,
  CheckCircle,
  Warning,
  User,
  Bank,
  ArrowsClockwise,
  DownloadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Dispersion, DispersionStatus } from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getDispersionStatusColor,
  getDispersionStatusLabel,
} from '@/lib/types/inmobiliaria';

type SortField =
  | 'propietarioName'
  | 'month'
  | 'properties'
  | 'totalCollected'
  | 'totalCommission'
  | 'netToPropietario'
  | 'status'
  | 'processedAt';
type SortDirection = 'asc' | 'desc';

interface DispersionTableProps {
  dispersiones: Dispersion[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onViewDetail?: (dispersion: Dispersion) => void;
  onProcess?: (dispersion: Dispersion) => void;
  onDownloadExtracto?: (dispersion: Dispersion) => void;
  showSummary?: boolean;
}

/**
 * Format month string (2026-02) to Spanish display (Feb 2026)
 */
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

/**
 * DispersionTable - Full-featured data table for dispersiones (disbursements)
 * Includes sorting, row actions, and optional summary row
 */
export function DispersionTable({
  dispersiones,
  onSort,
  onViewDetail,
  onProcess,
  onDownloadExtracto,
  showSummary = false,
}: DispersionTableProps) {
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sort dispersiones
  const sortedDispersiones = useMemo(() => {
    const result = [...dispersiones];

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'propietarioName':
          aVal = a.propietarioName.toLowerCase();
          bVal = b.propietarioName.toLowerCase();
          break;
        case 'month':
          aVal = a.month;
          bVal = b.month;
          break;
        case 'properties':
          aVal = a.items.length;
          bVal = b.items.length;
          break;
        case 'totalCollected':
          aVal = a.totalCollected;
          bVal = b.totalCollected;
          break;
        case 'totalCommission':
          aVal = a.totalCommission;
          bVal = b.totalCommission;
          break;
        case 'netToPropietario':
          aVal = a.netToPropietario;
          bVal = b.netToPropietario;
          break;
        case 'status':
          const statusOrder: Record<DispersionStatus, number> = {
            failed: 0,
            pending: 1,
            processing: 2,
            completed: 3,
          };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'processedAt':
          aVal = a.processedAt || '';
          bVal = b.processedAt || '';
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [dispersiones, sortField, sortDirection]);

  // Calculate summary totals
  const summary = useMemo(() => {
    return dispersiones.reduce(
      (acc, d) => ({
        totalCollected: acc.totalCollected + d.totalCollected,
        totalCommissions: acc.totalCommissions + d.totalCommission,
        totalToDisburse: acc.totalToDisburse + d.netToPropietario,
        pending: acc.pending + (d.status === 'pending' ? 1 : 0),
        processing: acc.processing + (d.status === 'processing' ? 1 : 0),
        completed: acc.completed + (d.status === 'completed' ? 1 : 0),
        failed: acc.failed + (d.status === 'failed' ? 1 : 0),
      }),
      {
        totalCollected: 0,
        totalCommissions: 0,
        totalToDisburse: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      }
    );
  }, [dispersiones]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      onSort?.(field, newDirection);
    } else {
      setSortField(field);
      setSortDirection('asc');
      onSort?.(field, 'asc');
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
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="border-b border-neutral-100 dark:border-neutral-800">
            <SortableHeader field="propietarioName">Propietario</SortableHeader>
            <SortableHeader field="month">Mes</SortableHeader>
            <SortableHeader field="properties">Propiedades</SortableHeader>
            <SortableHeader field="totalCollected">Recaudado</SortableHeader>
            <SortableHeader field="totalCommission">Comision</SortableHeader>
            <SortableHeader field="netToPropietario">Neto</SortableHeader>
            <SortableHeader field="status">Estado</SortableHeader>
            <SortableHeader field="processedAt">Fecha Pago</SortableHeader>
            <th className="w-12 p-4"></th>
          </tr>
        </thead>
        <tbody>
          {sortedDispersiones.map((dispersion, index) => {
            const statusColor = getDispersionStatusColor(dispersion.status);
            const statusLabel = getDispersionStatusLabel(dispersion.status);

            return (
              <motion.tr
                key={dispersion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onViewDetail?.(dispersion)}
                className={cn(
                  'border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#141416] cursor-pointer transition-colors',
                  dispersion.status === 'completed' && 'opacity-75'
                )}
              >
                {/* Propietario */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[180px]">
                        {dispersion.propietarioName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[180px]">
                        <Bank className="w-3 h-3" />
                        <span>
                          {dispersion.propietarioBankAccount.accountNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Month */}
                <td className="p-4">
                  <span className="text-neutral-700 dark:text-neutral-300 capitalize">
                    {formatMonth(dispersion.month)}
                  </span>
                </td>

                {/* Properties Count */}
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                    {dispersion.items.length}
                  </span>
                </td>

                {/* Total Collected */}
                <td className="p-4">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(dispersion.totalCollected)}
                  </span>
                </td>

                {/* Commission */}
                <td className="p-4">
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {formatCurrency(dispersion.totalCommission)}
                  </span>
                </td>

                {/* Net Amount */}
                <td className="p-4">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(dispersion.netToPropietario)}
                  </span>
                </td>

                {/* Status */}
                <td className="p-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                      statusColor
                    )}
                  >
                    {dispersion.status === 'processing' && (
                      <SpinnerGap className="w-3 h-3 animate-spin" />
                    )}
                    {statusLabel}
                  </span>
                </td>

                {/* Payment Date */}
                <td className="p-4">
                  {dispersion.status === 'completed' && dispersion.processedAt ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" weight="fill" />
                      <span className="text-sm">
                        {new Date(dispersion.processedAt).toLocaleDateString(
                          'es-CO',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </span>
                    </div>
                  ) : dispersion.status === 'failed' ? (
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                      <Warning className="w-4 h-4" weight="fill" />
                      <span className="text-sm">Error</span>
                    </div>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500">
                      —
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(
                          openMenuId === dispersion.id ? null : dispersion.id
                        );
                      }}
                      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <DotsThree
                        className="w-5 h-5 text-neutral-500"
                        weight="bold"
                      />
                    </button>

                    <AnimatePresence>
                      {openMenuId === dispersion.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail?.(dispersion);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">Ver detalle</span>
                          </button>

                          {dispersion.status === 'pending' && onProcess && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onProcess(dispersion);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <PaperPlaneTilt className="w-4 h-4" />
                              <span className="text-sm">Procesar</span>
                            </button>
                          )}

                          {dispersion.status === 'failed' && onProcess && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onProcess(dispersion);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            >
                              <ArrowsClockwise className="w-4 h-4" />
                              <span className="text-sm">Reintentar</span>
                            </button>
                          )}

                          {dispersion.status === 'completed' &&
                            onDownloadExtracto && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDownloadExtracto(dispersion);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <DownloadSimple className="w-4 h-4" />
                                <span className="text-sm">Descargar extracto</span>
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

        {/* Summary Row */}
        {showSummary && dispersiones.length > 0 && (
          <tfoot>
            <tr className="bg-neutral-50 dark:bg-[#141416] border-t-2 border-neutral-200 dark:border-neutral-700">
              <td colSpan={3} className="p-4">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Total ({dispersiones.length} dispersiones)
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    {summary.pending > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {summary.pending} pend.
                      </span>
                    )}
                    {summary.processing > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {summary.processing} proc.
                      </span>
                    )}
                    {summary.completed > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {summary.completed} comp.
                      </span>
                    )}
                    {summary.failed > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {summary.failed} fall.
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(summary.totalCollected)}
                </span>
              </td>
              <td className="p-4">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(summary.totalCommissions)}
                </span>
              </td>
              <td className="p-4">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalToDisburse)}
                </span>
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Empty State */}
      {sortedDispersiones.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <PaperPlaneTilt className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
            No hay dispersiones para mostrar
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Genera las dispersiones del mes para enviar pagos a los propietarios
          </p>
        </div>
      )}

      {/* Close dropdown on click outside */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}

export default DispersionTable;
