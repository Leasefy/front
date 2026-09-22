'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
// I1 (auditoría 13-09): el toast sale del design system, no de `sonner` pelado.
// Importarlo directo del paquete se salta el `<Toaster>` configurado de la casa
// (posición, duración, estilos) y produce un aviso que no se parece a los demás
// del producto — o que no se ve, si el proveedor montado es el del DS.
import { toast } from '@/components/ui/toast';
import { Check, Clock, WarningCircle, CreditCard, CurrencyCircleDollar, Calendar, Buildings, ArrowUpRight, CaretRight, Receipt, Prohibit, XCircle, Download } from '@phosphor-icons/react';

import { useLeases, useMyPaymentRequests, useLeasePaymentInfo } from '@/lib/hooks/useLeases';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import { PayRentModal } from '@/components/tenant/PayRentModal';
import { MediosDePagoDeLaInmobiliaria } from '@/components/tenant/MediosDePagoDeLaInmobiliaria';
import { AutopagoSection } from '@/components/tenant/AutopagoSection';
import { tenantPaymentRequestsApi } from '@/lib/api/tenant-payment-requests.service';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { fechaLegible, hoyLocal } from '@/components/estado-de-cuenta/filas';
import { diasHastaElDiaDePago, resumenDePagos, type ResumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';
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
 *
 * Wrapped in <Suspense> because it reads Wompi return params via useSearchParams
 * (Next requires a suspense boundary for search params on a static route).
 */
export default function PagosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <PagosPageContent />
    </Suspense>
  );
}

function PagosPageContent() {
  const { t, locale, formatCurrency: formatCurrencyI18n } = useI18n();
  const searchParams = useSearchParams();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  // `errorCrudo`: sin esto, una consulta muerta entraba como `[]` y la
  // pantalla decía «Sin pagos por ahora» —y antes de eso, «no tienes arriendo
  // activo»— a alguien que sí lo tiene. Dos afirmaciones falsas seguidas.
  const {
    getActive,
    isLoading: leasesLoading,
    errorCrudo: errorArriendos,
    refetch: recargarArriendos,
  } = useLeases();
  const {
    requests: rawRequests,
    isLoading: requestsLoading,
    errorCrudo: errorPagos,
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

  /*
   * 🔴 Las tarjetas de arriba salen del ESTADO DE CUENTA, no de las solicitudes
   * de pago (QA 22-09 P0: «Pendiente $0» a quien debía $50 M vencidos). Es la
   * misma fuente de «Mi estado de cuenta», así que las dos pantallas dicen lo
   * mismo. Si no llega, se dice —no se pinta un cero—.
   */
  const [resumen, setResumen] = useState<ResumenDePagos | null>(null);
  const [errorResumen, setErrorResumen] = useState<unknown>(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const cargarResumen = () => {
    setCargandoResumen(true);
    setErrorResumen(null);
    estadoDeCuentaApi
      .mio()
      .then((doc) => setResumen(resumenDePagos(doc, hoyLocal())))
      .catch((e: unknown) => setErrorResumen(e))
      .finally(() => setCargandoResumen(false));
  };
  const hayArriendo = Boolean(primaryLease);
  useEffect(() => {
    if (hayArriendo) cargarResumen();
  }, [hayArriendo]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const showNextPaymentCta =
    paymentInfo?.currentPeriodStatus === 'NONE' || paymentInfo?.currentPeriodStatus === 'REJECTED';

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatPeriod = (month: number, year: number) => {
    const names = locale === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
    return `${names[month - 1]} ${year}`;
  };

  // Día de pago del arriendo: los migrados no lo traen, y entonces no se afirma
  // un vencimiento ni una barra (de ahí salían «NaN días» y «NaN%»).
  const diaDePago = paymentInfo?.paymentDay ?? primaryLease?.paymentDay;
  const daysUntil = showNextPaymentCta ? diasHastaElDiaDePago(diaDePago, new Date()) : null;
  const getPaymentProgress = (): number | null => {
    if (daysUntil === null || typeof diaDePago !== 'number') return null;
    const daysElapsed = Math.min(new Date().getDate(), diaDePago);
    return Math.round((daysElapsed / diaDePago) * 100);
  };

  const handlePayNow = () => setShowPaymentModal(true);
  const handleCloseModal = () => setShowPaymentModal(false);
  const handlePaid = () => {
    refetchRequests();
    refetchPaymentInfo();
  };

  // Retorno de Wompi (sin éxito prematuro). Wompi puede volver acá con ?id / ?status,
  // parámetros controlados por el cliente: NUNCA son fuente de verdad ni ramifican la
  // UI. Solo un toast neutral de "confirmando" + refetch de la fuente real; el estado
  // pasa a pagado únicamente vía webhook del backend + validación del arrendador.
  useEffect(() => {
    const wompiId = searchParams.get('id');
    const wompiStatus = searchParams.get('status');
    if (wompiId && wompiStatus) {
      toast.info(
        locale === 'es'
          ? 'Estamos confirmando tu pago. Vas a ver la confirmación en tu historial cuando termine.'
          : 'We are confirming your payment. You will see the confirmation in your history when it completes.',
        { duration: 6000 },
      );
      refetchRequests();
      refetchPaymentInfo();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Comprobante interno (PAGO-03). Pide una URL firmada por el backend y descarga como
  // blob (oculta la URL de storage). Sin endpoint aún → getReceiptUrl devuelve null →
  // "Próximamente" honesto. Es un comprobante INTERNO, nunca una "factura" DIAN.
  const handleDownloadReceipt = async (request: RequestRow) => {
    let blobUrl: string | null = null;
    try {
      const receipt = await tenantPaymentRequestsApi.getReceiptUrl(request.id);
      if (!receipt) {
        toast.info(
          locale === 'es'
            ? 'El comprobante interno estará disponible próximamente.'
            : 'The internal receipt will be available soon.',
        );
        return;
      }
      const response = await fetch(receipt.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `comprobante-${request.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error(
        locale === 'es'
          ? 'No pudimos descargar el comprobante interno.'
          : 'We could not download the internal receipt.',
      );
    } finally {
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
    }
  };

  const getStatusConfig = (status: TenantPaymentRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: locale === 'es' ? 'Aprobado' : 'Approved',
          color: 'bg-success-soft text-success',
          icon: Check,
          iconBg: 'bg-success-soft',
          iconColor: 'text-success',
        };
      case 'PENDING_VALIDATION':
        return {
          label: locale === 'es' ? 'En verificación' : 'In verification',
          color: 'bg-warning-soft text-warning',
          icon: Clock,
          iconBg: 'bg-warning-soft',
          iconColor: 'text-warning',
        };
      case 'PROCESSING':
        return {
          label: locale === 'es' ? 'Procesando' : 'Processing',
          color: 'bg-warning-soft text-warning',
          icon: Clock,
          iconBg: 'bg-warning-soft',
          iconColor: 'text-warning',
        };
      case 'REJECTED':
      case 'DISPUTED':
        return {
          label: locale === 'es' ? 'Rechazado' : 'Rejected',
          color: 'bg-danger-soft text-danger',
          icon: XCircle,
          iconBg: 'bg-danger-soft',
          iconColor: 'text-danger',
        };
      case 'CANCELLED':
        return {
          label: locale === 'es' ? 'Cancelado' : 'Cancelled',
          color: 'bg-surface-muted text-fg-muted',
          icon: Prohibit,
          iconBg: 'bg-surface-muted',
          iconColor: 'text-fg-muted',
        };
      default:
        // Fallback defensivo: cualquier estado nuevo del backend no rompe la UI.
        return {
          label: status,
          color: 'bg-surface-muted text-fg-muted',
          icon: Clock,
          iconBg: 'bg-surface-muted',
          iconColor: 'text-fg-muted',
        };
    }
  };

  // Loading state
  if (isOnboardingLoading || leasesLoading || requestsLoading) {
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
          <CompleteProfileFirst context="payments" />
        </div>
      </div>
    );
  }

  // El fallo va ANTES de decidir si hay arriendo: `getActive()` devuelve `[]`
  // cuando la consulta murió, y entonces la rama de abajo concluye «no tienes
  // arriendo activo» sobre un dato que nunca llegó.
  if (errorArriendos || errorPagos) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <FalloDeCarga
            error={errorArriendos ?? errorPagos}
            queEs="tus pagos"
            onReintentar={() => {
              void recargarArriendos();
              void refetchRequests();
            }}
          />
        </div>
      </div>
    );
  }

  // No active lease — show clean empty state (no fake stats, no mock Visa)
  if (!primaryLease) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-medium text-fg tracking-tight">
              {t('payments.title')}
            </h1>
            <p className="mt-1 text-fg-muted">
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
              /* Al catálogo propio, no al listado general: es lo siguiente que
                 haría quien todavía no tiene un arriendo. */
              action={{ label: locale === 'es' ? 'Ver propiedades para mí' : 'View properties for me', href: '/inquilino/para-ti' }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

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
            {t('payments.title')}
          </h1>
          <p className="mt-1 text-fg-muted">
            {t('payments.subtitle')}
          </p>
        </motion.header>

        {/* Resumen — del estado de cuenta, el mismo documento de «Mi estado de cuenta» */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          {errorResumen ? (
            <FalloDeCarga error={errorResumen} queEs="lo que debes" onReintentar={cargarResumen} />
          ) : cargandoResumen || !resumen ? (
            <div className="flex h-40 items-center justify-center rounded-xl bg-surface-muted">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Próxima cuota */}
              <div className="rounded-xl bg-primary-soft border border-primary/30 p-6">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-primary mb-1">{locale === 'es' ? 'Próxima cuota' : 'Next installment'}</p>
                <p className="text-3xl font-bold font-mono text-fg tracking-tight">
                  {resumen.proxima ? formatCurrencyI18n(resumen.proxima.valor) : '—'}
                </p>
                <p className="text-sm text-fg-muted mt-2">
                  {resumen.proxima
                    ? resumen.proxima.diasQueFaltan === 0
                      ? t('dashboard.dueToday')
                      : `${locale === 'es' ? 'Vence el' : 'Due'} ${fechaLegible(resumen.proxima.fecha)}`
                    : locale === 'es'
                      ? 'No quedan cuotas por vencer'
                      : 'No upcoming installments'}
                </p>
              </div>

              {/* Vencido */}
              <div className={cn('rounded-xl p-6', resumen.vencidoCop > 0 ? 'bg-danger-soft border border-danger/30' : 'bg-surface-muted')}>
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
                  <WarningCircle className={cn('w-5 h-5', resumen.vencidoCop > 0 ? 'text-danger' : 'text-success')} />
                </div>
                <p className="text-sm text-fg-muted mb-1">{locale === 'es' ? 'Vencido' : 'Overdue'}</p>
                <p className="text-3xl font-bold font-mono text-fg tracking-tight">
                  {formatCurrencyI18n(resumen.vencidoCop)}
                </p>
                <p className="text-sm text-fg-muted mt-2">
                  {resumen.cuotasVencidas === 0
                    ? (locale === 'es' ? 'Estás al día' : 'You are up to date')
                    : locale === 'es'
                      ? `${resumen.cuotasVencidas} ${resumen.cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}`
                      : `${resumen.cuotasVencidas} overdue`}
                </p>
              </div>

              {/* Resta por pagar */}
              <div className="rounded-xl bg-surface-muted p-6">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5 text-fg-muted" />
                </div>
                <p className="text-sm text-fg-muted mb-1">{locale === 'es' ? 'Resta por pagar' : 'Remaining'}</p>
                <p className="text-3xl font-bold font-mono text-fg tracking-tight">
                  {formatCurrencyI18n(resumen.restaPorPagar)}
                </p>
                <Link href="/inquilino/estado-de-cuenta" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  {locale === 'es' ? 'Ver mi estado de cuenta' : 'View my statement'}
                  <CaretRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Cómo pagar: los medios que configuró la inmobiliaria (no se pinta si no hay) */}
        <MediosDePagoDeLaInmobiliaria />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Payment History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-fg">{t('payments.history')}</h2>
              <span className="text-sm text-fg-muted">{allRequests.length} {t('nav.payments').toLowerCase()}</span>
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
                        className="group rounded-xl border border-border bg-surface hover:border-border-strong transition-all duration-300 overflow-hidden"
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
                                <h3 className="font-semibold text-fg">
                                  {locale === 'es' ? 'Arriendo' : 'Rent'} · <span className="capitalize">{formatPeriod(request.periodMonth, request.periodYear)}</span>
                                </h3>
                                <p className="text-sm text-fg-muted truncate">
                                  {request.propertyTitle}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold text-fg">
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

                            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border-faint">
                              <span className="text-sm text-fg-muted min-w-0 truncate">
                                {dateLabel}
                                {request.bankName && <span className="ml-1">· {request.bankName}</span>}
                              </span>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {(request.status === 'APPROVED' || request.status === 'PENDING_VALIDATION') &&
                                  request.hasReceipt && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => handleDownloadReceipt(request)}
                                      className="h-auto gap-1 p-0"
                                    >
                                      <Download className="w-4 h-4" />
                                      {locale === 'es' ? 'Comprobante interno' : 'Internal receipt'}
                                    </Button>
                                  )}
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
                            </div>

                            {request.rejectionReason && (
                              <p className="text-xs text-danger mt-2 italic">
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

                {/* Comprobante interno vs. factura electrónica (DIAN) — disclosure honesto, una vez. */}
                <p className="mt-4 text-xs text-fg-muted">
                  {locale === 'es'
                    ? 'Los comprobantes son de uso interno; la factura electrónica (DIAN) estará disponible más adelante.'
                    : 'Receipts are for internal use; the DIAN electronic invoice will be available later.'}
                </p>
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
            <div className="rounded-xl bg-surface-muted p-5">
              <h3 className="font-semibold text-fg mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { href: '/inquilino/documentos', icon: Receipt, label: locale === 'es' ? 'Ver recibos' : 'View receipts', desc: locale === 'es' ? 'Historial de comprobantes' : 'Receipt history' },
                  { href: '/inquilino/arriendo', icon: Buildings, label: t('nav.myRental'), desc: locale === 'es' ? 'Ver contrato actual' : 'View current contract' },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center transition-shadow">
                        <action.icon className="w-5 h-5 text-fg-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-fg-muted truncate">{action.desc}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-fg-subtle group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 🔴 Autopago (PAGO-04). Hasta el 21-09-2026 esto mostraba
                «Próximamente» sobre un endpoint que no existía. Ya existe
                (`/portal/autopago`), y se llavea por CONTRATO —no por
                arriendo—: la deuda nace con el contrato y vive en sus cuotas. */}
            <AutopagoSection
              contractId={primaryLease?.contractId ?? null}
              canonCop={primaryLease?.monthlyRent ?? null}
            />
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
  paymentDay: number | null | undefined;
  /** `null` sin día de pago: no se pinta la barra (antes salía «NaN%»). */
  progress: number | null;
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
      <div className="rounded-xl bg-warning-soft border border-warning/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <span className="text-sm text-warning font-medium">
            {locale === 'es' ? 'Pago en verificación' : 'Payment in verification'}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1 text-fg">
          {formatCurrency(amount)}
        </p>
        <p className="text-fg-muted text-sm capitalize mb-4">{periodLabel}</p>
        <p className="text-sm text-fg-muted">
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
      <div className="rounded-xl bg-success-soft border border-success/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
            <Check className="w-5 h-5 text-success" />
          </div>
          <span className="text-sm text-success font-medium">
            {locale === 'es' ? 'Pago confirmado' : 'Payment confirmed'}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1 text-fg">
          {formatCurrency(amount)}
        </p>
        <p className="text-fg-muted text-sm capitalize mb-4">{periodLabel}</p>
        <p className="text-sm text-fg-muted">
          {locale === 'es'
            ? 'Tu pago de este mes ya está al día.'
            : 'You\'re up to date for this month.'}
        </p>
      </div>
    );
  }

  // NONE | REJECTED — mostrar CTA "Pagar arriendo"
  return (
    <div className="rounded-xl bg-primary-soft border border-primary/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm text-primary font-medium">
          {status === 'REJECTED'
            ? (locale === 'es' ? 'Pago rechazado' : 'Payment rejected')
            : /* Es el canon que cobra «Pagar ahora», no la próxima cuota del
                 estado de cuenta: llamarlo igual daba dos «Próximo pago» con
                 montos distintos en la misma pantalla. */
              (locale === 'es' ? `Canon de ${periodLabel}` : `Rent for ${periodLabel}`)}
        </span>
      </div>

      {status === 'REJECTED' && rejectionReason && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3">
          <p className="text-xs text-danger">{rejectionReason}</p>
        </div>
      )}

      <p className="text-4xl font-bold tracking-tight mb-1 text-fg">
        {formatCurrency(amount)}
      </p>
      <p className="text-fg-muted text-sm mb-6 truncate">
        {propertyTitle}
      </p>

      {progress !== null && typeof paymentDay === 'number' && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-fg-muted">
                {locale === 'es' ? 'Progreso del mes' : 'Monthly progress'}
              </span>
              <span className="text-fg font-medium">{progress}%</span>
            </div>
            <Progress value={progress} size="sm" />
          </div>

          <div className="flex items-center justify-between text-sm mb-6 pb-4 border-b border-primary/30">
            <span className="text-fg-muted">
              {locale === 'es' ? 'Día de pago' : 'Payment day'}
            </span>
            <span className="text-fg font-medium">
              {locale === 'es' ? `Día ${paymentDay}` : `Day ${paymentDay}`}
            </span>
          </div>
        </>
      )}

      {daysUntil !== null && (
        <div className="flex items-center justify-between text-sm mb-6">
          <span className={cn(
            daysUntil <= 3 ? 'text-warning font-medium' : 'text-fg-muted'
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
