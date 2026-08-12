'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Buildings, CaretDown, CheckCircle, Clock, WarningCircle, ChatCircle, FileText, Phone, Envelope, ArrowsClockwise } from '@phosphor-icons/react';
import { Spinner } from '@/components/ui/spinner';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
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
      variant: 'success' as const,
    },
    pending: {
      icon: Clock,
      text: 'Pendiente',
      variant: 'warning' as const,
    },
    late: {
      icon: WarningCircle,
      text: 'Atrasado',
      variant: 'destructive' as const,
    },
    failed: {
      icon: WarningCircle,
      text: 'Fallido',
      variant: 'destructive' as const,
    },
  };

  const { icon: Icon, text, variant } = config[status];

  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="w-3 h-3" />
      {text}
    </Badge>
  );
}

/**
 * LeaseExpandableItem - Expandable lease row with payment history
 */
export function LeaseExpandableItem({ lease }: LeaseExpandableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  // Lazy-load payments only when expanded.
  // `errorCrudo`: sin mirarlo, una consulta caída decía «No hay pagos
  // registrados» sobre un contrato que sí los tiene. Afirmarle a un
  // propietario que no le cobraron nada es de las mentiras más caras que
  // puede decir esta pantalla.
  const {
    payments,
    isLoading: paymentsLoading,
    errorCrudo: errorPagos,
    refetch: recargarPagos,
  } = useLeasePayments(isExpanded ? lease.id : null);

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
      'border-b border-border-faint last:border-0',
      isExpanded && 'bg-surface-muted'
    )}>
      {/* Main row - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-6 py-5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Property icon */}
          <div className="w-11 h-11 rounded-[14px] bg-surface-muted flex items-center justify-center flex-shrink-0">
            <Buildings className="w-5 h-5 text-fg-muted" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-medium text-fg truncate">
                {lease.propertyTitle}
              </h3>
              {isEndingSoon && (
                <span className="text-xs px-2 py-0.5 bg-warning-soft text-warning rounded-full flex-shrink-0 font-medium">
                  Vence pronto
                </span>
              )}
            </div>
            <p className="text-sm text-fg-muted mt-0.5">
              {lease.tenantName} · {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
            </p>
          </div>

          {/* Payment status indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {lateCount > 0 && (
              <span className="text-xs text-danger font-medium font-mono tabular-nums">
                {lateCount} atrasado{lateCount > 1 ? 's' : ''}
              </span>
            )}
            {pendingCount > 0 && lateCount === 0 && (
              <span className="text-xs text-warning font-medium font-mono tabular-nums">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Rent amount */}
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-lg font-semibold text-fg font-mono tabular-nums">
              {formatCurrency(lease.monthlyRent)}
            </p>
            <p className="text-xs text-fg-muted">/mes</p>
          </div>

          {/* Expand indicator */}
          <CaretDown className={cn(
            'w-5 h-5 text-fg-subtle transition-transform flex-shrink-0',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Expanded content - Cards layout */}
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="ml-[60px] grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Lease Details */}
            <Card className="rounded-[16px] p-5">
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-4">
                Detalles del arriendo
              </p>
              <div className="space-y-3.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Canon mensual</span>
                  <span className="text-sm text-fg font-medium font-mono tabular-nums">
                    {formatCurrency(lease.monthlyRent)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Inicio</span>
                  <span className="text-sm text-fg font-mono tabular-nums">{formatDate(lease.startDate)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Vencimiento</span>
                  <span className="text-sm text-fg font-mono tabular-nums">{formatDate(lease.endDate)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Días restantes</span>
                  <span className={cn(
                    'text-sm font-medium font-mono tabular-nums',
                    daysRemaining <= 60 ? 'text-warning' : 'text-fg'
                  )}>
                    {daysRemaining} días
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 2: Tenant Contact */}
            <Card className="rounded-[16px] p-5">
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-4">
                Arrendatario
              </p>
              <p className="text-sm font-medium text-fg mb-3">{lease.tenantName}</p>
              <div className="space-y-2.5 mb-5">
                <a
                  href={`tel:${lease.tenantPhone}`}
                  className="flex items-center gap-2.5 text-sm text-fg-muted hover:text-fg transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="font-mono tabular-nums">{lease.tenantPhone}</span>
                </a>
                <a
                  href={`mailto:${lease.tenantEmail}`}
                  className="flex items-center gap-2.5 text-sm text-fg-muted hover:text-fg transition-colors"
                >
                  <Envelope className="w-4 h-4" />
                  {lease.tenantEmail}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border-faint">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleMessage}
                >
                  <ChatCircle className="w-4 h-4" />
                  Mensaje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleViewContract}
                >
                  <FileText className="w-4 h-4" />
                  Contrato
                </Button>
                {isEndingSoon && (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleRenewal}
                  >
                    <ArrowsClockwise className="w-4 h-4" />
                    Renovar
                  </Button>
                )}
              </div>
            </Card>

            {/* Card 3: Payment Summary */}
            <Card className="rounded-[16px] p-5">
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-4">
                Resumen de pagos
              </p>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner size="md" variant="current" className="text-primary" />
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-fg-muted">Total pagos</span>
                    <span className="text-sm text-fg font-medium font-mono tabular-nums">{payments.length}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-fg-muted">Pagados</span>
                    <span className="text-sm text-fg font-mono tabular-nums">
                      {payments.filter(p => p.status === 'paid').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-fg-muted">Pendientes</span>
                    <span className={cn(
                      'text-sm font-mono tabular-nums',
                      pendingCount > 0 ? 'text-warning font-medium' : 'text-fg'
                    )}>
                      {pendingCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-fg-muted">Atrasados</span>
                    <span className={cn(
                      'text-sm font-mono tabular-nums',
                      lateCount > 0 ? 'text-danger font-medium' : 'text-fg'
                    )}>
                      {lateCount}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Payment history table - Full width below cards */}
          <div className="ml-[60px] mt-4">
            <div className="border border-border rounded-[16px] overflow-hidden bg-surface">
              <div className="px-5 py-3 bg-surface-muted border-b border-border">
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Historial de pagos
                </span>
              </div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" variant="current" className="text-primary" />
                </div>
              ) : errorPagos ? (
                <FalloDeCarga
                  error={errorPagos}
                  queEs="el historial de pagos"
                  onReintentar={recargarPagos}
                  enmarcado={false}
                  className="py-8"
                />
              ) : payments.length === 0 ? (
                <p className="text-sm text-fg-muted p-5 text-center">
                  No hay pagos registrados
                </p>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs text-fg-muted font-medium uppercase tracking-wider border-b border-border-faint">
                    <div>Vencimiento</div>
                    <div>Concepto</div>
                    <div className="text-right">Monto</div>
                    <div className="text-center">Estado</div>
                    <div className="text-right">Pagado</div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-border-faint">
                    {payments.slice(0, 5).map((payment) => (
                      <div
                        key={payment.id}
                        className="grid grid-cols-5 gap-4 px-5 py-4 items-center"
                      >
                        <div className="text-sm text-fg-muted font-mono tabular-nums">
                          {formatDate(payment.dueDate)}
                        </div>
                        <div className="text-sm text-fg-muted capitalize">
                          {payment.concept === 'rent' ? 'Arriendo' : payment.concept === 'deposit' ? 'Depósito' : payment.concept}
                        </div>
                        <div className="text-sm text-fg font-medium text-right font-mono tabular-nums">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="text-center">
                          <PaymentStatus status={payment.status} />
                        </div>
                        <div className="text-sm text-fg-muted text-right font-mono tabular-nums">
                          {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {payments.length > 5 && (
                    <div className="px-5 py-3 bg-surface-muted text-center border-t border-border-faint">
                      <Button variant="link" size="sm" hideArrow className="text-sm">
                        Ver {payments.length - 5} pagos más
                      </Button>
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
