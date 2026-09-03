'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, House, CreditCard, ArrowUpRight, CheckCircle, Clock, WarningCircle } from '@phosphor-icons/react';

import { toast } from 'sonner';
import { useLeases, useMyPayments, useLeasePaymentInfo } from '@/lib/hooks/useLeases';
import { leasesApi } from '@/lib/api/leases.service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Spinner } from '@/components/ui/spinner';

/**
 * Tenant Leases Page - Landing Style (matching main dashboard)
 */
export default function ArriendoPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  const { leases, isLoading, error, errorCrudo, refetch, getActive } = useLeases();
  const { getNextPayment } = useMyPayments();

  const activeLeases = isOnboardingComplete ? getActive() : [];
  const primaryLease = activeLeases[0];

  // Estado del período actual — misma fuente única que pagos/page.tsx.
  const { info: paymentInfo } = useLeasePaymentInfo(primaryLease?.id ?? null);

  // Calculate totals
  const totalMonthlyRent = activeLeases.reduce(
    (sum, lease) => sum + lease.monthlyRent + (lease.adminFee ?? 0),
    0
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="rental" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* `ErrorState` mostraba el mensaje crudo del backend y ofrecía
              reintentar siempre, incluso sobre un 404. `FalloDeCarga` clasifica
              el fallo y sólo ofrece reintentar cuando puede cambiar algo. */}
          <FalloDeCarga error={errorCrudo ?? error} queEs="tu arriendo" onReintentar={refetch} />
        </div>
      </div>
    );
  }

  // Estado general — refleja el período actual real (currentPeriodStatus), no una
  // constante "Al día". Neutral y factual: sin "EN MORA", sin countdown, sin
  // referencias a centrales de riesgo (PAGO-01 / PITFALLS 8).
  const overallStatus = (() => {
    switch (paymentInfo?.currentPeriodStatus) {
      case 'APPROVED':
        return {
          label: locale === 'es' ? 'Al día' : 'Up to date',
          detail: locale === 'es' ? 'Pago del período confirmado' : 'Current period confirmed',
          Icon: CheckCircle,
          iconColor: 'text-success',
        };
      case 'PENDING_VALIDATION':
        return {
          label: locale === 'es' ? 'En verificación' : 'In verification',
          detail: locale === 'es' ? 'Pago en proceso de validación' : 'Payment being validated',
          Icon: Clock,
          iconColor: 'text-warning',
        };
      case 'REJECTED':
        return {
          label: locale === 'es' ? 'Pago rechazado' : 'Payment rejected',
          detail:
            paymentInfo?.currentPeriodRejectionReason ??
            (locale === 'es' ? 'Revisa el estado de cuenta' : 'Check your account status'),
          Icon: WarningCircle,
          iconColor: 'text-danger',
        };
      case 'NONE':
        return {
          label: locale === 'es' ? 'Pendiente' : 'Pending',
          detail: locale === 'es' ? 'Pago del período pendiente' : 'Current period pending',
          Icon: Clock,
          iconColor: 'text-fg-subtle',
        };
      default:
        return null; // sin arriendo activo / info no cargada
    }
  })();
  const OverallStatusIcon = overallStatus?.Icon ?? Clock;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg tracking-tight">
            {t('rental.title')}
          </h1>
          <p className="mt-1 text-fg-muted">
            {locale === 'es' ? 'Gestiona tus contratos de arriendo activos' : 'Manage your active rental contracts'}
          </p>
        </motion.header>

        {/*
          Los KPI solo cuando hay algo que resumir.
          Sin contratos decían "0", "$0" y —lo peor— "Al día · Todos los pagos
          al día", que es una afirmación FALSA: no hay pagos que estén al día.
          Un resumen de nada no informa, y encima ocupa el lugar donde debería
          estar lo único útil de esta pantalla: qué hacer para tener un arriendo.
        */}
        {activeLeases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          {/* Active Leases */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <House className="w-5 h-5 text-fg-subtle" />
            </div>
            <p className="text-sm text-fg-muted mb-1">{locale === 'es' ? 'Arriendos activos' : 'Active rentals'}</p>
            <p className="text-3xl font-bold text-fg tracking-tight">
              {activeLeases.length}
            </p>
            <p className="text-sm text-fg-muted mt-2">
              {locale === 'es' ? 'Contratos vigentes' : 'Current contracts'}
            </p>
          </div>

          {/* Total Monthly */}
          <div className="rounded-xl bg-primary-soft border border-primary/30 p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-primary mb-1">{locale === 'es' ? 'Total mensual' : 'Monthly total'}</p>
            <p className="text-3xl font-bold text-fg tracking-tight">
              {formatCurrency(totalMonthlyRent)}
            </p>
            <p className="text-sm text-fg-muted mt-2">
              {locale === 'es' ? 'Arriendo + administración' : 'Rent + admin fee'}
            </p>
          </div>

          {/* Status — refleja el currentPeriodStatus real, no una constante */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <OverallStatusIcon className={cn('w-5 h-5', overallStatus?.iconColor ?? 'text-fg-subtle')} />
            </div>
            <p className="text-sm text-fg-muted mb-1">{locale === 'es' ? 'Estado general' : 'Overall status'}</p>
            <p className="text-3xl font-bold text-fg tracking-tight">
              {overallStatus ? overallStatus.label : '—'}
            </p>
            <p className="text-sm text-fg-muted mt-2">
              {overallStatus
                ? overallStatus.detail
                : (locale === 'es' ? 'Sin información de pago' : 'No payment info')}
            </p>
          </div>
        </motion.div>
        )}

        {/* Leases List */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Sin contratos no va el encabezado: "Contratos activos · 0
              contratos" arriba de "No tienes arriendos activos" dice lo mismo
              dos veces, y la segunda ya lo dice mejor. */}
          {activeLeases.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-fg">{locale === 'es' ? 'Contratos activos' : 'Active contracts'}</h2>
              <span className="text-sm text-fg-muted">
                {activeLeases.length} {locale === 'es' ? (activeLeases.length !== 1 ? 'contratos' : 'contrato') : (activeLeases.length !== 1 ? 'contracts' : 'contract')}
              </span>
            </div>
          )}

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
                      <div className="group rounded-xl border border-border bg-surface hover:border-border-strong transition-all duration-300 overflow-hidden">
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
                                  ? 'bg-warning-soft text-warning'
                                  : 'bg-success-soft text-success'
                              )}>
                                {lease.status === 'ending_soon' ? (locale === 'es' ? 'Termina pronto' : 'Ending soon') : t('common.active')}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6">
                            {lease.renovacion && (
                              <div className="mb-4 rounded-lg border border-primary/30 bg-primary-soft/40 p-3">
                                <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                                  <ArrowUpRight className="w-4 h-4" />
                                  {locale === 'es' ? 'Tu contrato está en proceso de renovación' : 'Your contract is up for renewal'}
                                </p>
                                <p className="text-xs text-fg-muted mt-1">
                                  {locale === 'es' ? 'Nuevo canon propuesto: ' : 'Proposed new rent: '}
                                  <span className="font-semibold text-fg">
                                    {formatCurrency(lease.renovacion.proposedRent + (lease.renovacion.proposedAdminFee ?? 0))}
                                  </span>
                                </p>
                                {lease.renovacion.tenantAcceptedAt ? (
                                  <p className="mt-2 text-xs font-medium text-success flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" weight="fill" />
                                    {locale === 'es' ? 'Aceptaste la renovación' : 'You accepted the renewal'}
                                  </p>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      try {
                                        await leasesApi.acceptRenovacion(lease.id);
                                        toast.success(locale === 'es' ? 'Renovación aceptada' : 'Renewal accepted');
                                        refetch();
                                      } catch {
                                        toast.error(locale === 'es' ? 'No se pudo aceptar' : 'Could not accept');
                                      }
                                    }}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    {locale === 'es' ? 'Aceptar renovación' : 'Accept renewal'}
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-fg group-hover:text-primary transition-colors">
                                  {lease.propertyTitle}
                                </h3>
                                <p className="text-sm text-fg-muted mt-1 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {lease.propertyAddress}
                                </p>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-2xl font-bold text-fg">
                                  {formatCurrency(lease.monthlyRent + (lease.adminFee ?? 0))}
                                </p>
                                <p className="text-xs text-fg-muted">/mes</p>
                              </div>
                            </div>

                            {/* Contract Info Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border-faint">
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Arriendo' : 'Rent'}</p>
                                <p className="text-sm font-medium text-fg">
                                  {formatCurrency(lease.monthlyRent)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Administración' : 'Admin fee'}</p>
                                <p className="text-sm font-medium text-fg">
                                  {formatCurrency(lease.adminFee ?? 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Día de pago' : 'Payment day'}</p>
                                <p className="text-sm font-medium text-fg">
                                  {locale === 'es' ? `Día ${lease.paymentDay}` : `Day ${lease.paymentDay}`}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Vencimiento' : 'Expiration'}</p>
                                <p className="text-sm font-medium text-fg">
                                  {formatShortDate(lease.endDate)}
                                </p>
                              </div>
                            </div>

                            {/* Contract Progress */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-fg-muted mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(lease.startDate)}
                                </span>
                                <span>{formatDate(lease.endDate)}</span>
                              </div>
                              <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    daysRemaining < 30 ? "bg-warning" : "bg-success"
                                  )}
                                  style={{ width: `${leaseProgress}%` }}
                                />
                              </div>
                              <p className="text-xs text-fg-muted mt-1.5 text-right">
                                {t('dashboard.daysRemaining', { days: daysRemaining })}
                              </p>
                            </div>

                            {/* Next Payment */}
                            {nextPayment && (
                              <div className="flex items-center justify-between mt-4 p-4 bg-surface-muted rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-fg-muted" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-fg-muted">{t('dashboard.nextPayment')}</p>
                                    <p className="text-sm font-semibold text-fg">
                                      {formatCurrency(nextPayment.amount)} · {formatShortDate(nextPayment.dueDate)}
                                    </p>
                                  </div>
                                </div>
                                <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:text-primary transition-colors">
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
              /* "aplicaciones" está muerto (docs/VOCABULARIO.md). Y quien no
                 tiene arriendo no necesita revisar su historial: necesita
                 encontrar dónde vivir. */
              action={{ label: 'Ver propiedades para mí', href: '/inquilino/para-ti' }}
            />
          )}
        </motion.section>

      </div>
    </div>
  );
}
