'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  CurrencyCircleDollar,
  Warning,
  CheckCircle,
  User,
  HouseLine,
  Envelope,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Cobro, CobroStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency, getCobroStatusColor } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'month' | 'totalAmount' | 'paidAmount' | 'pendingAmount' | 'status' | 'daysLate' | 'dueDate';
type SortDirection = 'asc' | 'desc';

interface CobroTableProps {
  cobros: Cobro[];
  onCobroClick?: (cobro: Cobro) => void;
  onRegisterPayment?: (cobro: Cobro) => void;
  showSummary?: boolean;
}

// Status labels in Spanish
const STATUS_LABELS: Record<CobroStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  late: 'En mora',
  defaulted: 'Incobrable',
};

/**
 * Format month string (2026-02) to Spanish display (Feb 2026)
 */
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

/**
 * CobroTable - Full-featured data table for collections (cobros)
 * Includes sorting, row actions, and optional summary row
 */
export function CobroTable({
  cobros,
  onCobroClick,
  onRegisterPayment,
  showSummary = false,
}: CobroTableProps) {
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sort cobros
  const sortedCobros = useMemo(() => {
    const result = [...cobros];

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
        case 'month':
          aVal = a.month;
          bVal = b.month;
          break;
        case 'totalAmount':
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case 'paidAmount':
          aVal = a.paidAmount;
          bVal = b.paidAmount;
          break;
        case 'pendingAmount':
          aVal = a.pendingAmount;
          bVal = b.pendingAmount;
          break;
        case 'status':
          const statusOrder: Record<CobroStatus, number> = {
            defaulted: 0,
            late: 1,
            pending: 2,
            partial: 3,
            paid: 4,
          };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'daysLate':
          aVal = a.daysLate;
          bVal = b.daysLate;
          break;
        case 'dueDate':
          aVal = a.dueDate;
          bVal = b.dueDate;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cobros, sortField, sortDirection]);

  // Calculate summary totals
  const summary = useMemo(() => {
    return cobros.reduce(
      (acc, cobro) => ({
        totalExpected: acc.totalExpected + cobro.totalAmount,
        totalCollected: acc.totalCollected + cobro.paidAmount,
        totalPending: acc.totalPending + cobro.pendingAmount,
      }),
      { totalExpected: 0, totalCollected: 0, totalPending: 0 }
    );
  }, [cobros]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th className={cn('text-left p-4', className)}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="border-b border-border">
            <SortableHeader field="propertyTitle">Propiedad</SortableHeader>
            <SortableHeader field="tenantName">Inquilino</SortableHeader>
            <SortableHeader field="month">Mes</SortableHeader>
            <SortableHeader field="totalAmount">Total</SortableHeader>
            <SortableHeader field="paidAmount">Pagado</SortableHeader>
            <SortableHeader field="pendingAmount">Pendiente</SortableHeader>
            <SortableHeader field="status">Estado</SortableHeader>
            <SortableHeader field="daysLate">Mora</SortableHeader>
            <th className="w-12 p-4"></th>
          </tr>
        </thead>
        <tbody>
          {sortedCobros.map((cobro, index) => {
            const statusColor = getCobroStatusColor(cobro.status);
            const statusLabel = STATUS_LABELS[cobro.status];

            return (
              <motion.tr
                key={cobro.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onCobroClick?.(cobro)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                {/* Property */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <HouseLine className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {cobro.propertyTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                        {cobro.propertyAddress}
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
                      <p className="font-medium text-foreground truncate max-w-[140px]">
                        {cobro.tenantName}
                      </p>
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${cobro.tenantEmail}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Enviar email"
                        >
                          <Envelope className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                        <a
                          href={`https://wa.me/${cobro.tenantPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          title="WhatsApp"
                        >
                          <WhatsappLogo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" weight="fill" />
                        </a>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Month */}
                <td className="p-4">
                  <span className="text-foreground capitalize">
                    {formatMonth(cobro.month)}
                  </span>
                </td>

                {/* Total */}
                <td className="p-4">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(cobro.totalAmount)}
                  </span>
                </td>

                {/* Paid */}
                <td className="p-4">
                  <span className={cn(
                    'font-medium',
                    cobro.paidAmount >= cobro.totalAmount
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : cobro.paidAmount > 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  )}>
                    {formatCurrency(cobro.paidAmount)}
                  </span>
                </td>

                {/* Pending */}
                <td className="p-4">
                  <span className={cn(
                    'font-medium',
                    cobro.pendingAmount > 0 && cobro.daysLate > 0
                      ? 'text-red-600 dark:text-red-400'
                      : cobro.pendingAmount > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                  )}>
                    {formatCurrency(cobro.pendingAmount)}
                  </span>
                </td>

                {/* Status */}
                <td className="p-4">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', statusColor)}>
                    {statusLabel}
                  </span>
                </td>

                {/* Days Late */}
                <td className="p-4">
                  {cobro.daysLate > 0 ? (
                    <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                      <Warning className="w-4 h-4" weight="fill" />
                      <span className="text-sm font-medium">{cobro.daysLate}d</span>
                    </div>
                  ) : cobro.status === 'paid' ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" weight="fill" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === cobro.id ? null : cobro.id);
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <DotsThree className="w-5 h-5 text-muted-foreground" weight="bold" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === cobro.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-44 p-2 rounded-xl border border-border bg-card shadow-xl z-10"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCobroClick?.(cobro);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">Ver detalle</span>
                          </button>
                          {cobro.status !== 'paid' && onRegisterPayment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRegisterPayment(cobro);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <CurrencyCircleDollar className="w-4 h-4" />
                              <span className="text-sm">Registrar pago</span>
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
        {showSummary && cobros.length > 0 && (
          <tfoot>
            <tr className="bg-muted/30 border-t border-border">
              <td colSpan={3} className="p-4">
                <span className="font-semibold text-foreground">
                  Total ({cobros.length} cobros)
                </span>
              </td>
              <td className="p-4">
                <span className="font-bold text-foreground">
                  {formatCurrency(summary.totalExpected)}
                </span>
              </td>
              <td className="p-4">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalCollected)}
                </span>
              </td>
              <td className="p-4">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(summary.totalPending)}
                </span>
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Empty State */}
      {sortedCobros.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <CurrencyCircleDollar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No hay cobros para mostrar
          </h3>
          <p className="text-muted-foreground">
            Ajusta los filtros o selecciona otro mes
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

export default CobroTable;
