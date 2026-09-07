'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, FileText, Download, CreditCard, User, Phone, Envelope, Shield, House, Clock, CheckCircle, WarningCircle, ArrowUpRight, Receipt, Buildings, Wallet, TrendUp, Chat, XCircle, Prohibit, ArrowsClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  useLease,
  useMyPaymentRequests,
  useLeasePaymentInfo,
} from '@/lib/hooks/useLeases';
import { leasesApi } from '@/lib/api/leases.service';
import { PAYMENT_METHODS } from '@/lib/constants/payment-methods';
import { useI18n } from '@/lib/i18n';
import { PayRentModal } from '@/components/tenant/PayRentModal';
import type { TenantPaymentRequestStatus } from '@/lib/api/tenant-payment-requests.types';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

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

  const { lease, isLoading: leaseLoading, errorCrudo: leaseError, refetch: refetchLease } = useLease(leaseId);
  const { getForLease, refetch: refetchRequests } = useMyPaymentRequests();
  const { info: paymentInfo, refetch: refetchPaymentInfo } = useLeasePaymentInfo(leaseId);
  const requests = getForLease(leaseId);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [acceptingRenovacion, setAcceptingRenovacion] = useState(false);
  const [requestingRenovacion, setRequestingRenovacion] = useState(false);

  const isActive = lease?.status === 'active' || lease?.status === 'ending_soon';
  const periodStatus = paymentInfo?.currentPeriodStatus;
  // Si lease está activo y el período actual no tiene pago aprobado/pendiente,
  // o fue rechazado, el tenant puede pagar.
  const canPay = isActive && (periodStatus === 'NONE' || periodStatus === 'REJECTED' || !paymentInfo);

  if (leaseLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  /*
   * Si la carga falló, `lease` también queda en null — y esta pantalla decía
   * «no encontramos tu arriendo». A alguien con un arriendo vigente y mala
   * conexión le estábamos diciendo que no tiene contrato.
   */
  if (leaseError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <FalloDeCarga
          error={leaseError}
          queEs="tu arriendo"
          onReintentar={refetchLease}
          volverA={{ label: 'Mi arriendo', href: '/inquilino/arriendo' }}
        />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-6">
            <House className="w-10 h-10 text-fg-subtle" />
          </div>
          <h2 className="text-xl font-semibold text-fg mb-2">
            {locale === 'es' ? 'Arriendo no encontrado' : 'Rental not found'}
          </h2>
          <p className="text-fg-muted mb-6">
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
        return { label: locale === 'es' ? 'Aprobado' : 'Approved', bgColor: 'bg-success-soft', textColor: 'text-success', icon: CheckCircle };
      case 'PENDING_VALIDATION':
        return { label: locale === 'es' ? 'En verificación' : 'In verification', bgColor: 'bg-warning-soft', textColor: 'text-warning', icon: Clock };
      case 'PROCESSING':
        return { label: locale === 'es' ? 'Procesando' : 'Processing', bgColor: 'bg-warning-soft', textColor: 'text-warning', icon: Clock };
      case 'REJECTED':
      case 'DISPUTED':
        return { label: locale === 'es' ? 'Rechazado' : 'Rejected', bgColor: 'bg-danger-soft', textColor: 'text-danger', icon: XCircle };
      case 'CANCELLED':
        return { label: locale === 'es' ? 'Cancelado' : 'Cancelled', bgColor: 'bg-surface-muted', textColor: 'text-fg-muted', icon: Prohibit };
      default:
        return { label: status, bgColor: 'bg-surface-muted', textColor: 'text-fg-muted', icon: Clock };
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

  // Account-status card: drive label / icon / color from the real period status
  // (paymentInfo.currentPeriodStatus) instead of always showing "Al día".
  // Reuses the brand success/warning/danger convention used elsewhere in this view.
  const accountStatus = (() => {
    switch (periodStatus) {
      case 'PENDING_VALIDATION':
        return {
          label: locale === 'es' ? 'Pago en validación' : 'Payment under review',
          icon: Clock,
          cardClass:
            'bg-warning-soft border border-warning/30',
          iconClass: 'text-warning',
          captionClass: 'text-warning',
        };
      case 'REJECTED':
        return {
          label: locale === 'es' ? 'Pago rechazado' : 'Payment rejected',
          icon: XCircle,
          cardClass:
            'bg-danger-soft border border-danger/30',
          iconClass: 'text-danger',
          captionClass: 'text-danger',
        };
      case 'APPROVED':
        return {
          label: locale === 'es' ? 'Al día' : 'Up to date',
          icon: CheckCircle,
          cardClass:
            'bg-success-soft border border-success/30',
          iconClass: 'text-success',
          captionClass: 'text-success',
        };
      default:
        // 'NONE' or unknown → no confirmed/in-flight payment for the period.
        return {
          label: locale === 'es' ? 'Pago pendiente' : 'Payment pending',
          icon: WarningCircle,
          cardClass:
            'bg-warning-soft border border-warning/30',
          iconClass: 'text-warning',
          captionClass: 'text-warning',
        };
    }
  })();
  const AccountStatusIcon = accountStatus.icon;

  const handlePaid = () => {
    refetchRequests();
    refetchPaymentInfo();
  };

  const handleAcceptRenovacion = async () => {
    setAcceptingRenovacion(true);
    try {
      await leasesApi.acceptRenovacion(leaseId);
      toast.success(locale === 'es' ? 'Renovación aceptada' : 'Renewal accepted');
      refetchLease();
    } catch {
      toast.error(locale === 'es' ? 'No se pudo aceptar la renovación' : 'Could not accept the renewal');
    } finally {
      setAcceptingRenovacion(false);
    }
  };

  const handleRequestRenovacion = async () => {
    setRequestingRenovacion(true);
    try {
      await leasesApi.requestRenovacion(leaseId);
      toast.success(
        locale === 'es'
          ? 'Le avisamos a tu inmobiliaria que quieres renovar'
          : 'We let your agency know you want to renew',
      );
      refetchLease();
    } catch {
      toast.error(
        locale === 'es' ? 'No se pudo enviar la solicitud' : 'Could not send the request',
      );
    } finally {
      setRequestingRenovacion(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
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
          className="rounded-xl border border-border bg-surface overflow-hidden mb-8"
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
                    ? 'bg-warning-soft/90 text-warning'
                    : 'bg-success-soft/90 text-success'
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
                  <h1 className="text-2xl lg:text-3xl font-semibold text-fg tracking-tight">
                    {lease.propertyTitle}
                  </h1>
                  <p className="text-fg-muted mt-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {lease.propertyAddress}, {lease.propertyCity}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl lg:text-4xl font-bold text-fg tracking-tight">
                    {formatCurrency(lease.monthlyRent + (lease.adminFee ?? 0))}
                  </p>
                  <p className="text-sm text-fg-muted">/{locale === 'es' ? 'mes' : 'mo'}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-y border-border-faint">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">{locale === 'es' ? 'Arriendo' : 'Rent'}</p>
                  <p className="text-lg font-semibold text-fg">{formatCurrency(lease.monthlyRent)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">Admin</p>
                  <p className="text-lg font-semibold text-fg">{formatCurrency(lease.adminFee ?? 0)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">{locale === 'es' ? 'Día de pago' : 'Payment day'}</p>
                  <p className="text-lg font-semibold text-fg">{locale === 'es' ? 'Día' : 'Day'} {lease.paymentDay}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">{locale === 'es' ? 'Restante' : 'Remaining'}</p>
                  <p className="text-lg font-semibold text-fg">{daysRemaining} {locale === 'es' ? 'días' : 'days'}</p>
                </div>
              </div>

              {/* Contract Timeline */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-fg-muted flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-fg-subtle" />
                    {formatDate(lease.startDate)}
                  </span>
                  <span className="text-sm text-fg-muted">
                    {formatDate(lease.endDate)}
                  </span>
                </div>
                <div className="relative h-3 bg-surface-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${leaseProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                      "h-full rounded-full",
                      daysRemaining < 30 ? "bg-warning" : "bg-success"
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
                      daysRemaining < 30 ? "bg-warning" : "bg-success"
                    )} />
                  </motion.div>
                </div>
                <p className="text-xs text-fg-muted mt-2 text-center">
                  {leaseProgress}% {locale === 'es' ? 'del contrato transcurrido' : 'of contract elapsed'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Renewal — request / awaiting proposal / accept, or ending-soon prompt */}
            {lease.renovacion ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-primary/30 bg-primary-soft/40 p-6 lg:p-8"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowsClockwise className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {locale === 'es' ? 'Tu contrato está en proceso de renovación' : 'Your contract is up for renewal'}
                  </span>
                </div>

                {lease.renovacion.status === 'RENOV_PENDING' && !lease.renovacion.tenantAcceptedAt ? (
                  // Requested, but the agency hasn't proposed terms yet.
                  <p className="text-sm text-fg-muted max-w-lg">
                    {locale === 'es'
                      ? 'Le avisamos a tu inmobiliaria que quieres continuar. Están preparando la propuesta con el nuevo canon; te avisaremos apenas esté lista.'
                      : 'We told your agency you want to continue. They are preparing the proposal with the new rent; we will notify you as soon as it is ready.'}
                  </p>
                ) : (
                  <>
                    <p className="text-fg-muted text-sm mb-1">
                      {locale === 'es' ? 'Nuevo canon propuesto' : 'Proposed new rent'}
                    </p>
                    <p className="text-3xl font-bold text-fg tracking-tight">
                      {formatCurrency(lease.renovacion.proposedRent + (lease.renovacion.proposedAdminFee ?? 0))}
                      <span className="text-base font-normal text-fg-muted">/{locale === 'es' ? 'mes' : 'mo'}</span>
                    </p>
                    {lease.renovacion.newEndDate && (
                      <p className="text-sm text-fg-muted mt-1 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {locale === 'es' ? 'Nueva vigencia hasta ' : 'New term until '}
                        {formatFullDate(lease.renovacion.newEndDate)}
                      </p>
                    )}
                    {lease.renovacion.tenantAcceptedAt ? (
                      <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-success">
                        <CheckCircle className="w-5 h-5" weight="fill" />
                        {locale === 'es' ? 'Aceptaste la renovación' : 'You accepted the renewal'}
                      </p>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        hideArrow
                        onClick={handleAcceptRenovacion}
                        disabled={acceptingRenovacion}
                        className="mt-4"
                      >
                        <CheckCircle className="w-5 h-5" />
                        {locale === 'es' ? 'Aceptar renovación' : 'Accept renewal'}
                      </Button>
                    )}
                  </>
                )}
              </motion.div>
            ) : lease.status === 'ending_soon' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-warning/30 bg-warning-soft p-6 lg:p-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center flex-shrink-0">
                      <ArrowsClockwise className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-warning">
                        {locale === 'es' ? 'Tu contrato termina pronto' : 'Your contract is ending soon'}
                      </p>
                      <p className="text-sm text-fg-muted mt-1 max-w-md">
                        {locale === 'es'
                          ? '¿Quieres continuar? Avísale a tu inmobiliaria y prepararán la propuesta de renovación.'
                          : 'Want to continue? Let your agency know and they will prepare the renewal proposal.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    hideArrow
                    onClick={handleRequestRenovacion}
                    disabled={requestingRenovacion}
                    className="flex-shrink-0"
                  >
                    <ArrowsClockwise className="w-5 h-5" />
                    {locale === 'es' ? 'Quiero renovar' : 'I want to renew'}
                  </Button>
                </div>
              </motion.div>
            ) : null}

            {/* Pay Rent CTA — visible cuando lease está activo y se puede pagar */}
            {isActive && paymentInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'rounded-xl border p-6 lg:p-8',
                  periodStatus === 'PENDING_VALIDATION'
                    ? 'bg-warning-soft border-warning/30'
                    : periodStatus === 'APPROVED'
                      ? 'bg-success-soft border-success/30'
                      : 'bg-primary-soft border-primary/30'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {periodStatus === 'PENDING_VALIDATION' ? (
                        <>
                          <Clock className="w-4 h-4 text-warning" />
                          <span className="text-sm text-warning font-medium">
                            {locale === 'es' ? 'Pago en verificación bancaria' : 'Payment in bank verification'}
                          </span>
                        </>
                      ) : periodStatus === 'APPROVED' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm text-success font-medium">
                            {locale === 'es' ? 'Pago confirmado' : 'Payment confirmed'}
                          </span>
                        </>
                      ) : periodStatus === 'REJECTED' ? (
                        <>
                          <WarningCircle className="w-4 h-4 text-danger" />
                          <span className="text-sm text-danger font-medium">
                            {locale === 'es' ? 'Pago rechazado — reintentar' : 'Payment rejected — retry'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="text-sm text-primary font-medium">
                            {locale === 'es' ? 'Pagar arriendo' : 'Pay rent'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-4xl font-bold tracking-tight text-fg">
                      {formatCurrency(paymentInfo.monthlyRent)}
                    </p>
                    <p className="text-fg-muted mt-1 flex items-center gap-1.5 capitalize">
                      <Calendar className="w-4 h-4" />
                      {formatPeriod(paymentInfo.currentPeriod.month, paymentInfo.currentPeriod.year)}
                    </p>
                    {periodStatus === 'REJECTED' && paymentInfo.currentPeriodRejectionReason && (
                      <p className="text-xs text-danger mt-2 italic max-w-md">
                        {paymentInfo.currentPeriodRejectionReason}
                      </p>
                    )}
                  </div>
                  {canPay && (
                    <Button
                      type="button"
                      size="lg"
                      hideArrow
                      onClick={() => setPayModalOpen(true)}
                      className="px-8 py-4"
                    >
                      <Wallet className="w-5 h-5" />
                      {periodStatus === 'REJECTED'
                        ? (locale === 'es' ? 'Reintentar' : 'Retry')
                        : (locale === 'es' ? 'Pagar arriendo' : 'Pay rent')}
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
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
              <div className="rounded-xl bg-surface-muted p-5">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-3">
                  <TrendUp className="w-5 h-5 text-success" />
                </div>
                <p className="text-2xl font-bold text-fg">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-fg-muted mt-1">{locale === 'es' ? 'Total pagado' : 'Total paid'}</p>
              </div>
              <div className="rounded-xl bg-surface-muted p-5">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-fg">{approvedRequests.length}</p>
                <p className="text-sm text-fg-muted mt-1">{locale === 'es' ? 'Pagos realizados' : 'Payments made'}</p>
              </div>
              <div className={cn('rounded-xl p-5 col-span-2 sm:col-span-1', accountStatus.cardClass)}>
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-3">
                  <AccountStatusIcon className={cn('w-5 h-5', accountStatus.iconClass)} />
                </div>
                <p className="text-2xl font-bold text-fg">{accountStatus.label}</p>
                <p className={cn('text-sm mt-1', accountStatus.captionClass)}>{locale === 'es' ? 'Estado de cuenta' : 'Account status'}</p>
              </div>
            </motion.div>

            {/* Payment History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-faint">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-fg">{locale === 'es' ? 'Historial de Pagos' : 'Payment History'}</h2>
                    <p className="text-sm text-fg-muted">{requests.length} {locale === 'es' ? 'transacciones' : 'transactions'}</p>
                  </div>
                </div>
              </div>

              {requests.length > 0 ? (
                <div className="divide-y divide-border">
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
                        className="flex items-center gap-4 px-6 py-4 hover:bg-surface-muted transition-colors"
                      >
                        <div className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                          statusInfo.bgColor
                        )}>
                          <StatusIcon className={cn('w-5 h-5', statusInfo.textColor)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-fg">
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
                          <p className="text-sm text-fg-muted">
                            {dateText}
                            {request.bankName && <> · {request.bankName}</>}
                          </p>
                          {request.referenceNumber && (
                            <p className="text-xs text-fg-subtle mt-1">Ref: {request.referenceNumber}</p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-danger mt-1 italic">
                              {request.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-semibold text-fg">
                            {formatCurrency(request.amount)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-fg-subtle" />
                  </div>
                  <p className="text-fg-muted">{locale === 'es' ? 'No hay historial de pagos' : 'No payment history'}</p>
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
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-border-faint">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold text-fg">{locale === 'es' ? 'Contrato' : 'Contract'}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">{locale === 'es' ? 'Vigencia' : 'Term'}</p>
                  <p className="text-sm text-fg font-medium">
                    {formatFullDate(lease.startDate)} — {formatFullDate(lease.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-1">{locale === 'es' ? 'Garantía' : 'Guarantee'}</p>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-success" />
                    <p className="text-sm text-fg font-medium">
                      {lease.guaranteeType === 'poliza' ? (locale === 'es' ? 'Póliza de arriendo' : 'Rental insurance') :
                       lease.guaranteeType === 'codeudor' ? (locale === 'es' ? 'Codeudor' : 'Co-signer') :
                       lease.guaranteeType}
                    </p>
                  </div>
                  <p className="text-xs text-fg-muted mt-1 ml-6">{lease.guaranteeDetails}</p>
                </div>

                {/* Documents */}
                <div className="pt-4 border-t border-border-faint space-y-2">
                  <p className="text-xs text-fg-subtle uppercase tracking-wider mb-3">{t('documents.title')}</p>

                  {lease.contractUrl && (
                    <a
                      href={lease.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl hover:bg-surface-muted transition-colors group"
                    >
                      <FileText className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg flex-1">{locale === 'es' ? 'Contrato de arriendo' : 'Lease agreement'}</span>
                      <Download className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors" />
                    </a>
                  )}

                  {lease.insuranceUrl && (
                    <a
                      href={lease.insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl hover:bg-surface-muted transition-colors group"
                    >
                      <Shield className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg flex-1">{locale === 'es' ? 'Póliza de seguro' : 'Insurance policy'}</span>
                      <Download className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors" />
                    </a>
                  )}

                  {lease.inventoryUrl && (
                    <a
                      href={lease.inventoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl hover:bg-surface-muted transition-colors group"
                    >
                      <Buildings className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg flex-1">{locale === 'es' ? 'Inventario' : 'Inventory'}</span>
                      <Download className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors" />
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
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-border-faint">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-fg-muted" />
                </div>
                <h2 className="font-semibold text-fg">{locale === 'es' ? 'Propietario' : 'Landlord'}</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-primary text-xl font-semibold">
                    {lease.landlordName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-fg">{lease.landlordName}</p>
                    <p className="text-sm text-fg-muted">{locale === 'es' ? 'Propietario verificado' : 'Verified landlord'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <a
                    href={`mailto:${lease.landlordEmail}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:text-fg bg-surface-muted rounded-xl hover:bg-surface-muted transition-colors"
                  >
                    <Envelope className="w-4 h-4 text-fg-subtle" />
                    {lease.landlordEmail}
                  </a>
                  <a
                    href={`tel:${lease.landlordPhone}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:text-fg bg-surface-muted rounded-xl hover:bg-surface-muted transition-colors"
                  >
                    <Phone className="w-4 h-4 text-fg-subtle" />
                    {lease.landlordPhone}
                  </a>
                </div>

                <Link
                  href="/inquilino/mensajes"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-fg rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors"
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
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-5 border-b border-border-faint">
                <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-success" />
                </div>
                <h2 className="font-semibold text-fg">{locale === 'es' ? 'Métodos de pago' : 'Payment methods'}</h2>
              </div>
              <div className="p-4 space-y-2">
                {PAYMENT_METHODS.filter(m => m.enabled).slice(0, 4).map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl"
                  >
                    <span className="text-xl">{method.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-fg">{method.name}</p>
                      <p className="text-xs text-fg-muted">{method.processingTime}</p>
                    </div>
                    {method.fee && method.fee > 0 ? (
                      <span className="text-xs text-fg-muted bg-surface px-2 py-1 rounded-md">+{method.fee}%</span>
                    ) : (
                      <span className="text-xs text-success bg-success-soft px-2 py-1 rounded-md font-medium">{locale === 'es' ? 'Gratis' : 'Free'}</span>
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
