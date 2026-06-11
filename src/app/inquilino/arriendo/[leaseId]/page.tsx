'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, FileText, Download, CreditCard, User, Phone, Envelope, Shield, House, Clock, CheckCircle, WarningCircle, ArrowUpRight, Receipt, Buildings, Wallet, TrendUp, Chat, XCircle, Prohibit } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { cn } from '@/lib/utils';
import {
  useLease,
  useMyPaymentRequests,
  useLeasePaymentInfo,
} from '@/lib/hooks/useLeases';
import { PAYMENT_METHODS } from '@/lib/constants/payment-methods';
import { useI18n } from '@/lib/i18n';
import { PayRentModal } from '@/components/tenant/PayRentModal';
import type { TenantPaymentRequestStatus } from '@/lib/api/tenant-payment-requests.types';

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function LeaseDetailPage() {
  const { t, locale, formatCurrency } = useI18n();
  const params = useParams();
  const leaseId = params.leaseId as string;

  const { lease, isLoading: leaseLoading } = useLease(leaseId);
  const { getForLease, refetch: refetchRequests } = useMyPaymentRequests();
  const { info: paymentInfo, refetch: refetchPaymentInfo } = useLeasePaymentInfo(leaseId);
  const requests = getForLease(leaseId);
  const [payModalOpen, setPayModalOpen] = useState(false);

  const isActive = lease?.status === 'active' || lease?.status === 'ending_soon';
  const periodStatus = paymentInfo?.currentPeriodStatus;
  // Si lease está activo y el período actual no tiene pago aprobado/pendiente,
  // o fue rechazado, el tenant puede pagar.
  const canPay = isActive && (periodStatus === 'NONE' || periodStatus === 'REJECTED' || !paymentInfo);

  if (leaseLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1A40FF]/30 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-[#1a1a1c] flex items-center justify-center mx-auto mb-6">
            <House className="w-10 h-10 text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            {locale === 'es' ? 'Arriendo no encontrado' : 'Rental not found'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            {locale === 'es' ? 'El arriendo que buscas no existe o no tienes acceso.' : 'The rental you are looking for does not exist or you do not have access.'}
          </p>
          <BackButton
            href="/inquilino/arriendo"
            label={locale === 'es' ? 'Volver a mis arriendos' : 'Back to my rentals'}
            variant="pill"
          />
        </motion.div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
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

  const getRequestStatusInfo = (status: TenantPaymentRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return { label: locale === 'es' ? 'Aprobado' : 'Approved', bgColor: 'bg-[#E8F3EC]', textColor: 'text-[#2C7A53]', icon: CheckCircle };
      case 'PENDING_VALIDATION':
        return { label: locale === 'es' ? 'En verificación' : 'In verification', bgColor: 'bg-[#F8F0E0]', textColor: 'text-[#B7791F]', icon: Clock };
      case 'REJECTED':
      case 'DISPUTED':
        return { label: locale === 'es' ? 'Rechazado' : 'Rejected', bgColor: 'bg-[#F8EAE7]', textColor: 'text-[#C4503B]', icon: XCircle };
      case 'CANCELLED':
        return { label: locale === 'es' ? 'Cancelado' : 'Cancelled', bgColor: 'bg-neutral-100', textColor: 'text-neutral-600', icon: Prohibit };
    }
  };

  const formatPeriod = (month: number, year: number) => {
    const names = locale === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
    return `${names[month - 1]} ${year}`;
  };

  const daysRemaining = getDaysRemaining(lease.endDate);
  const leaseProgress = getLeaseProgress(lease.startDate, lease.endDate);
  const approvedRequests = requests.filter(r => r.status === 'APPROVED');
  const totalPaid = approvedRequests.reduce((sum, r) => sum + r.amount, 0);
  const handlePaid = () => {
    refetchRequests();
    refetchPaymentInfo();
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <BackButton label={locale === 'es' ? 'Volver a mis arriendos' : 'Back to my rentals'} />
        </motion.div>

        {/* Hero Section - Property Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden mb-8"
        >
          <div className="flex flex-col lg:flex-row">
            {/* Property Image */}
            <div className="relative w-full lg:w-[400px] h-64 lg:h-auto flex-shrink-0">
              <Image
                src={lease.propertyThumbnail}
                alt={lease.propertyTitle}
                fill
                className="object-cover"
                priority
              />
              {/* Status Badge Overlay */}
              <div className="absolute top-4 left-4">
                <span className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm',
                  lease.status === 'ending_soon'
                    ? 'bg-[#F8F0E0]/90 text-[#B7791F]'
                    : 'bg-[#E8F3EC]/90 text-[#2C7A53]'
                )}>
                  {lease.status === 'ending_soon'
                    ? (locale === 'es' ? 'Termina pronto' : 'Ending soon')
                    : (locale === 'es' ? 'Contrato Activo' : 'Active Contract')}
                </span>
              </div>
            </div>

            {/* Property Info */}
            <div className="flex-1 p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
                    {lease.propertyTitle}
                  </h1>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {lease.propertyAddress}, {lease.propertyCity}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    {formatCurrency(lease.monthlyRent + (lease.adminFee ?? 0))}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">/{locale === 'es' ? 'mes' : 'mo'}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-y border-neutral-100 dark:border-neutral-700">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{locale === 'es' ? 'Arriendo' : 'Rent'}</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">{formatCurrency(lease.monthlyRent)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Admin</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">{formatCurrency(lease.adminFee ?? 0)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{locale === 'es' ? 'Día de pago' : 'Payment day'}</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Día' : 'Day'} {lease.paymentDay}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{locale === 'es' ? 'Restante' : 'Remaining'}</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">{daysRemaining} {locale === 'es' ? 'días' : 'days'}</p>
                </div>
              </div>

              {/* Contract Timeline */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    {formatDate(lease.startDate)}
                  </span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {formatDate(lease.endDate)}
                  </span>
                </div>
                <div className="relative h-3 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${leaseProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                      "h-full rounded-full",
                      daysRemaining < 30 ? "bg-[#B7791F]" : "bg-[#2C7A53]"
                    )}
                  />
                  {/* Progress Indicator Dot */}
                  <motion.div
                    initial={{ left: 0 }}
                    animate={{ left: `${leaseProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-4 border-white",
                      daysRemaining < 30 ? "bg-[#B7791F]" : "bg-[#2C7A53]"
                    )} />
                  </motion.div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-center">
                  {leaseProgress}% {locale === 'es' ? 'del contrato transcurrido' : 'of contract elapsed'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pay Rent CTA — visible cuando lease está activo y se puede pagar */}
            {isActive && paymentInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'rounded-xl border p-6 lg:p-8',
                  periodStatus === 'PENDING_VALIDATION'
                    ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/12 border-[#B7791F]/30 dark:border-[#B7791F]/40'
                    : periodStatus === 'APPROVED'
                      ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/12 border-[#2C7A53]/30 dark:border-[#2C7A53]/40'
                      : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/12 border-[#1A40FF]/30 dark:border-[#1A40FF]/40'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {periodStatus === 'PENDING_VALIDATION' ? (
                        <>
                          <Clock className="w-4 h-4 text-[#B7791F] dark:text-[#D2992F]" />
                          <span className="text-sm text-[#B7791F] dark:text-[#D2992F] font-medium">
                            {locale === 'es' ? 'Pago en verificación bancaria' : 'Payment in bank verification'}
                          </span>
                        </>
                      ) : periodStatus === 'APPROVED' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                          <span className="text-sm text-[#2C7A53] dark:text-[#3EAE70] font-medium">
                            {locale === 'es' ? 'Pago confirmado' : 'Payment confirmed'}
                          </span>
                        </>
                      ) : periodStatus === 'REJECTED' ? (
                        <>
                          <WarningCircle className="w-4 h-4 text-[#C4503B] dark:text-[#E0664D]" />
                          <span className="text-sm text-[#C4503B] dark:text-[#E0664D] font-medium">
                            {locale === 'es' ? 'Pago rechazado — reintentar' : 'Payment rejected — retry'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" />
                          <span className="text-sm text-[#1A40FF] dark:text-[#5570FF] font-medium">
                            {locale === 'es' ? 'Pagar arriendo' : 'Pay rent'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                      {formatCurrency(paymentInfo.monthlyRent)}
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5 capitalize">
                      <Calendar className="w-4 h-4" />
                      {formatPeriod(paymentInfo.currentPeriod.month, paymentInfo.currentPeriod.year)}
                    </p>
                    {periodStatus === 'REJECTED' && paymentInfo.currentPeriodRejectionReason && (
                      <p className="text-xs text-[#C4503B] dark:text-[#E0664D] mt-2 italic max-w-md">
                        {paymentInfo.currentPeriodRejectionReason}
                      </p>
                    )}
                  </div>
                  {canPay && (
                    <button
                      type="button"
                      onClick={() => setPayModalOpen(true)}
                      className="flex items-center justify-center gap-2 px-8 py-4 bg-[#1A40FF] text-white rounded-xl font-semibold hover:opacity-90 transition-colors"
                    >
                      <Wallet className="w-5 h-5" />
                      {periodStatus === 'REJECTED'
                        ? (locale === 'es' ? 'Reintentar' : 'Retry')
                        : (locale === 'es' ? 'Pagar arriendo' : 'Pay rent')}
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-4"
            >
              <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <TrendUp className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{locale === 'es' ? 'Total pagado' : 'Total paid'}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{approvedRequests.length}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{locale === 'es' ? 'Pagos realizados' : 'Payments made'}</p>
              </div>
              <div className="rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/12 border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 p-5 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{locale === 'es' ? 'Al día' : 'Up to date'}</p>
                <p className="text-sm text-[#2C7A53] dark:text-[#3EAE70] mt-1">{locale === 'es' ? 'Estado de cuenta' : 'Account status'}</p>
              </div>
            </motion.div>

            {/* Payment History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Historial de Pagos' : 'Payment History'}</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{requests.length} {locale === 'es' ? 'transacciones' : 'transactions'}</p>
                  </div>
                </div>
              </div>

              {requests.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                  {requests.map((request, index) => {
                    const statusInfo = getRequestStatusInfo(request.status);
                    const StatusIcon = statusInfo.icon;
                    const dateText =
                      request.status === 'APPROVED' && request.validatedAt
                        ? `${locale === 'es' ? 'Aprobado el' : 'Approved on'} ${formatDate(request.validatedAt)}`
                        : request.status === 'PENDING_VALIDATION'
                          ? `${locale === 'es' ? 'Enviado el' : 'Submitted on'} ${formatDate(request.createdAt)}`
                          : `${locale === 'es' ? 'Vence el' : 'Due on'} ${formatDate(request.dueDate)}`;

                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-[#222224] transition-colors"
                      >
                        <div className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                          statusInfo.bgColor
                        )}>
                          <StatusIcon className={cn('w-5 h-5', statusInfo.textColor)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {locale === 'es' ? 'Arriendo' : 'Rent'} · <span className="capitalize">{formatPeriod(request.periodMonth, request.periodYear)}</span>
                            </p>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium',
                              statusInfo.bgColor,
                              statusInfo.textColor
                            )}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {dateText}
                            {request.bankName && <> · {request.bankName}</>}
                          </p>
                          {request.referenceNumber && (
                            <p className="text-xs text-neutral-400 mt-1">Ref: {request.referenceNumber}</p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-[#C4503B] dark:text-[#E0664D] mt-1 italic">
                              {request.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(request.amount)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-neutral-400" />
                  </div>
                  <p className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'No hay historial de pagos' : 'No payment history'}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Contract Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
                <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                </div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Contrato' : 'Contract'}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{locale === 'es' ? 'Vigencia' : 'Term'}</p>
                  <p className="text-sm text-neutral-900 dark:text-white font-medium">
                    {formatFullDate(lease.startDate)} — {formatFullDate(lease.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{locale === 'es' ? 'Garantía' : 'Guarantee'}</p>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                    <p className="text-sm text-neutral-900 dark:text-white font-medium">
                      {lease.guaranteeType === 'poliza' ? (locale === 'es' ? 'Póliza de arriendo' : 'Rental insurance') :
                       lease.guaranteeType === 'codeudor' ? (locale === 'es' ? 'Codeudor' : 'Co-signer') :
                       lease.guaranteeType}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">{lease.guaranteeDetails}</p>
                </div>

                {/* Documents */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">{t('documents.title')}</p>

                  {lease.contractUrl && (
                    <a
                      href={lease.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-[#222224] rounded-xl hover:bg-neutral-100 dark:hover:bg-[#2a2a2c] transition-colors group"
                    >
                      <FileText className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-200 flex-1">{locale === 'es' ? 'Contrato de arriendo' : 'Lease agreement'}</span>
                      <Download className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </a>
                  )}

                  {lease.insuranceUrl && (
                    <a
                      href={lease.insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-[#222224] rounded-xl hover:bg-neutral-100 dark:hover:bg-[#2a2a2c] transition-colors group"
                    >
                      <Shield className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-200 flex-1">{locale === 'es' ? 'Póliza de seguro' : 'Insurance policy'}</span>
                      <Download className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </a>
                  )}

                  {lease.inventoryUrl && (
                    <a
                      href={lease.inventoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-[#222224] rounded-xl hover:bg-neutral-100 dark:hover:bg-[#2a2a2c] transition-colors group"
                    >
                      <Buildings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-200 flex-1">{locale === 'es' ? 'Inventario' : 'Inventory'}</span>
                      <Download className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Landlord Contact Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Propietario' : 'Landlord'}</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/12 flex items-center justify-center text-white text-xl font-semibold">
                    {lease.landlordName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{lease.landlordName}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Propietario verificado' : 'Verified landlord'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <a
                    href={`mailto:${lease.landlordEmail}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-50 dark:bg-[#222224] rounded-xl hover:bg-neutral-100 dark:hover:bg-[#2a2a2c] transition-colors"
                  >
                    <Envelope className="w-4 h-4 text-neutral-400" />
                    {lease.landlordEmail}
                  </a>
                  <a
                    href={`tel:${lease.landlordPhone}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-50 dark:bg-[#222224] rounded-xl hover:bg-neutral-100 dark:hover:bg-[#2a2a2c] transition-colors"
                  >
                    <Phone className="w-4 h-4 text-neutral-400" />
                    {lease.landlordPhone}
                  </a>
                </div>

                <Link
                  href="/inquilino/mensajes"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  <Chat className="w-4 h-4" />
                  {locale === 'es' ? 'Enviar mensaje' : 'Send message'}
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Payment Methods Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
                <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                </div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Métodos de pago' : 'Payment methods'}</h2>
              </div>
              <div className="p-4 space-y-2">
                {PAYMENT_METHODS.filter(m => m.enabled).slice(0, 4).map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-[#222224] rounded-xl"
                  >
                    <span className="text-xl">{method.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{method.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{method.processingTime}</p>
                    </div>
                    {method.fee && method.fee > 0 ? (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-[#2a2a2c] px-2 py-1 rounded-md">+{method.fee}%</span>
                    ) : (
                      <span className="text-xs text-[#2C7A53] dark:text-[#3EAE70] bg-[#E8F3EC] dark:bg-[#2C7A53]/15 px-2 py-1 rounded-md font-medium">{locale === 'es' ? 'Gratis' : 'Free'}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      <PayRentModal
        open={payModalOpen}
        leaseId={leaseId}
        onClose={() => setPayModalOpen(false)}
        onPaid={handlePaid}
        prefill={{ fullName: lease.tenantName, email: lease.tenantEmail }}
      />
    </div>
  );
}
