'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle, X, Receipt } from 'lucide-react';
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
    icon: AlertCircle,
  },
  failed: {
    label: 'Fallido',
    variant: 'destructive',
    icon: X,
  },
};

const conceptLabels: Record<Payment['concept'], string> = {
  rent: 'Arriendo',
  deposit: 'Deposito',
  admin_fee: 'Administracion',
  late_fee: 'Mora',
  repair: 'Reparacion',
};

const methodLabels: Record<string, string> = {
  pse: 'PSE',
  credit_card: 'Tarjeta credito',
  debit_card: 'Tarjeta debito',
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
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Receipt className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium">No hay historial de pagos</p>
        <p className="text-sm text-slate-400 mt-1">
          Los pagos apareceran aqui
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
            <tr className="border-b border-slate-100">
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Fecha vencimiento
              </th>
              {showConcept && (
                <th className="text-left py-3 px-4 font-medium text-slate-500">
                  Concepto
                </th>
              )}
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Monto
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Estado
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Fecha pago
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
                Metodo
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">
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
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-900">
                    {formatDate(payment.dueDate)}
                  </td>
                  {showConcept && (
                    <td className="py-3 px-4 text-slate-600">
                      {conceptLabels[payment.concept]}
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {payment.method ? methodLabels[payment.method] : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-xs">
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
              className="bg-slate-50 rounded-sm p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">
                    Vence {formatDate(payment.dueDate)}
                  </p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </p>
                  {showConcept && (
                    <p className="text-xs text-slate-500 mt-0.5">
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
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-200">
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
