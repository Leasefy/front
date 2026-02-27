'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
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
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Receipt className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No hay historial de pagos</p>
        <p className="text-sm text-muted-foreground mt-1">
          Los pagos aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Fecha vencimiento
              </th>
              {showConcept && (
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Concepto
                </th>
              )}
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Monto
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Estado
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Fecha pago
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Método
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Referencia
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const status = statusConfig[payment.status];
              const StatusIcon = status.icon;

              return (
                <tr
                  key={payment.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4 text-foreground">
                    {formatDate(payment.dueDate)}
                  </td>
                  {showConcept && (
                    <td className="py-3 px-4 text-muted-foreground">
                      {conceptLabels[payment.concept]}
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-foreground">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {payment.method ? methodLabels[payment.method] : '-'}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                    {payment.reference || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {payments.map((payment) => {
          const status = statusConfig[payment.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={payment.id}
              className="bg-muted rounded-sm p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Vence {formatDate(payment.dueDate)}
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(payment.amount)}
                  </p>
                  {showConcept && (
                    <p className="text-xs text-muted-foreground mt-0.5">
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
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Pagado: {formatDate(payment.paidDate)}</span>
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
