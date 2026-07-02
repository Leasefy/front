'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Clock, WarningCircle, CreditCard, CurrencyDollar, CurrencyCircleDollar, Calendar, Buildings, ArrowUpRight, CaretRight, Receipt, Prohibit, XCircle } from '@phosphor-icons/react';

import { useLeases, useMyPaymentRequests, useLeasePaymentInfo } from '@/lib/hooks/useLeases';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import { PayRentModal } from '@/components/tenant/PayRentModal';
import type {
  BackendTenantPaymentRequest,
  TenantPaymentRequestStatus,
} from '@/lib/api/tenant-payment-requests.types';

interface RequestRow extends BackendTenantPaymentRequest {
  propertyTitle: string;
}

const ITEMS_PER_PAGE = 5;

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Tenant Payments Page - Landing Style (matching brand aesthetic)
 */
export default function PagosPage() {
  const { t, locale, formatCurrency: formatCurrencyI18n } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  const { getActive, isLoading: leasesLoading } = useLeases();
  const {
    requests: rawRequests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useMyPaymentRequests();

  const activeLeases = isOnboardingComplete ? getActive() : [];
  const primaryLease = activeLeases[0];
  const {
    info: paymentInfo,
    refetch: refetchPaymentInfo,
  } = useLeasePaymentInfo(primaryLease?.id ?? null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Enriquecer requests con title de la propiedad (request.lease solo trae address+city)
  const leaseMap = new Map(activeLeases.map(l => [l.id, l]));
  const allRequests: RequestRow[] = rawRequests
    .filter(r => leaseMap.has(r.leaseId))
    .map(r => ({
      ...r,
      propertyTitle: leaseMap.get(r.leaseId)?.propertyTitle ?? `${r.lease.propertyAddress}, ${r.lease.propertyCity}`,
    }));

  // Pagination
  const totalPages = Math.ceil(allRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRequests = allRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats — sólo cuentan los APPROVED como "pagado", PENDING_VALIDATION como "pendiente".
  // El indicador "Total pagado / Este año" es year-to-date: se limita al año en curso.
  const currentYear = new Date().getFullYear();
  const totalPaid = allRequests
    .filter(r => r.status === 'APPROVED' && r.periodYear === currentYear)
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingAmount = allRequests
    .filter(r => r.status === 'PENDING_VALIDATION')
    .reduce((sum, r) => sum + r.amount, 0);

  // Próximo pago: si el período actual no tiene nada (NONE) o fue rechazado,
  // mostramos como "próximo" el monthlyRent del lease para el período actual.
  const showNextPaymentCta =
    paymentInfo?.currentPeriodStatus === 'NONE' || paymentInfo?.currentPeriodStatus === 'REJECTED';
  const nextAmount = showNextPaymentCta ? paymentInfo!.monthlyRent : 0;

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatPeriod = (month: number, year: number) => {
    const names = locale === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
    return `${names[month - 1]} ${year}`;
  };

  // Día de pago del mes calculado contra el día de pago del lease
  const getDaysUntilPayment = () => {
    if (!primaryLease || !showNextPaymentCta) return null;
    const today = new Date();
    let due = new Date(today.getFullYear(), today.getMonth(), primaryLease.paymentDay);
    if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, primaryLease.paymentDay);
    return Math.max(0, Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getPaymentProgress = () => {
    if (!primaryLease || !showNextPaymentCta) return 0;
    const today = new Date();
    const totalDays = primaryLease.paymentDay;
    const daysElapsed = Math.min(today.getDate(), totalDays);
    return Math.round((daysElapsed / totalDays) * 100);
  };

  const daysUntil = getDaysUntilPayment();

  const handlePayNow = () => setShowPaymentModal(true);
  const handleCloseModal = () => setShowPaymentModal(false);
  const handlePaid = () => {
    refetchRequests();
    refetchPaymentInfo();
  };

  const getStatusConfig = (status: TenantPaymentRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: locale === 'es' ? 'Aprobado' : 'Approved',
          color: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
          icon: Check,
          iconBg: 'bg-[#E8F3EC]',
          iconColor: 'text-[#2C7A53]',
        };
      case 'PENDING_VALIDATION':
        return {
          label: locale === 'es' ? 'En verificación' : 'In verification',
          color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
          icon: Clock,
          iconBg: 'bg-[#F8F0E0]',
          iconColor: 'text-[#B7791F]',
        };
      case 'REJECTED':
      case 'DISPUTED':
        return {
          label: locale === 'es' ? 'Rechazado' : 'Rejected',
          color: 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]',
          icon: XCircle,
          iconBg: 'bg-[#F8EAE7]',
          iconColor: 'text-[#C4503B]',
        };
      case 'CANCELLED':
        return {
          label: locale === 'es' ? 'Cancelado' : 'Cancelled',
          color: 'bg-surface-muted text-fg-muted',
          icon: Prohibit,
          iconBg: 'bg-surface-muted',
          iconColor: 'text-fg-muted',
        };
    }
  };

  // Loading state
  if (isOnboardingLoading || leasesLoading || requestsLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="payments" />
        </div>
      </div>
    );
  }

  // No active lease — show clean empty state (no fake stats, no mock Visa)
  if (!primaryLease) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
              {t('payments.title')}
            </h1>
            <p className="mt-1 text-fg-muted dark:text-fg-subtle">
              {t('payments.subtitle')}
            </p>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <EmptyState
              icon={CurrencyCircleDollar}
              title={locale === 'es' ? 'Sin pagos por ahora' : 'No payments yet'}
              description={locale === 'es'
                ? 'Cuando tengas un arriendo activo, aquí podrás ver tus pagos, recibos y estado de cuenta.'
                : 'When you have an active rental, you\'ll see your payments, receipts and account status here.'}
              action={{ label: locale === 'es' ? 'Explorar propiedades' : 'Explore properties', href: '/inquilino/explorar' }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
            {t('payments.title')}
          </h1>
          <p className="mt-1 text-fg-muted dark:text-fg-subtle">
            {t('payments.subtitle')}
          </p>
        </motion.header>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          {/* Next Payment */}
          <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/12 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF] mb-1">{t('dashboard.nextPayment')}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {formatCurrencyI18n(nextAmount)}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">
              {daysUntil !== null ? t('dashboard.dueIn', { days: daysUntil }) : t('payments.noPayments')}
            </p>
          </div>

          {/* Total Paid */}
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <CurrencyDollar className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{t('payments.summary.totalPaid')}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {formatCurrencyI18n(totalPaid)}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">{t('payments.summary.thisYear')}</p>
          </div>

          {/* Pending */}
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-fg dark:text-fg-subtle" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{t('common.pending')}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {formatCurrencyI18n(pendingAmount)}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">{t('payments.summary.nextDue')}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Payment History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-fg dark:text-white">{t('payments.history')}</h2>
              <span className="text-sm text-fg-muted dark:text-fg-subtle">{allRequests.length} {t('nav.payments').toLowerCase()}</span>
            </div>

            {allRequests.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paginatedRequests.map((request, index) => {
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;

                    const dateLabel =
                      request.status === 'APPROVED' && request.validatedAt
                        ? `${locale === 'es' ? 'Aprobado el' : 'Approved on'} ${formatShortDate(request.validatedAt)}`
                        : request.status === 'PENDING_VALIDATION'
                          ? `${locale === 'es' ? 'Enviado el' : 'Submitted on'} ${formatShortDate(request.createdAt)}`
                          : `${locale === 'es' ? 'Vence' : 'Due'} ${formatShortDate(request.dueDate)}`;

                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] hover:border-border dark:hover:border-border-strong hover: transition-all duration-300 overflow-hidden"
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                            statusConfig.iconBg
                          )}>
                            <StatusIcon className={cn('w-6 h-6', statusConfig.iconColor)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-fg dark:text-white">
                                  {locale === 'es' ? 'Arriendo' : 'Rent'} · <span className="capitalize">{formatPeriod(request.periodMonth, request.periodYear)}</span>
                                </h3>
                                <p className="text-sm text-fg-muted dark:text-fg-subtle truncate">
                                  {request.propertyTitle}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold text-fg dark:text-white">
                                  {formatCurrencyI18n(request.amount)}
                                </p>
                                <span className={cn(
                                  'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                                  statusConfig.color
                                )}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-faint dark:border-border-strong">
                              <span className="text-sm text-fg-muted dark:text-fg-subtle">
                                {dateLabel}
                                {request.bankName && <span className="ml-1">· {request.bankName}</span>}
                              </span>
                              {(request.status === 'REJECTED' || request.status === 'DISPUTED') && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={handlePayNow}
                                  className="h-auto gap-1 p-0"
                                >
                                  {locale === 'es' ? 'Reintentar' : 'Retry'}
                                  <ArrowUpRight className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            {request.rejectionReason && (
                              <p className="text-xs text-[#C4503B] dark:text-[#E0664D] mt-2 italic">
                                {request.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={CurrencyCircleDollar}
                title={locale === 'es' ? 'No hay historial de pagos' : 'No payment history'}
                description={locale === 'es'
                  ? 'Cuando realices pagos de arriendo, aparecerán aquí para tu seguimiento.'
                  : 'When you make rental payments, they will appear here for your tracking.'}
                action={{ label: locale === 'es' ? 'Ver arriendo' : 'View rental', href: '/inquilino/arriendo' }}
              />
            )}
          </motion.div>

          {/* Sidebar — only with active lease */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Period Status Card — depende de currentPeriodStatus */}
            {paymentInfo && (
              <PeriodStatusCard
                status={paymentInfo.currentPeriodStatus}
                rejectionReason={paymentInfo.currentPeriodRejectionReason}
                amount={paymentInfo.monthlyRent}
                propertyTitle={primaryLease.propertyTitle}
                periodLabel={formatPeriod(paymentInfo.currentPeriod.month, paymentInfo.currentPeriod.year)}
                paymentDay={paymentInfo.paymentDay}
                progress={getPaymentProgress()}
                daysUntil={daysUntil}
                onPay={handlePayNow}
                locale={locale}
                t={t}
                formatCurrency={formatCurrencyI18n}
              />
            )}

            {/* Quick Links */}
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-5">
              <h3 className="font-semibold text-fg dark:text-white mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { href: '/inquilino/documentos', icon: Receipt, label: locale === 'es' ? 'Ver recibos' : 'View receipts', desc: locale === 'es' ? 'Historial de comprobantes' : 'Receipt history' },
                  { href: '/inquilino/arriendo', icon: Buildings, label: t('nav.myRental'), desc: locale === 'es' ? 'Ver contrato actual' : 'View current contract' },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface dark:hover:bg-[#2a2a2c] transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center transition-shadow">
                        <action.icon className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg dark:text-white group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">{action.desc}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-fg-subtle group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {primaryLease && (
        <PayRentModal
          open={showPaymentModal}
          leaseId={primaryLease.id}
          onClose={handleCloseModal}
          onPaid={handlePaid}
          prefill={{ fullName: primaryLease.tenantName, email: primaryLease.tenantEmail }}
        />
      )}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

interface PeriodStatusCardProps {
  status: 'NONE' | 'PENDING_VALIDATION' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  amount: number;
  propertyTitle: string;
  periodLabel: string;
  paymentDay: number;
  progress: number;
  daysUntil: number | null;
  onPay: () => void;
  locale: 'es' | 'en';
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (n: number) => string;
}

function PeriodStatusCard({
  status,
  rejectionReason,
  amount,
  propertyTitle,
  periodLabel,
  paymentDay,
  progress,
  daysUntil,
  onPay,
  locale,
  t,
  formatCurrency,
}: PeriodStatusCardProps) {
  // PENDING_VALIDATION — viene del caso PSE PENDING (verificación bancaria)
  if (status === 'PENDING_VALIDATION') {
    return (
      <div className="rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/12 border border-[#B7791F]/30 dark:border-[#B7791F]/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
          </div>
          <span className="text-sm text-[#B7791F] dark:text-[#D2992F] font-medium">
            {locale === 'es' ? 'Pago en verificación' : 'Payment in verification'}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1 text-fg dark:text-white">
          {formatCurrency(amount)}
        </p>
        <p className="text-fg-muted dark:text-fg-subtle text-sm capitalize mb-4">{periodLabel}</p>
        <p className="text-sm text-fg dark:text-fg-subtle">
          {locale === 'es'
            ? 'Tu banco está verificando el pago. Vas a ver la confirmación cuando termine.'
            : 'Your bank is verifying the payment. You\'ll see the confirmation when it completes.'}
        </p>
      </div>
    );
  }

  // APPROVED — pago confirmado por el landlord
  if (status === 'APPROVED') {
    return (
      <div className="rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/12 border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center">
            <Check className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
          </div>
          <span className="text-sm text-[#2C7A53] dark:text-[#3EAE70] font-medium">
            {locale === 'es' ? 'Pago confirmado' : 'Payment confirmed'}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1 text-fg dark:text-white">
          {formatCurrency(amount)}
        </p>
        <p className="text-fg-muted dark:text-fg-subtle text-sm capitalize mb-4">{periodLabel}</p>
        <p className="text-sm text-fg dark:text-fg-subtle">
          {locale === 'es'
            ? 'Tu pago de este mes ya está al día.'
            : 'You\'re up to date for this month.'}
        </p>
      </div>
    );
  }

  // NONE | REJECTED — mostrar CTA "Pagar arriendo"
  return (
    <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/12 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
        </div>
        <span className="text-sm text-[#1A40FF] dark:text-[#5570FF] font-medium">
          {status === 'REJECTED'
            ? (locale === 'es' ? 'Pago rechazado' : 'Payment rejected')
            : t('dashboard.nextPayment')}
        </span>
      </div>

      {status === 'REJECTED' && rejectionReason && (
        <div className="mb-4 rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-3">
          <p className="text-xs text-[#C4503B] dark:text-[#E0664D]">{rejectionReason}</p>
        </div>
      )}

      <p className="text-4xl font-bold tracking-tight mb-1 text-fg dark:text-white">
        {formatCurrency(amount)}
      </p>
      <p className="text-fg-muted dark:text-fg-subtle text-sm mb-6 truncate">
        {propertyTitle}
      </p>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-fg-muted dark:text-fg-subtle">
            {locale === 'es' ? 'Progreso del mes' : 'Monthly progress'}
          </span>
          <span className="text-fg dark:text-white font-medium">{progress}%</span>
        </div>
        <Progress value={progress} size="sm" />
      </div>

      <div className="flex items-center justify-between text-sm mb-6 pb-4 border-b border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
        <span className="text-fg-muted dark:text-fg-subtle">
          {locale === 'es' ? 'Día de pago' : 'Payment day'}
        </span>
        <span className="text-fg dark:text-white font-medium">
          {locale === 'es' ? `Día ${paymentDay}` : `Day ${paymentDay}`}
        </span>
      </div>

      {daysUntil !== null && (
        <div className="flex items-center justify-between text-sm mb-6">
          <span className={cn(
            daysUntil <= 3 ? 'text-[#B7791F] dark:text-[#D2992F] font-medium' : 'text-fg-muted dark:text-fg-subtle'
          )}>
            {daysUntil === 0 ? t('dashboard.dueToday') : t('dashboard.dueIn', { days: daysUntil })}
          </span>
        </div>
      )}

      <Button onClick={onPay} hideArrow className="w-full">
        {status === 'REJECTED'
          ? (locale === 'es' ? 'Reintentar pago' : 'Retry payment')
          : t('dashboard.payNow')}
        <ArrowUpRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
