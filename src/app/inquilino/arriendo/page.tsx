'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, House, CreditCard, ArrowUpRight, CheckCircle, Clock } from '@phosphor-icons/react';

import { useLeases, useMyPayments } from '@/lib/hooks/useLeases';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';

/**
 * Tenant Leases Page - Landing Style (matching main dashboard)
 */
export default function ArriendoPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  const { leases, isLoading, error, refetch, getActive } = useLeases();
  const { getNextPayment } = useMyPayments();

  const activeLeases = isOnboardingComplete ? getActive() : [];

  // Calculate totals
  const totalMonthlyRent = activeLeases.reduce(
    (sum, lease) => sum + lease.monthlyRent + (lease.adminFee ?? 0),
    0
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Get days remaining for a lease
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Calculate lease progress (time elapsed)
  const getLeaseProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  };

  // Loading state
  if (isOnboardingLoading || isLoading) {
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
          <CompleteProfileFirst context="rental" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <ErrorState description={error} onRetry={refetch} />
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
            {t('rental.title')}
          </h1>
          <p className="mt-1 text-fg-muted dark:text-fg-subtle">
            {locale === 'es' ? 'Gestiona tus contratos de arriendo activos' : 'Manage your active rental contracts'}
          </p>
        </motion.header>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          {/* Active Leases */}
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <House className="w-5 h-5 text-fg dark:text-fg-subtle" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{locale === 'es' ? 'Arriendos activos' : 'Active rentals'}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {activeLeases.length}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">
              {locale === 'es' ? 'Contratos vigentes' : 'Current contracts'}
            </p>
          </div>

          {/* Total Monthly */}
          <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/12 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF] mb-1">{locale === 'es' ? 'Total mensual' : 'Monthly total'}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {formatCurrency(totalMonthlyRent)}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">
              {locale === 'es' ? 'Arriendo + administración' : 'Rent + admin fee'}
            </p>
          </div>

          {/* Status */}
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{locale === 'es' ? 'Estado general' : 'Overall status'}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {locale === 'es' ? 'Al día' : 'Up to date'}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">
              {locale === 'es' ? 'Todos los pagos al día' : 'All payments up to date'}
            </p>
          </div>
        </motion.div>

        {/* Leases List */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-fg dark:text-white">{locale === 'es' ? 'Contratos activos' : 'Active contracts'}</h2>
            <span className="text-sm text-fg-muted dark:text-fg-subtle">
              {activeLeases.length} {locale === 'es' ? (activeLeases.length !== 1 ? 'contratos' : 'contrato') : (activeLeases.length !== 1 ? 'contracts' : 'contract')}
            </span>
          </div>

          {activeLeases.length > 0 ? (
            <div className="space-y-4">
              {activeLeases.map((lease, index) => {
                const nextPayment = getNextPayment(lease.id);
                const daysRemaining = getDaysRemaining(lease.endDate);
                const leaseProgress = getLeaseProgress(lease.startDate, lease.endDate);

                return (
                  <motion.div
                    key={lease.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Link href={`/inquilino/arriendo/${lease.id}`}>
                      <div className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] hover:border-border dark:hover:border-border-strong hover: transition-all duration-300 overflow-hidden">
                        <div className="flex flex-col lg:flex-row">
                          {/* Image */}
                          <div className="relative w-full lg:w-72 h-52 lg:h-auto flex-shrink-0">
                            <Image
                              src={lease.propertyThumbnail}
                              alt={lease.propertyTitle}
                              fill
                              quality={90}
                              sizes="(max-width: 1024px) 100vw, 288px"
                              priority={index === 0}
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Status Badge */}
                            <div className="absolute top-4 left-4">
                              <span className={cn(
                                'px-3 py-1.5 text-xs font-medium rounded-full',
                                lease.status === 'ending_soon'
                                  ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]'
                                  : 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70]'
                              )}>
                                {lease.status === 'ending_soon' ? (locale === 'es' ? 'Termina pronto' : 'Ending soon') : t('common.active')}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-fg dark:text-white group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                                  {lease.propertyTitle}
                                </h3>
                                <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {lease.propertyAddress}
                                </p>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-2xl font-bold text-fg dark:text-white">
                                  {formatCurrency(lease.monthlyRent + (lease.adminFee ?? 0))}
                                </p>
                                <p className="text-xs text-fg-muted dark:text-fg-subtle">/mes</p>
                              </div>
                            </div>

                            {/* Contract Info Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border-faint dark:border-border-strong">
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Arriendo' : 'Rent'}</p>
                                <p className="text-sm font-medium text-fg dark:text-white">
                                  {formatCurrency(lease.monthlyRent)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Administración' : 'Admin fee'}</p>
                                <p className="text-sm font-medium text-fg dark:text-white">
                                  {formatCurrency(lease.adminFee ?? 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Día de pago' : 'Payment day'}</p>
                                <p className="text-sm font-medium text-fg dark:text-white">
                                  {locale === 'es' ? `Día ${lease.paymentDay}` : `Day ${lease.paymentDay}`}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Vencimiento' : 'Expiration'}</p>
                                <p className="text-sm font-medium text-fg dark:text-white">
                                  {formatShortDate(lease.endDate)}
                                </p>
                              </div>
                            </div>

                            {/* Contract Progress */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-fg-muted dark:text-fg-subtle mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(lease.startDate)}
                                </span>
                                <span>{formatDate(lease.endDate)}</span>
                              </div>
                              <div className="h-2 bg-surface-muted dark:bg-surface-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    daysRemaining < 30 ? "bg-[#B7791F]" : "bg-[#2C7A53]"
                                  )}
                                  style={{ width: `${leaseProgress}%` }}
                                />
                              </div>
                              <p className="text-xs text-fg-muted dark:text-fg-subtle mt-1.5 text-right">
                                {t('dashboard.daysRemaining', { days: daysRemaining })}
                              </p>
                            </div>

                            {/* Next Payment */}
                            {nextPayment && (
                              <div className="flex items-center justify-between mt-4 p-4 bg-surface-muted dark:bg-[#222224] rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-fg-muted dark:text-fg-subtle">{t('dashboard.nextPayment')}</p>
                                    <p className="text-sm font-semibold text-fg dark:text-white">
                                      {formatCurrency(nextPayment.amount)} · {formatShortDate(nextPayment.dueDate)}
                                    </p>
                                  </div>
                                </div>
                                <span className="flex items-center gap-1 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                                  {locale === 'es' ? 'Ver detalle' : 'View details'}
                                  <ArrowUpRight className="w-4 h-4" />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={House}
              title="No tienes arriendos activos"
              description="Cuando firmes un contrato de arriendo, tu información aparecerá aquí."
              action={{ label: "Ver aplicaciones", href: "/inquilino/aplicaciones" }}
            />
          )}
        </motion.section>

      </div>
    </div>
  );
}
