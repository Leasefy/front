'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
  FileText,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react';
import type { Lease, Payment } from '@/lib/types/lease';

interface LeaseExpandableItemProps {
  lease: Lease;
  payments: Payment[];
}

/**
 * Payment status badge - minimal
 */
function PaymentStatus({ status }: { status: Payment['status'] }) {
  const config = {
    paid: { icon: CheckCircle2, text: 'Pagado', className: 'text-slate-500' },
    pending: { icon: Clock, text: 'Pendiente', className: 'text-amber-600' },
    late: { icon: AlertCircle, text: 'Atrasado', className: 'text-red-500' },
    failed: { icon: AlertCircle, text: 'Fallido', className: 'text-red-500' },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

/**
 * LeaseExpandableItem - Expandable lease row with payment history
 * Click to expand and see payments inline - clear UX
 */
export function LeaseExpandableItem({ lease, payments }: LeaseExpandableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const daysRemaining = Math.ceil(
    (new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isEndingSoon = lease.status === 'ending_soon' || daysRemaining <= 60;

  // Count payment statuses
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const lateCount = payments.filter(p => p.status === 'late').length;

  return (
    <div className={cn(
      'border-b border-slate-100 last:border-0',
      isExpanded && 'bg-slate-50/30'
    )}>
      {/* Main row - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Property icon */}
          <div className="w-10 h-10 rounded-[2px] bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-slate-900 truncate">
                {lease.propertyTitle}
              </h3>
              {isEndingSoon && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-[2px] flex-shrink-0">
                  Vence pronto
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lease.tenantName} · {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
            </p>
          </div>

          {/* Payment status indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {lateCount > 0 && (
              <span className="text-xs text-red-500">
                {lateCount} atrasado{lateCount > 1 ? 's' : ''}
              </span>
            )}
            {pendingCount > 0 && lateCount === 0 && (
              <span className="text-xs text-amber-600">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Rent amount */}
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-sm font-medium text-slate-900">
              {formatCurrency(lease.monthlyRent)}
            </p>
            <p className="text-[10px] text-slate-400">/mes</p>
          </div>

          {/* Expand indicator */}
          <ChevronDown className={cn(
            'w-4 h-4 text-slate-300 transition-transform flex-shrink-0',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Expanded content - Cards layout */}
      {isExpanded && (
        <div className="px-5 pb-5">
          <div className="ml-14 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Lease Details */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2px] p-4">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-3">
                Detalles del arriendo
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Canon mensual</span>
                  <span className="text-xs text-slate-900 font-medium">
                    {formatCurrency(lease.monthlyRent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Inicio</span>
                  <span className="text-xs text-slate-900">{formatDate(lease.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Vencimiento</span>
                  <span className="text-xs text-slate-900">{formatDate(lease.endDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Dias restantes</span>
                  <span className={cn(
                    'text-xs font-medium',
                    daysRemaining <= 60 ? 'text-amber-600' : 'text-slate-900'
                  )}>
                    {daysRemaining} dias
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Tenant Contact */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2px] p-4">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-3">
                Arrendatario
              </p>
              <p className="text-sm font-medium text-slate-900 mb-3">{lease.tenantName}</p>
              <div className="space-y-2 mb-4">
                <a
                  href={`tel:${lease.tenantPhone}`}
                  className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {lease.tenantPhone}
                </a>
                <a
                  href={`mailto:${lease.tenantEmail}`}
                  className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {lease.tenantEmail}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Mensaje
                </Button>
                {lease.contractUrl && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Contrato
                  </Button>
                )}
                {isEndingSoon && (
                  <Button variant="default" size="sm" className="h-8 text-xs gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Renovar
                  </Button>
                )}
              </div>
            </div>

            {/* Card 3: Payment Summary */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2px] p-4">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-3">
                Resumen de pagos
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Total pagos</span>
                  <span className="text-xs text-slate-900 font-medium">{payments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Pagados</span>
                  <span className="text-xs text-slate-900">
                    {payments.filter(p => p.status === 'paid').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Pendientes</span>
                  <span className={cn(
                    'text-xs',
                    pendingCount > 0 ? 'text-amber-600 font-medium' : 'text-slate-900'
                  )}>
                    {pendingCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Atrasados</span>
                  <span className={cn(
                    'text-xs',
                    lateCount > 0 ? 'text-red-500 font-medium' : 'text-slate-900'
                  )}>
                    {lateCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment history table - Full width below cards */}
          <div className="ml-14 mt-4">
            <div className="border border-slate-100 rounded-[2px] overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                  Historial de pagos
                </span>
              </div>

              {payments.length === 0 ? (
                <p className="text-sm text-slate-400 p-4 text-center">
                  No hay pagos registrados
                </p>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-5 gap-4 px-4 py-2.5 text-[11px] text-slate-400 font-medium uppercase tracking-wide border-b border-slate-50">
                    <div>Vencimiento</div>
                    <div>Concepto</div>
                    <div className="text-right">Monto</div>
                    <div className="text-center">Estado</div>
                    <div className="text-right">Pagado</div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-slate-50">
                    {payments.slice(0, 5).map((payment) => (
                      <div
                        key={payment.id}
                        className="grid grid-cols-5 gap-4 px-4 py-3 items-center"
                      >
                        <div className="text-sm text-slate-600">
                          {formatDate(payment.dueDate)}
                        </div>
                        <div className="text-sm text-slate-600 capitalize">
                          {payment.concept === 'rent' ? 'Arriendo' : payment.concept === 'deposit' ? 'Deposito' : payment.concept}
                        </div>
                        <div className="text-sm text-slate-900 font-medium text-right">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="text-center">
                          <PaymentStatus status={payment.status} />
                        </div>
                        <div className="text-sm text-slate-400 text-right">
                          {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {payments.length > 5 && (
                    <div className="px-4 py-2.5 bg-slate-50/50 text-center border-t border-slate-50">
                      <button className="text-xs text-slate-500 hover:text-slate-700">
                        Ver {payments.length - 5} pagos más
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
