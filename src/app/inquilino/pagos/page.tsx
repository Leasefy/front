'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Clock,
  AlertCircle,
  CreditCard,
  DollarSign,
  Calendar,
  X,
  CheckCircle,
  Shield,
  Building2,
  Loader2,
} from 'lucide-react';

import { getActiveLeasesForTenant, getPaymentsForLease, getNextPayment } from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { Button } from '@/components/ui/button';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import type { Payment } from '@/lib/types/lease';

interface PaymentRow extends Payment {
  propertyTitle: string;
}

type PaymentStep = 'confirm' | 'processing' | 'success';

/**
 * Tenant Payments Page - PLan CRM Style
 */
export default function PagosPage() {
  const tenantId = 'user-tenant-1';
  const activeLeases = getActiveLeasesForTenant(tenantId);
  const primaryLease = activeLeases[0];

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('confirm');

  const allPayments: PaymentRow[] = [];
  activeLeases.forEach(lease => {
    const payments = getPaymentsForLease(lease.id);
    payments.forEach(payment => {
      allPayments.push({ ...payment, propertyTitle: lease.propertyTitle });
    });
  });

  allPayments.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const nextPayment = primaryLease ? getNextPayment(primaryLease.id) : undefined;

  // Calculate totals
  const totalPaid = allPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = allPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilPayment = () => {
    if (!nextPayment) return null;
    const dueDate = new Date(nextPayment.dueDate);
    const today = new Date();
    return Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getPaymentProgress = () => {
    if (!nextPayment) return 0;
    const dueDate = new Date(nextPayment.dueDate);
    const today = new Date();
    const startOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    const totalDays = dueDate.getDate();
    const daysElapsed = Math.min(today.getDate(), totalDays);
    return Math.round((daysElapsed / totalDays) * 100);
  };

  const daysUntil = getDaysUntilPayment();

  const handlePayNow = () => {
    setPaymentStep('confirm');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    setPaymentStep('processing');
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStep('success');
    }, 2000);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('confirm');
  };

  const columns: PlanTableColumn<PaymentRow>[] = [
    {
      key: 'concept',
      header: 'Concepto',
      render: (row) => {
        const iconBg = row.status === 'paid'
          ? 'bg-plan-status-green-bg'
          : row.status === 'pending'
            ? 'bg-plan-status-yellow-bg'
            : 'bg-plan-status-red-bg';
        const iconColor = row.status === 'paid'
          ? 'text-plan-status-green'
          : row.status === 'pending'
            ? 'text-plan-status-yellow'
            : 'text-plan-status-red';
        const Icon = row.status === 'paid'
          ? Check
          : row.status === 'pending'
            ? Clock
            : AlertCircle;

        return (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-sm ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className="font-medium text-plan-primary">
                {row.concept === 'rent' ? 'Arriendo' : row.concept === 'deposit' ? 'Deposito' : 'Pago'}
              </p>
              <p className="text-xs text-plan-muted">{row.propertyTitle}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (row) => (
        <span className="font-semibold text-plan-primary">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Fecha',
      render: (row) => (
        <span className="text-sm text-plan-secondary">
          {row.status === 'paid' && row.paidDate
            ? `Pagado ${formatShortDate(row.paidDate)}`
            : `Vence ${formatShortDate(row.dueDate)}`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <PlanStatusBadge
          status={row.status === 'paid' ? 'completed' : row.status === 'pending' ? 'pending' : 'important'}
          label={row.status === 'paid' ? 'Pagado' : row.status === 'pending' ? 'Pendiente' : 'Vencido'}
          size="sm"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/inquilino" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            Pagos
          </h1>
          <p className="mt-1 text-plan-secondary">
            Gestiona tus pagos de arriendo
          </p>
        </header>

        {/* Stats */}
        <PlanStatsGrid columns={3} className="mb-8">
          <PlanStatsCard
            label="Proximo pago"
            value={formatCurrency(nextPayment?.amount || 0)}
            sublabel={daysUntil !== null ? `Vence en ${daysUntil} dias` : 'Sin pagos pendientes'}
            icon={CreditCard}
            variant="accent"
          />
          <PlanStatsCard
            label="Total pagado"
            value={formatCurrency(totalPaid)}
            sublabel="Este ano"
            icon={DollarSign}
          />
          <PlanStatsCard
            label="Pendiente"
            value={formatCurrency(pendingAmount)}
            sublabel="Por pagar"
            icon={Calendar}
          />
        </PlanStatsGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Payment History */}
          <div className="lg:col-span-2">
            <div className="bg-card  border border-plan-border overflow-hidden">
              <div className="px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Historial de pagos</h2>
              </div>

              {allPayments.length > 0 ? (
                <PlanTable
                  data={allPayments}
                  columns={columns}
                  keyExtractor={(row) => row.id}
                  className="border-0 rounded-none"
                  pagination
                  pageSize={5}
                />
              ) : (
                <div className="p-16 text-center">
                  <div className="relative mb-6 inline-block">
                    <div className="absolute inset-0 bg-black/10 rounded-sm blur-xl" />
                    <div className="relative rounded-sm bg-gradient-to-br from-black/10 to-black/5 p-5 border border-border">
                      <CreditCard className="h-8 w-8 text-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Sin historial de pagos</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Cuando realices pagos de arriendo aparecerán aquí con su comprobante
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Next Payment */}
          <div className="space-y-6">
            {nextPayment && primaryLease && (
              <div className="bg-indigo-950  p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-plan-accent" />
                  </div>
                  <span className="text-sm text-white/60">Proximo pago</span>
                </div>

                <p className="text-4xl font-bold tracking-tight mb-1">
                  {formatCurrency(nextPayment.amount)}
                </p>
                <p className="text-white/60 text-sm mb-6">
                  {primaryLease.propertyTitle}
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/60">Progreso del mes</span>
                    <span className="text-white font-medium">{getPaymentProgress()}%</span>
                  </div>
                  <PlanProgressBar
                    value={getPaymentProgress()}
                    variant="default"
                    size="md"
                  />
                </div>

                <div className="flex items-center justify-between text-sm mb-6 pb-4 border-b border-white/10">
                  <span className="text-white/60">Fecha limite</span>
                  <span className="text-white">{formatDate(nextPayment.dueDate)}</span>
                </div>

                <div className="flex items-center justify-between text-sm mb-6">
                  <span className={daysUntil !== null && daysUntil <= 3 ? 'text-yellow-100' : 'text-white/60'}>
                    {daysUntil === 0 ? 'Vence hoy' : daysUntil !== null ? `Vence en ${daysUntil} dias` : ''}
                  </span>
                </div>

                <Button
                  onClick={handlePayNow}
                  className="w-full bg-primary text-white hover:bg-primary/90 font-semibold"
                >
                  Pagar ahora
                </Button>
              </div>
            )}

            {/* Payment Methods */}
            <div className="bg-card  border border-plan-border p-5">
              <h3 className="font-semibold text-plan-primary mb-4">Metodos de pago</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-sm bg-muted">
                  <div className="w-10 h-6 rounded bg-gradient-to-r from-indigo-900 to-foreground flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">VISA</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-plan-primary">**** 4242</p>
                    <p className="text-xs text-plan-muted">Vence 12/25</p>
                  </div>
                  <span className="text-xs text-plan-status-green font-medium">Principal</span>
                </div>
                <button className="w-full text-sm text-plan-secondary hover:text-plan-primary py-2 transition-colors">
                  + Agregar metodo de pago
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {showPaymentModal && nextPayment && primaryLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={paymentStep !== 'processing' ? handleCloseModal : undefined}
          />

          {/* Modal */}
          <div className="relative bg-card w-full max-w-md mx-4 rounded-sm shadow-xl overflow-hidden">
            {/* Confirm Step */}
            {paymentStep === 'confirm' && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-plan-border">
                  <h3 className="font-semibold text-plan-primary">Confirmar pago</h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-1 hover:bg-muted rounded-sm transition-colors"
                  >
                    <X className="w-5 h-5 text-plan-secondary" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Property Info */}
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-sm mb-6">
                    <div className="w-10 h-10 bg-muted rounded-sm flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-plan-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-plan-primary">{primaryLease.propertyTitle}</p>
                      <p className="text-xs text-plan-secondary">Arriendo mensual</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-center mb-6">
                    <p className="text-sm text-plan-secondary mb-1">Monto a pagar</p>
                    <p className="text-4xl font-bold text-plan-primary">
                      {formatCurrency(nextPayment.amount)}
                    </p>
                    <p className="text-sm text-plan-muted mt-1">
                      Vence el {formatDate(nextPayment.dueDate)}
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <p className="text-sm text-plan-secondary mb-2">Metodo de pago</p>
                    <div className="flex items-center gap-3 p-3 border border-plan-border rounded-sm">
                      <div className="w-10 h-6 rounded bg-gradient-to-r from-indigo-900 to-foreground flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">VISA</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-plan-primary">**** 4242</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-plan-status-green" />
                    </div>
                  </div>

                  {/* Security Note */}
                  <div className="flex items-center gap-2 text-xs text-plan-secondary mb-6">
                    <Shield className="w-4 h-4" />
                    <span>Pago seguro con encriptacion SSL</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCloseModal}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={handleConfirmPayment}
                    >
                      Confirmar pago
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Processing Step */}
            {paymentStep === 'processing' && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-plan-primary animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-plan-primary mb-2">
                  Procesando pago
                </h3>
                <p className="text-sm text-plan-secondary">
                  Por favor espera mientras procesamos tu pago...
                </p>
              </div>
            )}

            {/* Success Step */}
            {paymentStep === 'success' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-plan-status-green-bg rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-plan-status-green" />
                </div>
                <h3 className="text-lg font-semibold text-plan-primary mb-2">
                  Pago exitoso
                </h3>
                <p className="text-sm text-plan-secondary mb-2">
                  Tu pago de {formatCurrency(nextPayment.amount)} ha sido procesado correctamente.
                </p>
                <p className="text-xs text-plan-muted mb-6">
                  Recibirás un comprobante en tu correo electrónico.
                </p>

                {/* Receipt Summary */}
                <div className="bg-muted rounded-sm p-4 mb-6 text-left">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-plan-secondary">Propiedad</span>
                    <span className="text-plan-primary font-medium">{primaryLease.propertyTitle}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-plan-secondary">Monto</span>
                    <span className="text-plan-primary font-medium">{formatCurrency(nextPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-plan-secondary">Fecha</span>
                    <span className="text-plan-primary font-medium">{formatDate(new Date().toISOString())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-plan-secondary">Referencia</span>
                    <span className="text-plan-primary font-mono text-xs">PAY-{Date.now().toString().slice(-8)}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleCloseModal}
                >
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
