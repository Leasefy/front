'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Buildings, CaretDown, CheckCircle, Clock, WarningCircle, ChatCircle, FileText, Phone, Envelope, ArrowsClockwise, SpinnerGap } from '@phosphor-icons/react';
import { useLeasePayments } from '@/lib/hooks/useLeases';
import type { Lease, Payment } from '@/lib/types/lease';

interface LeaseExpandableItemProps {
  lease: Lease;
}

/**
 * Payment status badge - minimal
 */
function PaymentStatus({ status }: { status: Payment['status'] }) {
  const config = {
    paid: {
      icon: CheckCircle,
      text: 'Pagado',
      className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
    },
    pending: {
      icon: Clock,
      text: 'Pendiente',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    },
    late: {
      icon: WarningCircle,
      text: 'Atrasado',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    },
    failed: {
      icon: WarningCircle,
      text: 'Fallido',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium', className)}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

/**
 * LeaseExpandableItem - Expandable lease row with payment history
 */
export function LeaseExpandableItem({ lease }: LeaseExpandableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  // Lazy-load payments only when expanded
  const { payments, isLoading: paymentsLoading } = useLeasePayments(
    isExpanded ? lease.id : null
  );

  const handleMessage = () => {
    router.push(`/panel/mensajes?to=${lease.tenantId}`);
  };

  const handleViewContract = () => {
    if (lease.contractUrl) {
      window.open(lease.contractUrl, '_blank');
    } else {
      router.push(`/panel/${lease.propertyId}/contract/${lease.tenantId}`);
    }
  };

  const handleRenewal = () => {
    toast.info('Renovación de contrato', {
      description: 'Próximamente podrás renovar contratos desde aquí',
    });
  };

  const daysRemaining = Math.ceil(
    (new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isEndingSoon = lease.status === 'ending_soon' || daysRemaining <= 60;

  // Count payment statuses
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const lateCount = payments.filter(p => p.status === 'late').length;

  return (
    <div className={cn(
      'border-b border-neutral-100 dark:border-neutral-700 last:border-0',
      isExpanded && 'bg-neutral-50 dark:bg-neutral-800/30'
    )}>
      {/* Main row - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-6 py-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Property icon */}
          <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
            <Buildings className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-medium text-neutral-900 dark:text-white truncate">
                {lease.propertyTitle}
              </h3>
              {isEndingSoon && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md flex-shrink-0 font-medium">
                  Vence pronto
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {lease.tenantName} · {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
            </p>
          </div>

          {/* Payment status indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {lateCount > 0 && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {lateCount} atrasado{lateCount > 1 ? 's' : ''}
              </span>
            )}
            {pendingCount > 0 && lateCount === 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Rent amount */}
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">
              {formatCurrency(lease.monthlyRent)}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">/mes</p>
          </div>

          {/* Expand indicator */}
          <CaretDown className={cn(
            'w-5 h-5 text-neutral-400 dark:text-neutral-500 transition-transform flex-shrink-0',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Expanded content - Cards layout */}
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="ml-[60px] grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Lease Details */}
            <div className="bg-white dark:bg-[#222224] border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
                Detalles del arriendo
              </p>
              <div className="space-y-3.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Canon mensual</span>
                  <span className="text-sm text-neutral-900 dark:text-white font-medium">
                    {formatCurrency(lease.monthlyRent)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Inicio</span>
                  <span className="text-sm text-neutral-900 dark:text-white">{formatDate(lease.startDate)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Vencimiento</span>
                  <span className="text-sm text-neutral-900 dark:text-white">{formatDate(lease.endDate)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Días restantes</span>
                  <span className={cn(
                    'text-sm font-medium',
                    daysRemaining <= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'
                  )}>
                    {daysRemaining} días
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Tenant Contact */}
            <div className="bg-white dark:bg-[#222224] border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
                Arrendatario
              </p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">{lease.tenantName}</p>
              <div className="space-y-2.5 mb-5">
                <a
                  href={`tel:${lease.tenantPhone}`}
                  className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {lease.tenantPhone}
                </a>
                <a
                  href={`mailto:${lease.tenantEmail}`}
                  className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <Envelope className="w-4 h-4" />
                  {lease.tenantEmail}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 rounded-xl border-neutral-200 dark:border-neutral-700"
                  onClick={handleMessage}
                >
                  <ChatCircle className="w-4 h-4" />
                  Mensaje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl border-neutral-200 dark:border-neutral-700"
                  onClick={handleViewContract}
                >
                  <FileText className="w-4 h-4" />
                  Contrato
                </Button>
                {isEndingSoon && (
                  <Button
                    size="sm"
                    className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleRenewal}
                  >
                    <ArrowsClockwise className="w-4 h-4" />
                    Renovar
                  </Button>
                )}
              </div>
            </div>

            {/* Card 3: Payment Summary */}
            <div className="bg-white dark:bg-[#222224] border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
                Resumen de pagos
              </p>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <SpinnerGap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Total pagos</span>
                    <span className="text-sm text-neutral-900 dark:text-white font-medium">{payments.length}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Pagados</span>
                    <span className="text-sm text-neutral-900 dark:text-white">
                      {payments.filter(p => p.status === 'paid').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Pendientes</span>
                    <span className={cn(
                      'text-sm',
                      pendingCount > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-neutral-900 dark:text-white'
                    )}>
                      {pendingCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Atrasados</span>
                    <span className={cn(
                      'text-sm',
                      lateCount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-neutral-900 dark:text-white'
                    )}>
                      {lateCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment history table - Full width below cards */}
          <div className="ml-[60px] mt-4">
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-[#222224]">
              <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Historial de pagos
                </span>
              </div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <SpinnerGap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 p-5 text-center">
                  No hay pagos registrados
                </p>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-700">
                    <div>Vencimiento</div>
                    <div>Concepto</div>
                    <div className="text-right">Monto</div>
                    <div className="text-center">Estado</div>
                    <div className="text-right">Pagado</div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {payments.slice(0, 5).map((payment) => (
                      <div
                        key={payment.id}
                        className="grid grid-cols-5 gap-4 px-5 py-4 items-center"
                      >
                        <div className="text-sm text-neutral-600 dark:text-neutral-300">
                          {formatDate(payment.dueDate)}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-300 capitalize">
                          {payment.concept === 'rent' ? 'Arriendo' : payment.concept === 'deposit' ? 'Depósito' : payment.concept}
                        </div>
                        <div className="text-sm text-neutral-900 dark:text-white font-medium text-right">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="text-center">
                          <PaymentStatus status={payment.status} />
                        </div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 text-right">
                          {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {payments.length > 5 && (
                    <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 text-center border-t border-neutral-100 dark:border-neutral-700">
                      <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
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
