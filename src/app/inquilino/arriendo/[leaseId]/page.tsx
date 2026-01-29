'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  FileText,
  Download,
  CreditCard,
  User,
  Phone,
  Mail,
  Shield,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Receipt,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeaseById, getPaymentsForLease, getNextPayment, PAYMENT_METHODS } from '@/lib/data/mock-leases';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';

export default function LeaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leaseId = params.leaseId as string;

  const lease = getLeaseById(leaseId);
  const payments = getPaymentsForLease(leaseId);
  const nextPayment = getNextPayment(leaseId);

  if (!lease) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-[#9CA3AF]" />
          </div>
          <h2 className="text-lg font-semibold text-[#111827] mb-2">Arriendo no encontrado</h2>
          <p className="text-[#6B7280] mb-4">El arriendo que buscas no existe o no tienes acceso.</p>
          <Link
            href="/inquilino/arriendo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a mis arriendos
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getLeaseProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  };

  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Pagado', color: 'bg-[#DCFCE7] text-[#166534]', icon: CheckCircle2 };
      case 'pending':
        return { label: 'Pendiente', color: 'bg-[#FEF3C7] text-[#92400E]', icon: Clock };
      case 'late':
        return { label: 'Atrasado', color: 'bg-[#FEE2E2] text-[#DC2626]', icon: AlertCircle };
      case 'overdue':
        return { label: 'Vencido', color: 'bg-[#FEE2E2] text-[#DC2626]', icon: AlertCircle };
      default:
        return { label: status, color: 'bg-[#F3F4F6] text-[#6B7280]', icon: Clock };
    }
  };

  const getPaymentMethodInfo = (methodId?: string) => {
    if (!methodId) return null;
    return PAYMENT_METHODS.find(m => m.id === methodId);
  };

  const daysRemaining = getDaysRemaining(lease.endDate);
  const leaseProgress = getLeaseProgress(lease.startDate, lease.endDate);

  // Separate payments into paid and pending
  const paidPayments = payments.filter(p => p.status === 'paid' || p.status === 'late');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  // Calculate total paid
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </button>

        {/* Header Section */}
        <div className="bg-white border border-[#E5E7EB] mb-6">
          <div className="flex flex-col lg:flex-row">
            {/* Property Image */}
            <div className="relative w-full lg:w-80 h-64 lg:h-auto bg-[#F3F4F6] flex-shrink-0">
              <Image
                src={lease.propertyThumbnail}
                alt={lease.propertyTitle}
                fill
                className="object-cover"
              />
            </div>

            {/* Property Info */}
            <div className="flex-1 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-semibold text-[#111827]">{lease.propertyTitle}</h1>
                  <p className="text-[#6B7280] mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {lease.propertyAddress}, {lease.propertyCity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-[#111827]">
                    {formatCurrency(lease.monthlyRent + lease.adminFee)}
                  </p>
                  <p className="text-sm text-[#9CA3AF]">/mes</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-[#E5E7EB]">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Arriendo</p>
                  <p className="text-sm font-medium text-[#111827]">{formatCurrency(lease.monthlyRent)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Administracion</p>
                  <p className="text-sm font-medium text-[#111827]">{formatCurrency(lease.adminFee)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Dia de pago</p>
                  <p className="text-sm font-medium text-[#111827]">Dia {lease.paymentDueDay}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Estado</p>
                  <PlanStatusBadge
                    status={lease.status === 'ending_soon' ? 'important' : 'in_progress'}
                    label={lease.status === 'ending_soon' ? 'Termina pronto' : 'Activo'}
                    size="sm"
                  />
                </div>
              </div>

              {/* Contract Progress */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#6B7280] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Inicio: {formatDate(lease.startDate)}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    Fin: {formatDate(lease.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <PlanProgressBar
                      value={leaseProgress}
                      size="sm"
                      variant={daysRemaining < 30 ? 'warning' : 'default'}
                    />
                  </div>
                  <span className="text-xs text-[#6B7280] whitespace-nowrap">
                    {daysRemaining} dias restantes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Payment CTA */}
            {nextPayment && (
              <div className="bg-[#111827] text-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#9CA3AF] mb-1">Proximo pago</p>
                    <p className="text-2xl font-semibold">{formatCurrency(nextPayment.amount)}</p>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                      Vence el {formatFullDate(nextPayment.dueDate)}
                    </p>
                  </div>
                  <Link
                    href="/inquilino/pagos"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[#D4F934] text-[#111827] font-medium hover:bg-[#c5ea2d] transition-colors"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pagar ahora
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="bg-white border border-[#E5E7EB]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#6B7280]" />
                  <h2 className="font-semibold text-[#111827]">Historial de Pagos</h2>
                </div>
                <span className="text-sm text-[#6B7280]">
                  Total pagado: {formatCurrency(totalPaid)}
                </span>
              </div>

              {payments.length > 0 ? (
                <div className="divide-y divide-[#E5E7EB]">
                  {payments.map((payment) => {
                    const statusInfo = getPaymentStatusInfo(payment.status);
                    const StatusIcon = statusInfo.icon;
                    const methodInfo = getPaymentMethodInfo(payment.method);

                    return (
                      <div
                        key={payment.id}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-[#F9FAFB] transition-colors"
                      >
                        {/* Icon */}
                        <div className={cn(
                          'w-10 h-10 flex items-center justify-center flex-shrink-0',
                          payment.status === 'paid' ? 'bg-[#DCFCE7]' :
                          payment.status === 'pending' ? 'bg-[#FEF3C7]' :
                          'bg-[#FEE2E2]'
                        )}>
                          <StatusIcon className={cn(
                            'w-5 h-5',
                            payment.status === 'paid' ? 'text-[#166534]' :
                            payment.status === 'pending' ? 'text-[#92400E]' :
                            'text-[#DC2626]'
                          )} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#111827]">
                              {payment.concept === 'rent' ? 'Arriendo mensual' :
                               payment.concept === 'deposit' ? 'Deposito de garantia' :
                               payment.concept === 'admin_fee' ? 'Administracion' :
                               payment.concept === 'late_fee' ? 'Recargo por mora' :
                               payment.concept === 'repair' ? 'Reparacion' :
                               payment.concept}
                            </p>
                            <span className={cn('text-[10px] px-1.5 py-0.5', statusInfo.color)}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-0.5">
                            {payment.paidDate ? (
                              <>Pagado el {formatDate(payment.paidDate)}</>
                            ) : (
                              <>Vence el {formatDate(payment.dueDate)}</>
                            )}
                            {methodInfo && (
                              <> • {methodInfo.icon} {methodInfo.name}</>
                            )}
                            {payment.reference && (
                              <> • Ref: {payment.reference}</>
                            )}
                          </p>
                          {payment.notes && (
                            <p className="text-xs text-[#6B7280] mt-1">{payment.notes}</p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-[#111827]">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
                  <p className="text-[#6B7280]">No hay historial de pagos</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="bg-white border border-[#E5E7EB]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB]">
                <FileText className="w-5 h-5 text-[#6B7280]" />
                <h2 className="font-semibold text-[#111827]">Contrato</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Vigencia</p>
                  <p className="text-sm text-[#111827]">
                    {formatFullDate(lease.startDate)} - {formatFullDate(lease.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Garantia</p>
                  <p className="text-sm text-[#111827] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#22C55E]" />
                    {lease.guaranteeType === 'poliza' ? 'Poliza de arriendo' :
                     lease.guaranteeType === 'codeudor' ? 'Codeudor' :
                     lease.guaranteeType}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{lease.guaranteeDetails}</p>
                </div>

                {/* Documents */}
                <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
                  <p className="text-xs text-[#9CA3AF] mb-2">Documentos</p>

                  {lease.contractUrl && (
                    <a
                      href={lease.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                    >
                      <FileText className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm text-[#111827] flex-1">Contrato de arriendo</span>
                      <Download className="w-4 h-4 text-[#9CA3AF]" />
                    </a>
                  )}

                  {lease.insuranceUrl && (
                    <a
                      href={lease.insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                    >
                      <Shield className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm text-[#111827] flex-1">Poliza de seguro</span>
                      <Download className="w-4 h-4 text-[#9CA3AF]" />
                    </a>
                  )}

                  {lease.inventoryUrl && (
                    <a
                      href={lease.inventoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                    >
                      <Building2 className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm text-[#111827] flex-1">Inventario</span>
                      <Download className="w-4 h-4 text-[#9CA3AF]" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Landlord Contact */}
            <div className="bg-white border border-[#E5E7EB]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB]">
                <User className="w-5 h-5 text-[#6B7280]" />
                <h2 className="font-semibold text-[#111827]">Propietario</h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] font-medium">
                    {lease.landlordName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[#111827]">{lease.landlordName}</p>
                    <p className="text-xs text-[#6B7280]">Propietario</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <a
                    href={`mailto:${lease.landlordEmail}`}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {lease.landlordEmail}
                  </a>
                  <a
                    href={`tel:${lease.landlordPhone}`}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {lease.landlordPhone}
                  </a>
                </div>

                <Link
                  href="/inquilino/mensajes"
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 border border-[#E5E7EB] text-sm font-medium text-[#111827] hover:bg-[#F9FAFB] transition-colors"
                >
                  Enviar mensaje
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Payment Methods Info */}
            <div className="bg-white border border-[#E5E7EB]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB]">
                <CreditCard className="w-5 h-5 text-[#6B7280]" />
                <h2 className="font-semibold text-[#111827]">Metodos de pago</h2>
              </div>
              <div className="p-5 space-y-2">
                {PAYMENT_METHODS.filter(m => m.enabled).slice(0, 4).map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 px-3 py-2 bg-[#F9FAFB]"
                  >
                    <span className="text-lg">{method.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111827]">{method.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{method.processingTime}</p>
                    </div>
                    {method.fee && method.fee > 0 && (
                      <span className="text-xs text-[#6B7280]">+{method.fee}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
