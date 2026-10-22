'use client';

import { plataQueLlega } from '@/lib/plata/plata-que-llega';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PortadaDelInmueble } from '@/components/property/PortadaDelInmueble';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AnimatedNumber,
  Avatar,
  Cifra,
  CrossFade,
  FranjaDeCifras,
  MonoLabel,
  Presence,
  StaggerItem,
  StatusBadge,
  motionDuration,
  motionEase,
  type TonoDeCifra,
} from '@leasefy/cadence';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { MapPin, Calendar, FileText, Download, CreditCard, Phone, Envelope, Shield, House, Clock, CheckCircle, WarningCircle, Receipt, Buildings, Wallet, Chat, XCircle, Prohibit, ArrowsClockwise, Bank, DeviceMobile, Money } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { cn } from '@/lib/utils';
import {
  useLease,
  useMyPaymentRequests,
  useLeasePaymentInfo,
} from '@/lib/hooks/useLeases';
import { useEstadoDeCuentaDelPortal } from '@/lib/hooks/useResumenDelPortal';
import { resumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';
import { hoyLocal } from '@/components/estado-de-cuenta/filas';
import { amortizacionDe } from '@/components/estado-de-cuenta/resumen';
import { fechaDeLaSolicitud } from '@/lib/pagos/fecha-de-la-solicitud';
import { fraseDeLoVencido, diaDePagoLegible } from '@/lib/estado-de-cuenta/estado-general-del-portal';
import { leasesApi } from '@/lib/api/leases.service';
import { PAYMENT_METHODS } from '@/lib/constants/payment-methods';
import { useI18n } from '@/lib/i18n';
import { PayRentModal } from '@/components/tenant/PayRentModal';
import type { TenantPaymentRequestStatus } from '@/lib/api/tenant-payment-requests.types';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { NoVoyARenovar } from '@/components/inquilino/NoVoyARenovar';
import { fechaDeVigencia } from '@/lib/contratos/fecha-de-vigencia';

/**
 * QA-INQ-95: el inicio y el fin del arriendo son DÍAS. `new Date('2025-11-01T00:00:00.000Z')`
 * en Colombia es el 31 de octubre: «Mi arriendo» decía «31 de oct de 2025 → 30 de oct de 2026»
 * de un contrato del 1 de noviembre al 31 de octubre. Un instante (con hora) sigue siendo instante.
 */
function diaDelArriendo(iso: string): Date {
  return fechaDeVigencia(iso) ?? new Date(iso);
}

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** El ícono de la familia de cada medio de pago (antes, un emoji). */
const ICONO_DEL_MEDIO: Record<string, typeof CreditCard> = {
  pse: Bank,
  credit_card: CreditCard,
  debit_card: CreditCard,
  nequi: DeviceMobile,
  daviplata: DeviceMobile,
  cash: Money,
};

/** El tono del StatusBadge de cada pago, desde el color que ya decide `getStatusInfo`. */
const TONO_DEL_PAGO: Record<string, 'success' | 'warning' | 'critical' | 'neutral'> = {
  'text-success': 'success',
  'text-warning': 'warning',
  'text-danger': 'critical',
  'text-fg-muted': 'neutral',
};

export default function LeaseDetailPage() {
  const { t, locale, formatCurrency } = useI18n();
  const params = useParams();
  const leaseId = params.leaseId as string;

  const { lease, isLoading: leaseLoading, errorCrudo: leaseError, refetch: refetchLease } = useLease(leaseId);
  const { getForLease, refetch: refetchRequests } = useMyPaymentRequests();
  const { info: paymentInfo, refetch: refetchPaymentInfo } = useLeasePaymentInfo(leaseId);
  // UNA lectura del estado de cuenta: el estado de la cuenta y lo pagado de ESTE
  // contrato salen de ahí (QA-INQ-95, PI-08: «Total pagado» sumaba solicitudes de
  // pago aprobadas —también las de recibos anulados— y daba $10.840.670 donde el
  // estado de cuenta dice $7.050.000).
  const estadoDeCuenta = useEstadoDeCuentaDelPortal(true);
  const resumenDeCuotas = estadoDeCuenta ? resumenDePagos(estadoDeCuenta, hoyLocal()) : null;
  const requests = getForLease(leaseId);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [acceptingRenovacion, setAcceptingRenovacion] = useState(false);
  const [requestingRenovacion, setRequestingRenovacion] = useState(false);

  const isActive = lease?.status === 'active' || lease?.status === 'ending_soon';
  const periodStatus = paymentInfo?.currentPeriodStatus;
  // Si lease está activo y el período actual no tiene pago aprobado/pendiente,
  // o fue rechazado, el tenant puede pagar.
  const canPay = isActive && (periodStatus === 'NONE' || periodStatus === 'REJECTED' || !paymentInfo);

  // Carga → contenido: el arriendo entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(leaseLoading);

  if (leaseLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" className="mx-auto max-w-7xl" />
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
        <motion.div {...entrada} className="text-center">
          <House className="w-10 h-10 text-fg-subtle mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-h3 text-fg mb-2">
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
    return diaDelArriendo(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return diaDelArriendo(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = diaDelArriendo(endDate);
    const today = new Date();
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getLeaseProgress = (startDate: string, endDate: string) => {
    const start = diaDelArriendo(startDate);
    const end = diaDelArriendo(endDate);
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
  const contratoDelEstado = estadoDeCuenta?.contratos.find((c) => c.id === lease.contractId) ?? null;
  const amortizacion = contratoDelEstado ? amortizacionDe(contratoDelEstado) : null;
  const totalPaid = amortizacion?.pagadoCop ?? 0;
  // Qué bloque de renovación toca: cuando cambia (pidió renovar, avisó que
  // no renueva), el viejo sale y el nuevo entra.
  // D-19: el aviso puede vivir en el contrato (lo registró la inmobiliaria)
  // aunque no haya renovación abierta.
  const avisoNoRenovar = lease.avisoNoRenovar ?? lease.renovacion?.avisoNoRenovar ?? null;
  const claveDeRenovacion = avisoNoRenovar
    ? 'aviso'
    : lease.renovacion
      ? 'renovacion'
      : lease.status === 'ending_soon'
        ? 'termina'
        : null;

  // Account-status card: drive label / icon / color from the real period status
  // (paymentInfo.currentPeriodStatus) instead of always showing "Al día".
  // Reuses the brand success/warning/danger convention used elsewhere in this view.
  const lovencido = fraseDeLoVencido(resumenDeCuotas);
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
        // Con cuotas vencidas no se dice «Al día» (misma fuente que el estado de cuenta).
        if (lovencido) {
          return {
            label: locale === 'es' ? 'Con saldo vencido' : 'Overdue balance',
            icon: WarningCircle,
            cardClass: 'bg-danger-soft border border-danger/30',
            iconClass: 'text-danger',
            captionClass: 'text-danger',
          };
        }
        return {
          label: resumenDeCuotas
            ? (locale === 'es' ? 'Al día' : 'Up to date')
            : (locale === 'es' ? 'Pago del mes recibido' : 'This month received'),
          icon: CheckCircle,
          cardClass:
            'bg-success-soft border border-success/30',
          iconClass: 'text-success',
          captionClass: 'text-success',
        };
      default:
        // 'NONE' or unknown → no confirmed/in-flight payment for the period.
        if (lovencido) {
          return {
            label: locale === 'es' ? 'Con saldo vencido' : 'Overdue balance',
            icon: WarningCircle,
            cardClass: 'bg-danger-soft border border-danger/30',
            iconClass: 'text-danger',
            captionClass: 'text-danger',
          };
        }
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
  // El punto del estado de cuenta en la franja (el ícono en su caja se fue con el glow up de los portales).
  const tonoDelEstado: TonoDeCifra | undefined = accountStatus.iconClass.includes('danger')
    ? 'peligro'
    : accountStatus.iconClass.includes('warning')
      ? 'aviso'
      : accountStatus.iconClass.includes('success')
        ? 'exito'
        : undefined;

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
    } catch (err) {
      // 02-10-2026 · El motivo del back (o «fue nuestro» con la referencia), no un genérico.
      toast.error(locale === 'es' ? 'No se pudo aceptar la renovación' : 'Could not accept the renewal', {
        description: mensajeParaLaPersona(err, { accion: 'aceptar la renovación' }),
      });
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
    } catch (err) {
      toast.error(locale === 'es' ? 'No se pudo enviar la solicitud' : 'Could not send the request', {
        description: mensajeParaLaPersona(err, { accion: 'pedir la renovación' }),
      });
    } finally {
      setRequestingRenovacion(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="p-6 lg:p-8">

        {/* Back Button */}
        <div className="mb-6">
          <BackButton href="/inquilino/arriendo" label={locale === 'es' ? 'Volver a Mi arriendo' : 'Back to My rental'} />
        </div>

        {/* Hero Section - Property Card */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden mb-8">
          <div className="flex flex-col lg:flex-row">
            {/* Property Image */}
            {/* En el celular la foto más baja: lo del arriendo se ve sin bajar tanto. */}
            <div className="relative w-full lg:w-[400px] h-48 sm:h-64 lg:h-auto flex-shrink-0">
              {/* Sin foto, «Sin fotos» y no `<Image src={null}>`, que tumbaba la pantalla (QA 22-09). */}
              <PortadaDelInmueble
                property={{ thumbnailUrl: lease.propertyThumbnail }}
                alt={lease.propertyTitle}
                sizes="(max-width: 1024px) 100vw, 400px"
                priority
              />
            </div>

            {/* Property Info — glow up de los portales (22-10): el estado con su punto y su palabra, el título
                liviano como en el panel, la plata en mono sin negrilla y las etiquetas en DM Mono. */}
            <div className="flex-1 p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="min-w-0 space-y-2">
                  <StatusBadge tone={lease.status === 'ending_soon' ? 'warning' : 'success'} data-testid="estado-del-arriendo">
                    {lease.status === 'ending_soon'
                      ? (locale === 'es' ? 'Termina pronto' : 'Ending soon')
                      : (locale === 'es' ? 'Contrato activo' : 'Active contract')}
                  </StatusBadge>
                  <h1 className="text-h2 text-fg [text-wrap:balance]">
                    {/* QA 21-10: un inmueble sin título dejaba el h1 vacío; la dirección lo nombra. */}
                    {lease.propertyTitle || lease.propertyAddress}
                  </h1>
                  <p className="text-body-sm text-fg-muted flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {lease.propertyAddress}, {lease.propertyCity}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="font-mono text-h2 tabular-nums text-fg">
                    {formatCurrency(lease.monthlyRent + (lease.adminFee ?? 0))}
                  </p>
                  <p className="text-caption text-fg-muted">
                    {(lease.adminFee ?? 0) > 0
                      ? (locale === 'es' ? 'al mes, con la administración' : 'per month, with the HOA fee')
                      : (locale === 'es' ? 'al mes' : 'per month')}
                  </p>
                </div>
              </div>

              {/* Las cuatro cifras del arriendo: etiqueta en DM Mono, cifra en mono sin negrilla. */}
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5 py-5 border-y border-border-faint" data-testid="cifras-del-arriendo">
                <div className="min-w-0 space-y-1">
                  <dt><MonoLabel className="text-fg-subtle">{locale === 'es' ? 'Canon' : 'Rent'}</MonoLabel></dt>
                  <dd className="font-mono text-body tabular-nums text-fg">{formatCurrency(lease.monthlyRent)}</dd>
                </div>
                <div className="min-w-0 space-y-1">
                  <dt><MonoLabel className="text-fg-subtle">{locale === 'es' ? 'Administración' : 'HOA fee'}</MonoLabel></dt>
                  <dd className="font-mono text-body tabular-nums text-fg">{(lease.adminFee ?? 0) > 0 ? formatCurrency(lease.adminFee ?? 0) : '—'}</dd>
                </div>
                <div className="min-w-0 space-y-1">
                  <dt><MonoLabel className="text-fg-subtle">{locale === 'es' ? 'Día de pago' : 'Payment day'}</MonoLabel></dt>
                  <dd className="text-body text-fg">{diaDePagoLegible(lease.paymentDay) ?? (locale === 'es' ? 'Sin definir' : 'Not set')}</dd>
                </div>
                <div className="min-w-0 space-y-1">
                  <dt><MonoLabel className="text-fg-subtle">{locale === 'es' ? 'Te quedan' : 'Remaining'}</MonoLabel></dt>
                  <dd className="font-mono text-body tabular-nums text-fg">{daysRemaining.toLocaleString(locale === 'es' ? 'es-CO' : 'en-US')} {locale === 'es' ? (daysRemaining === 1 ? 'día' : 'días') : (daysRemaining === 1 ? 'day' : 'days')}</dd>
                </div>
              </dl>

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
                {/* La barra se llena con `transform` (translateX), no con
                    `width`/`left`: el ancho animado recalculaba el layout en
                    cada cuadro. Se revela desde 0 al llegar (`reveal`, curva de
                    entrar), igual que una cifra que cuenta. */}
                <div className="relative h-3 bg-surface-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: `${leaseProgress - 100}%` }}
                    transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
                    className={cn(
                      "h-full w-full rounded-full",
                      daysRemaining < 30 ? "bg-warning" : "bg-success"
                    )}
                  />
                  {/* Progress Indicator Dot — viaja en una capa del ancho de la
                      barra que se corre `leaseProgress`% de su propio ancho. */}
                  <motion.div
                    initial={{ x: '0%' }}
                    animate={{ x: `${leaseProgress}%` }}
                    transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
                    className="pointer-events-none absolute inset-0"
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-4 border-white",
                        daysRemaining < 30 ? "bg-warning" : "bg-success"
                      )} />
                    </div>
                  </motion.div>
                </div>
                <p className="text-caption text-fg-muted mt-2 text-center">
                  <span className="font-mono tabular-nums"><AnimatedNumber value={leaseProgress} from={0} format={(n) => String(Math.round(n))} /> %</span> {locale === 'es' ? 'del contrato ya pasó' : 'of the contract has gone by'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pay Rent CTA — visible cuando lease está activo y se puede pagar.
                GLOW UP (21-10-2026): es lo que más se viene a hacer; va primero,
                antes de la renovación. */}
            {/* La info del período llega en su propia consulta: si llega
                después del arriendo, la tarjeta entra; si ya estaba, no. */}
            <Presence
              show={Boolean(isActive && paymentInfo)}
              initial={false}
              className={cn(
                'rounded-lg border p-6 lg:p-8 transition-colors duration-base',
                periodStatus === 'PENDING_VALIDATION'
                  ? 'bg-warning-soft border-warning/30'
                  : periodStatus === 'APPROVED'
                    ? 'bg-success-soft border-success/30'
                    : 'bg-primary-soft border-primary/30'
              )}
            >
              {paymentInfo && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div>
                    {/* Pagar → «en verificación» → «confirmado»: la línea del
                        estado se cruza con la nueva. */}
                    <CrossFade swapKey={periodStatus ?? 'NONE'} className="flex items-center gap-2 mb-2">
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
                    </CrossFade>
                    <p className="font-mono text-h2 tabular-nums text-fg">
                      {formatCurrency(paymentInfo.monthlyRent)}
                    </p>
                    <p className="text-fg-muted mt-1 flex items-center gap-1.5 capitalize">
                      <Calendar className="w-4 h-4" />
                      {formatPeriod(paymentInfo.currentPeriod.month, paymentInfo.currentPeriod.year)}
                    </p>
                    {periodStatus === 'REJECTED' && paymentInfo.currentPeriodRejectionReason && (
                      <p className="text-caption text-danger mt-2 max-w-md">
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
                    >
                      <Wallet className="w-5 h-5" />
                      {periodStatus === 'REJECTED'
                        ? (locale === 'es' ? 'Reintentar' : 'Retry')
                        : (locale === 'es' ? 'Pagar arriendo' : 'Pay rent')}
                    </Button>
                  )}
                </div>
              )}
            </Presence>


            {/* Renewal — request / awaiting proposal / accept, or ending-soon prompt.

                🔴 Con un aviso de no renovación ya dado, TODO este bloque se
                cambia por el aviso: ofrecer «Aceptar renovación» al lado de
                «avisaste que no vas a renovar» son dos pantallas distintas
                peleando en el mismo lugar. */}
            {claveDeRenovacion && (
            // Pedir la renovación o avisar que no cambia el bloque entero:
            // el viejo sale y el nuevo entra (CrossFade), no un salto seco.
            <CrossFade swapKey={claveDeRenovacion}>
            {avisoNoRenovar ? (
              <NoVoyARenovar lease={lease} onCambio={refetchLease} />
            ) : lease.renovacion ? (
              <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-6 lg:p-8">
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
                    <p className="font-mono text-h2 tabular-nums text-fg">
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
              </div>
            ) : lease.status === 'ending_soon' ? (
              <div className="rounded-lg border border-warning/30 bg-warning-soft p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-body font-medium text-fg">
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
              </div>
            ) : null}
            </CrossFade>
            )}

            {/* La otra mitad de la decisión. Va debajo y en voz baja —una línea,
                sin tarjeta— porque no es lo que la mayoría viene a hacer; pero
                tiene que estar SIEMPRE que haya contrato vivo, no sólo cuando
                está por vencer: avisar con cinco meses es justo lo que la ley
                premia, y esconderlo hasta el último mes empuja a avisar tarde. */}
            {isActive && !avisoNoRenovar ? (
              <NoVoyARenovar lease={lease} onCambio={refetchLease} />
            ) : null}


            {/* Las tres cifras del arriendo en la franja de Cadence (glow up de los portales, 22-10): cuentan cuando
                cambian (un pago aprobado), sin cajas de ícono; el estado de cuenta lleva su punto. */}
            <FranjaDeCifras fila="lg" aria-label={locale === 'es' ? 'Cómo vas con tu arriendo' : 'How your rental is going'} data-testid="resumen-del-arriendo">
              <Cifra
                etiqueta={locale === 'es' ? 'Total pagado' : 'Total paid'}
                valor={totalPaid}
                format={plataQueLlega(totalPaid, formatCurrency)}
              />
              <Cifra
                etiqueta={locale === 'es' ? 'Cuotas pagadas' : 'Installments paid'}
                valor={amortizacion ? `${amortizacion.pagadas} ${locale === 'es' ? 'de' : 'of'} ${amortizacion.total}` : 0}
              />
              <Cifra
                etiqueta={locale === 'es' ? 'Estado de cuenta' : 'Account status'}
                valor={accountStatus.label}
                tono={tonoDelEstado}
                detalle={lovencido ?? undefined}
              />
            </FranjaDeCifras>

            {/* Payment History */}
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 px-6 py-4 border-b border-border-faint">
                <h2 className="text-h3 text-fg">{locale === 'es' ? 'Historial de pagos' : 'Payment history'}</h2>
                <p className="text-body-sm text-fg-muted">
                  <span className="font-mono tabular-nums"><AnimatedNumber value={requests.length} /></span>{' '}
                  {locale === 'es' ? (requests.length === 1 ? 'pago' : 'pagos') : (requests.length === 1 ? 'payment' : 'payments')}
                </p>
              </div>

              {/* Vacío → primer pago: se cruzan. Lo que ya estaba al llegar no se
                  anima (lo trae la entrada del contenido); un pago nuevo entra y
                  los demás se corren. */}
              <CrossFade swapKey={requests.length > 0 ? 'lista' : 'vacio'}>
              {requests.length > 0 ? (
                <div className="relative divide-y divide-border">
                  <AnimatePresence initial={false} mode="popLayout">
                  {requests.map((request) => {
                    const statusInfo = getRequestStatusInfo(request.status);
                    // QA-INQ-95: la misma regla que «Pagos» (rechazado/cancelado no «vencen»).
                    const dateText = fechaDeLaSolicitud(request, locale, formatDate);

                    return (
                      <StaggerItem
                        key={request.id}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-surface-muted transition-colors"
                      >
                        {/* Glow up de los portales (22-10): sin el ícono en su caja de color; el estado con su
                            punto y su palabra (StatusBadge), la plata en mono sin negrilla. */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-fg">
                              {locale === 'es' ? 'Arriendo' : 'Rent'} · <span className="capitalize">{formatPeriod(request.periodMonth, request.periodYear)}</span>
                            </p>
                            <StatusBadge tone={TONO_DEL_PAGO[statusInfo.textColor] ?? 'neutral'}>
                              {statusInfo.label}
                            </StatusBadge>
                          </div>
                          <p className="text-sm text-fg-muted">
                            {dateText}
                            {request.bankName && <> · {request.bankName}</>}
                          </p>
                          {request.referenceNumber && (
                            <p className="text-caption text-fg-subtle mt-1">Ref. <span className="font-mono">{request.referenceNumber}</span></p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-caption text-danger mt-1">
                              {request.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-mono text-body tabular-nums text-fg">
                            {formatCurrency(request.amount)}
                          </p>
                        </div>
                      </StaggerItem>
                    );
                  })}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title={locale === 'es' ? 'Todavía no hay pagos' : 'No payments yet'}
                  description={
                    locale === 'es'
                      ? 'Cuando pagues el arriendo, cada pago aparece aquí con su estado.'
                      : 'When you pay the rent, each payment shows up here with its status.'
                  }
                />
              )}
              </CrossFade>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Contract Info Card */}
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border-faint">
                <h2 className="text-h3 text-fg">{locale === 'es' ? 'Contrato' : 'Contract'}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Vigencia' : 'Term'}</MonoLabel>
                  <p className="text-sm text-fg font-medium">
                    {formatFullDate(lease.startDate)} — {formatFullDate(lease.endDate)}
                  </p>
                </div>
                {/* QA 21-10: el back todavía no manda la garantía en el arriendo; sin dato, el
                    bloque mostraba la etiqueta y un escudo solos. */}
                {lease.guaranteeType ? (
                <div data-testid="garantia-del-arriendo">
                  <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Garantía' : 'Guarantee'}</MonoLabel>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-success" />
                    <p className="text-sm text-fg font-medium">
                      {lease.guaranteeType === 'poliza' ? (locale === 'es' ? 'Póliza de arriendo' : 'Rental insurance') :
                       lease.guaranteeType === 'codeudor' ? (locale === 'es' ? 'Codeudor' : 'Co-signer') :
                       lease.guaranteeType}
                    </p>
                  </div>
                  {lease.guaranteeDetails ? <p className="text-caption text-fg-muted mt-1 ml-6">{lease.guaranteeDetails}</p> : null}
                </div>
                ) : null}

                {/* Documents */}
                <div className="pt-4 border-t border-border-faint space-y-2">
                  <MonoLabel className="mb-3 block text-fg-subtle">{t('documents.title')}</MonoLabel>

                  {lease.contractUrl && (
                    <a
                      href={lease.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg hover:bg-surface-hover transition-colors group"
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
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg hover:bg-surface-hover transition-colors group"
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
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg hover:bg-surface-hover transition-colors group"
                    >
                      <Buildings className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg flex-1">{locale === 'es' ? 'Inventario' : 'Inventory'}</span>
                      <Download className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors" />
                    </a>
                  )}

                  {/* QA 21-10: sin ningún enlace aquí, el bloque quedaba con la etiqueta sola.
                      Los documentos del contrato viven en «Contrato y documentos». */}
                  {!lease.contractUrl && !lease.insuranceUrl && !lease.inventoryUrl ? (
                    <Link
                      href="/inquilino/contratos"
                      className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg hover:bg-surface-hover transition-colors"
                      data-testid="ver-contrato-y-documentos"
                    >
                      <FileText className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg flex-1">
                        {locale === 'es' ? 'Ver tu contrato y documentos' : 'See your contract and documents'}
                      </span>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Landlord Contact Card */}
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border-faint">
                {/* QA 21-10: en un contrato de inmobiliaria esta persona es de la inmobiliaria, no el
                    dueño; el arriendo no dice cuál es, así que el título vale para los dos. */}
                <h2 className="text-h3 text-fg">{locale === 'es' ? 'Quién administra tu arriendo' : 'Who manages your rental'}</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-5">
                  {/* Cadence 2: el Avatar del sistema, nunca iniciales a mano. */}
                  <Avatar name={lease.landlordName || 'Propietario'} size="lg" />
                  <div>
                    <p className="font-medium text-fg">{lease.landlordName || (locale === 'es' ? 'Sin nombre registrado' : 'No name on file')}</p>
                    {/* Antes: «Propietario verificado», una verificación que nadie hace. */}
                    <p className="text-sm text-fg-muted">{locale === 'es' ? 'Escríbele por Mensajes' : 'Write to them in Messages'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {/* QA 21-10: sin teléfono (o sin correo) la fila quedaba vacía, con su ícono solo. */}
                  {lease.landlordEmail ? (
                    <a
                      href={`mailto:${lease.landlordEmail}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:text-fg bg-surface-muted rounded-lg hover:bg-surface-hover transition-colors"
                      data-testid="contacto-correo"
                    >
                      <Envelope className="w-4 h-4 text-fg-subtle" />
                      {lease.landlordEmail}
                    </a>
                  ) : null}
                  {lease.landlordPhone ? (
                    <a
                      href={`tel:${lease.landlordPhone}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-fg-muted hover:text-fg bg-surface-muted rounded-lg hover:bg-surface-hover transition-colors"
                      data-testid="contacto-telefono"
                    >
                      <Phone className="w-4 h-4 text-fg-subtle" />
                      {lease.landlordPhone}
                    </a>
                  ) : null}
                </div>

                {/* Una sola acción azul por pantalla (pagar el arriendo): escribir va en secundaria y sin flecha. */}
                <Button asChild variant="secondary" hideArrow className="w-full">
                  <Link href="/inquilino/mensajes">
                    <Chat className="w-4 h-4" />
                    {locale === 'es' ? 'Escribirle un mensaje' : 'Send a message'}
                  </Link>
                </Button>
              </div>
            </div>

            {/* Payment Methods Card */}
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border-faint">
                <h2 className="text-h3 text-fg">{locale === 'es' ? 'Métodos de pago' : 'Payment methods'}</h2>
              </div>
              <div className="p-4 space-y-2">
                {PAYMENT_METHODS.filter(m => m.enabled).slice(0, 4).map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg"
                  >
                    {/* Íconos de la familia, no emojis (glow up de los portales, 22-10). */}
                    {(() => {
                      const Icono = ICONO_DEL_MEDIO[method.id] ?? CreditCard;
                      return <Icono className="w-5 h-5 shrink-0 text-fg-muted" aria-hidden="true" />;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg">{method.name}</p>
                      <p className="text-caption text-fg-muted">{method.processingTime}</p>
                    </div>
                    {method.fee && method.fee > 0 ? (
                      <span className="font-mono text-caption tabular-nums text-fg-muted">+{method.fee} %</span>
                    ) : (
                      <StatusBadge tone="success">{locale === 'es' ? 'Gratis' : 'Free'}</StatusBadge>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </motion.div>

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
