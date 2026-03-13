'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, WarningCircle, CreditCard, CurrencyDollar, CurrencyCircleDollar, Calendar, X, CheckCircle, Shield, Buildings, SpinnerGap, ArrowUpRight, CaretRight, CaretLeft, Receipt, Download } from '@phosphor-icons/react';

import { useLeases, useMyPayments } from '@/lib/hooks/useLeases';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import type { Payment } from '@/lib/types/lease';

interface PaymentRow extends Payment {
  propertyTitle: string;
  propertyThumbnail: string;
}

type PaymentStep = 'confirm' | 'processing' | 'success';

const ITEMS_PER_PAGE = 5;

/**
 * Tenant Payments Page - Landing Style (matching brand aesthetic)
 */
export default function PagosPage() {
  const { t, locale, formatCurrency: formatCurrencyI18n } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  const { getActive, isLoading: leasesLoading, error: leasesError, refetch: refetchLeases } = useLeases();
  const { payments: rawPayments, isLoading: paymentsLoading, getNextPayment } = useMyPayments();

  const activeLeases = isOnboardingComplete ? getActive() : [];
  const primaryLease = activeLeases[0];

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('confirm');
  const [currentPage, setCurrentPage] = useState(1);

  // Build enriched payment rows from leases + payments
  const leaseMap = new Map(activeLeases.map(l => [l.id, l]));
  const allPayments: PaymentRow[] = rawPayments
    .filter(p => leaseMap.has(p.leaseId))
    .map(p => {
      const lease = leaseMap.get(p.leaseId)!;
      return {
        ...p,
        propertyTitle: lease.propertyTitle,
        propertyThumbnail: lease.propertyThumbnail,
      };
    })
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const nextPayment = primaryLease ? getNextPayment(primaryLease.id) : undefined;

  // Pagination
  const totalPages = Math.ceil(allPayments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayments = allPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Calculate totals
  const totalPaid = allPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = allPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const formatDateLocale = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
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
    setTimeout(() => {
      setPaymentStep('success');
    }, 2000);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('confirm');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: t('payments.status.paid'),
          color: 'bg-emerald-100 text-emerald-700',
          icon: Check,
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
        };
      case 'pending':
        return {
          label: t('payments.status.pending'),
          color: 'bg-amber-100 text-amber-700',
          icon: Clock,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
        };
      default:
        return {
          label: t('payments.status.overdue'),
          color: 'bg-red-100 text-red-700',
          icon: WarningCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        };
    }
  };

  // Loading state
  if (isOnboardingLoading || leasesLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="payments" />
        </div>
      </div>
    );
  }

  // No active lease — show clean empty state (no fake stats, no mock Visa)
  if (!primaryLease) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
              {t('payments.title')}
            </h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
            {t('payments.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">{t('dashboard.nextPayment')}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {formatCurrencyI18n(nextPayment?.amount || 0)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              {daysUntil !== null ? t('dashboard.dueIn', { days: daysUntil }) : t('payments.noPayments')}
            </p>
          </div>

          {/* Total Paid */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <CurrencyDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('payments.summary.totalPaid')}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {formatCurrencyI18n(totalPaid)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{t('payments.summary.thisYear')}</p>
          </div>

          {/* Pending */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Calendar className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('common.pending')}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {formatCurrencyI18n(pendingAmount)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{t('payments.summary.nextDue')}</p>
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
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{t('payments.history')}</h2>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{allPayments.length} {t('nav.payments').toLowerCase()}</span>
            </div>

            {allPayments.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paginatedPayments.map((payment, index) => {
                    const statusConfig = getStatusConfig(payment.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md transition-all duration-300 overflow-hidden"
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Icon */}
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                            statusConfig.iconBg
                          )}>
                            <StatusIcon className={cn('w-6 h-6', statusConfig.iconColor)} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white">
                                  {payment.concept === 'rent' ? t('rental.monthlyRent') : payment.concept === 'deposit' ? t('payments.type.deposit') : t('nav.payments')}
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                  {payment.propertyTitle}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                                  {formatCurrencyI18n(payment.amount)}
                                </p>
                                <span className={cn(
                                  'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                                  statusConfig.color
                                )}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                {payment.status === 'paid' && payment.paidDate
                                  ? `${t('payments.details.paidOn')} ${formatShortDate(payment.paidDate)}`
                                  : `${t('payments.details.dueDate')} ${formatShortDate(payment.dueDate)}`}
                              </span>
                              {payment.status === 'paid' && (
                                <button className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors">
                                  <Download className="w-4 h-4" />
                                  {t('payments.details.receipt')}
                                </button>
                              )}
                              {payment.status === 'pending' && (
                                <button
                                  onClick={handlePayNow}
                                  className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                                >
                                  {t('dashboard.payNow')}
                                  <ArrowUpRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        'p-2 rounded-full transition-all',
                        currentPage === 1
                          ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                      )}
                    >
                      <CaretLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'w-10 h-10 rounded-full text-sm font-medium transition-all',
                            currentPage === page
                              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={cn(
                        'p-2 rounded-full transition-all',
                        currentPage === totalPages
                          ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                      )}
                    >
                      <CaretRight className="w-5 h-5" />
                    </button>
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
            {/* Next Payment Card */}
            {nextPayment && (
              <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/60 dark:to-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm">
                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{t('dashboard.nextPayment')}</span>
                </div>

                <p className="text-4xl font-bold tracking-tight mb-1 text-neutral-900 dark:text-white">
                  {formatCurrencyI18n(nextPayment.amount)}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 truncate">
                  {primaryLease.propertyTitle}
                </p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Progreso del mes' : 'Monthly progress'}</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{getPaymentProgress()}%</span>
                  </div>
                  <div className="h-2 bg-indigo-200 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${getPaymentProgress()}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-6 pb-4 border-b border-indigo-200 dark:border-indigo-800">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('payments.details.dueDate')}</span>
                  <span className="text-neutral-900 dark:text-white font-medium">{formatShortDate(nextPayment.dueDate)}</span>
                </div>

                <div className="flex items-center justify-between text-sm mb-6">
                  <span className={cn(
                    daysUntil !== null && daysUntil <= 3 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-neutral-500 dark:text-neutral-400'
                  )}>
                    {daysUntil === 0 ? t('dashboard.dueToday') : daysUntil !== null ? t('dashboard.dueIn', { days: daysUntil }) : ''}
                  </span>
                </div>

                <button
                  onClick={handlePayNow}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  {t('dashboard.payNow')}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Links */}
            <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { href: '/inquilino/documentos', icon: Receipt, label: locale === 'es' ? 'Ver recibos' : 'View receipts', desc: locale === 'es' ? 'Historial de comprobantes' : 'Receipt history' },
                  { href: '/inquilino/arriendo', icon: Buildings, label: t('nav.myRental'), desc: locale === 'es' ? 'Ver contrato actual' : 'View current contract' },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white dark:hover:bg-[#2a2a2c] transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                        <action.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{action.desc}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && nextPayment && primaryLease && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={paymentStep !== 'processing' ? handleCloseModal : undefined}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#1a1a1c] w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              {/* Confirm Step */}
              {paymentStep === 'confirm' && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-700">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{t('payments.confirm.title')}</h3>
                    <button
                      onClick={handleCloseModal}
                      className="p-2 hover:bg-stone-100 dark:hover:bg-[#2a2a2c] rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Property Info */}
                    <div className="flex items-center gap-3 p-4 bg-stone-50 dark:bg-[#2a2a2c] rounded-2xl mb-6">
                      <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-xl flex items-center justify-center overflow-hidden">
                        <Buildings className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{primaryLease.propertyTitle}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('rental.monthlyRent')}</p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-center mb-6">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('payments.confirm.amount')}</p>
                      <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                        {formatCurrencyI18n(nextPayment.amount)}
                      </p>
                      <p className="text-sm text-neutral-400 mt-1">
                        {t('payments.details.dueDate')} {formatDateLocale(nextPayment.dueDate)}
                      </p>
                    </div>

                    {/* Security Note */}
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-6">
                      <Shield className="w-4 h-4" />
                      <span>{locale === 'es' ? 'Serás redirigido a una pasarela de pago segura' : 'You will be redirected to a secure payment gateway'}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseModal}
                        className="flex-1 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-full hover:bg-stone-50 dark:hover:bg-[#2a2a2c] transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleConfirmPayment}
                        className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-full hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                      >
                        {t('payments.confirm.title')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Processing Step */}
              {paymentStep === 'processing' && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-stone-100 dark:bg-[#2a2a2c] rounded-full flex items-center justify-center mx-auto mb-4">
                    <SpinnerGap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {t('payments.confirm.processing')}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {locale === 'es' ? 'Por favor espera mientras procesamos tu pago...' : 'Please wait while we process your payment...'}
                  </p>
                </div>
              )}

              {/* Success Step */}
              {paymentStep === 'success' && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {t('payments.confirm.success')}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                    {locale === 'es'
                      ? `Tu pago de ${formatCurrencyI18n(nextPayment.amount)} ha sido procesado.`
                      : `Your payment of ${formatCurrencyI18n(nextPayment.amount)} has been processed.`}
                  </p>
                  <p className="text-xs text-neutral-400 mb-6">
                    {locale === 'es' ? 'Recibirás un comprobante en tu correo electrónico.' : 'You will receive a receipt in your email.'}
                  </p>

                  {/* Receipt Summary */}
                  <div className="bg-stone-50 dark:bg-[#2a2a2c] rounded-2xl p-4 mb-6 text-left">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Propiedad' : 'Property'}</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{primaryLease.propertyTitle}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-500 dark:text-neutral-400">{t('payments.details.amount')}</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{formatCurrencyI18n(nextPayment.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Fecha' : 'Date'}</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{formatDateLocale(new Date().toISOString())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">{t('payments.details.reference')}</span>
                      <span className="text-neutral-900 dark:text-white font-mono text-xs">PAY-{Date.now().toString().slice(-8)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCloseModal}
                    className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                  >
                    {t('common.close')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
