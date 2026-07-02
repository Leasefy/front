'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Check, Clock, WarningCircle, X, Receipt } from '@phosphor-icons/react';
import type { Payment } from '@/lib/types/lease';

interface PaymentHistoryProps {
  payments: Payment[];
  showConcept?: boolean;
  className?: string;
}

const statusConfig: Record<
  Payment['status'],
  {
    label: string;
    variant: 'success' | 'warning' | 'destructive';
    icon: typeof Check;
  }
> = {
  paid: {
    label: 'Pagado',
    variant: 'success',
    icon: Check,
  },
  pending: {
    label: 'Pendiente',
    variant: 'warning',
    icon: Clock,
  },
  late: {
    label: 'Atrasado',
    variant: 'destructive',
    icon: WarningCircle,
  },
  failed: {
    label: 'Fallido',
    variant: 'destructive',
    icon: X,
  },
};

const conceptLabels: Record<Payment['concept'], string> = {
  rent: 'Arriendo',
  deposit: 'Depósito',
  admin_fee: 'Administración',
  late_fee: 'Mora',
  repair: 'Reparación',
};

const methodLabels: Record<string, string> = {
  pse: 'PSE',
  credit_card: 'Tarjeta crédito',
  debit_card: 'Tarjeta débito',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  cash: 'Efectivo',
};

/**
 * PaymentHistory - Table displaying payment records for a lease
 * Shows due date, amount, status, payment date, and reference
 */
export function PaymentHistory({
  payments,
  showConcept = false,
  className,
}: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No hay historial de pagos"
        description="Los pagos aparecerán aquí"
        className={className}
      />
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha vencimiento</TableHead>
              {showConcept && <TableHead>Concepto</TableHead>}
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha pago</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Referencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const status = statusConfig[payment.status];
              const StatusIcon = status.icon;

              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono tabular-nums">
                    {formatDate(payment.dueDate)}
                  </TableCell>
                  {showConcept && (
                    <TableCell className="text-fg-muted">
                      {conceptLabels[payment.concept]}
                    </TableCell>
                  )}
                  <TableCell className="font-medium font-mono tabular-nums">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-fg-muted font-mono tabular-nums">
                    {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {payment.method ? methodLabels[payment.method] : '-'}
                  </TableCell>
                  <TableCell className="text-fg-muted font-mono text-xs">
                    {payment.reference || '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {payments.map((payment) => {
          const status = statusConfig[payment.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={payment.id}
              className="bg-surface-muted rounded-[16px] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-fg-muted">
                    Vence <span className="font-mono tabular-nums">{formatDate(payment.dueDate)}</span>
                  </p>
                  <p className="font-semibold text-fg font-mono tabular-nums">
                    {formatCurrency(payment.amount)}
                  </p>
                  {showConcept && (
                    <p className="text-xs text-fg-muted mt-0.5">
                      {conceptLabels[payment.concept]}
                    </p>
                  )}
                </div>
                <Badge variant={status.variant} className="gap-1 shrink-0">
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </div>

              {payment.paidDate && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted pt-2 border-t border-border">
                  <span>Pagado: <span className="font-mono tabular-nums">{formatDate(payment.paidDate)}</span></span>
                  {payment.method && (
                    <span>Via: {methodLabels[payment.method]}</span>
                  )}
                  {payment.reference && (
                    <span className="font-mono">{payment.reference}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
