'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedNumber, Banner, CrossFade, Presence, StaggerItem, StatusBadge } from '@leasefy/cadence';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
// I1 (auditoría 13-09): el toast sale del design system, no de `sonner` pelado.
// Importarlo directo del paquete se salta el `<Toaster>` configurado de la casa
// (posición, duración, estilos) y produce un aviso que no se parece a los demás
// del producto — o que no se ve, si el proveedor montado es el del DS.
import { toast } from '@/components/ui/toast';
import { Check, Clock, CreditCard, CurrencyCircleDollar, Prohibit, XCircle, Download } from '@phosphor-icons/react';

import { useLeases, useMyPaymentRequests, useLeasePaymentInfo } from '@/lib/hooks/useLeases';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { SinArriendoTodavia } from '@/components/tenant/SinArriendoTodavia';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { Progress } from '@/components/ui/progress';
import { PayRentModal } from '@/components/tenant/PayRentModal';
import { MediosDePagoDeLaInmobiliaria } from '@/components/tenant/MediosDePagoDeLaInmobiliaria';
import { AutopagoSection } from '@/components/tenant/AutopagoSection';
import { tenantPaymentRequestsApi } from '@/lib/api/tenant-payment-requests.service';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { fechaLegible, hoyLocal } from '@/components/estado-de-cuenta/filas';
import { fraseDeLoVencido } from '@/lib/estado-de-cuenta/estado-general-del-portal';
import { diasHastaElDiaDePago, resumenDePagos, type ResumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';
import type {
  BackendTenantPaymentRequest,
  TenantPaymentRequestStatus,
} from '@/lib/api/tenant-payment-requests.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { avisarDelPagoAlVolver, transaccionDelRetorno } from '@/lib/payments/verificar-pago-al-volver';
import { PagarLoVencido } from '@/components/tenant/PagarLoVencido';
import { amortizacionDe } from '@/components/estado-de-cuenta/resumen';
import { pagoEnLineaApi, type LoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';
import { fechaDeLaSolicitud } from '@/lib/pagos/fecha-de-la-solicitud';

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
/** El tono del StatusBadge de un pago, desde el color que ya decide `getStatusConfig`. */
function tonoDelEstadoDelPago(color: string): 'success' | 'warning' | 'critical' | 'neutral' {
  if (color.includes('success')) return 'success';
  if (color.includes('warning')) return 'warning';
  if (color.includes('danger')) return 'critical';
  return 'neutral';
}

export default function PagosPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-bg">
          {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
          <EsqueletoDePagina variante="list" />
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
  // Revisora r27 (regla de Nico: toda lista con buscador y filtro): el historial se busca y se filtra por estado.
  const [busquedaPagos, setBusquedaPagos] = useState('');
  const [estadoPagos, setEstadoPagos] = useState<'todos' | 'aprobados' | 'en-revision' | 'rechazados'>('todos');

  /*
   * 🔴 Las tarjetas de arriba salen del ESTADO DE CUENTA, no de las solicitudes
   * de pago (QA 22-09 P0: «Pendiente $0» a quien debía $50 M vencidos). Es la
   * misma fuente de «Mi estado de cuenta», así que las dos pantallas dicen lo
   * mismo. Si no llega, se dice —no se pinta un cero—.
   */
  const [resumen, setResumen] = useState<ResumenDePagos | null>(null);
  /** Revisora r25: la barra de la cifra, «pagado $ X de $ Y del contrato» (la misma cuenta del estado de cuenta). */
  const [avance, setAvance] = useState<{ pagado: number; pactado: number } | null>(null);
  const [errorResumen, setErrorResumen] = useState<unknown>(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const cargarResumen = () => {
    setCargandoResumen(true);
    setErrorResumen(null);
    estadoDeCuentaApi
      .mio()
      .then((doc) => {
        setResumen(resumenDePagos(doc, hoyLocal()));
        const amortizaciones = (doc.contratos ?? []).map(amortizacionDe);
        setAvance({
          pagado: amortizaciones.reduce((s, a) => s + a.cubiertoCop, 0),
          pactado: amortizaciones.reduce((s, a) => s + a.pactadoCop, 0),
        });
      })
      .catch((e: unknown) => setErrorResumen(e))
      .finally(() => setCargandoResumen(false));
  };
  const hayArriendo = Boolean(primaryLease);
  /*
   * 🔴 «Pagar lo vencido» (PAGO-ONLINE, Nico 04-10-2026): las cuotas que se
   * pueden pagar en línea salen del back (la misma cartera del recibo de caja).
   * Con estado de cuenta (`aplica`), esto reemplaza el «Pagar ahora» del canon
   * del mes: la plata va siempre a la cuota más vieja. Sin él, lo de siempre.
   */
  const [pagoEnLinea, setPagoEnLinea] = useState<LoQueSePuedePagar | null>(null);
  const leaseIdPrincipal = primaryLease?.id ?? null;
  const cargarPagoEnLinea = () => {
    if (!leaseIdPrincipal) return;
    pagoEnLineaApi
      .loQueSePuedePagar(leaseIdPrincipal)
      .then(setPagoEnLinea)
      // Sin respuesta (o un back anterior sin la ruta): lo de siempre, el canon del mes.
      .catch(() => setPagoEnLinea({ aplica: false, cuotas: [], totalVencidoCop: 0, enVerificacion: null, ultimoRechazo: null }));
  };
  useEffect(() => {
    /*
     * 🔴 N-21 (QA-PAGOS-95): el resumen sale del ESTADO DE CUENTA (el contrato),
     * no del arriendo del portal. Un contrato migrado o invitado después no
     * tiene arriendo y la pantalla decía «Sin pagos por ahora» a quien debía
     * $6.300.000 vencidos. El resumen se pide siempre; el pago en línea, que sí
     * va por el arriendo, sólo con arriendo.
     */
    cargarResumen();
    if (hayArriendo) cargarPagoEnLinea();
  }, [hayArriendo, leaseIdPrincipal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enriquecer requests con title de la propiedad (request.lease solo trae address+city)
  const leaseMap = new Map(activeLeases.map(l => [l.id, l]));
  const allRequests: RequestRow[] = rawRequests
    .filter(r => leaseMap.has(r.leaseId))
    .map(r => ({
      ...r,
      propertyTitle: leaseMap.get(r.leaseId)?.propertyTitle ?? `${r.lease.propertyAddress}, ${r.lease.propertyCity}`,
    }));


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

  const grupoDelPago = (st: TenantPaymentRequestStatus): 'aprobados' | 'en-revision' | 'rechazados' =>
    st === 'APPROVED' ? 'aprobados' : st === 'REJECTED' || st === 'DISPUTED' ? 'rechazados' : 'en-revision';
  const cuentaDelGrupo = (g: 'aprobados' | 'en-revision' | 'rechazados') => allRequests.filter((r) => grupoDelPago(r.status) === g).length;
  const qPagos = busquedaPagos.trim().toLowerCase();
  const pagosVisibles = allRequests.filter((r) => {
    if (estadoPagos !== 'todos' && grupoDelPago(r.status) !== estadoPagos) return false;
    if (!qPagos) return true;
    const periodo = r.periodMonth && r.periodYear ? formatPeriod(r.periodMonth, r.periodYear) : '';
    return [periodo, r.propertyTitle, r.referenceNumber, r.bankName, String(r.periodYear ?? '')]
      .some((v) => String(v ?? '').toLowerCase().includes(qPagos));
  });

  // Pagination
  const totalPages = Math.ceil(pagosVisibles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRequests = pagosVisibles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
    cargarPagoEnLinea();
  };

  // Retorno de Wompi: verificar al volver (Nico, 02-10-2026, «seguimiento 4»).
  // Wompi vuelve con `?id=<transacción>` (un parámetro del navegador: NUNCA es la
  // fuente de verdad). El back consulta ESA transacción en Wompi y la pasa por el
  // mismo camino que el webhook (idempotente): un pago cuyo webhook nunca llegó
  // queda registrado igual. Lo que se dice es lo que respondió el back; después se
  // recargan las solicitudes y el período (que queda «en verificación» mientras
  // Wompi no termine) y se limpia la URL para que recargar no repita el aviso.
  const verificacionHecha = useRef(false);
  // QA-INQ-95: recargar con las funciones de AHORA. El efecto corre al montar,
  // cuando el arriendo todavía no llegó: su `cargarPagoEnLinea` no tenía
  // arriendo y no recargaba nada. Tras pagar, «Pagar lo vencido» seguía
  // diciendo «en verificación» y ofrecía pagar otra vez la cuota ya pagada.
  const recargarTrasVolver = useRef<() => void>(() => {});
  recargarTrasVolver.current = () => {
    refetchRequests();
    refetchPaymentInfo();
    cargarResumen();
    cargarPagoEnLinea();
  };
  useEffect(() => {
    const transaccion = transaccionDelRetorno(searchParams);
    if (!transaccion || verificacionHecha.current) return;
    verificacionHecha.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    void avisarDelPagoAlVolver({
      transaccion,
      locale,
      aviso: toast,
      recargar: () => recargarTrasVolver.current(),
    });
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
      if (!response.ok) throw { status: response.status };
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `comprobante-${request.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      // 02-10-2026 · «conexión» sólo si no hubo respuesta; si no, por qué.
      toast.error(
        mensajeParaLaPersona(err, {
          accion: 'descargar el comprobante',
          porDefecto:
            locale === 'es'
              ? 'No pudimos descargar el comprobante interno.'
              : 'We could not download the internal receipt.',
        }),
      );
    } finally {
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
    }
  };

  // El recibo en PDF de un pago confirmado (PAGO-ONLINE): sale de los recibos
  // de caja que de verdad se emitieron con ese pago.
  const descargarRecibo = async (request: RequestRow) => {
    let blobUrl: string | null = null;
    try {
      const blob = await pagoEnLineaApi.recibo(request.id);
      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `recibo-${request.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      toast.error(mensajeParaLaPersona(err, { accion: 'descargar el recibo', porDefecto: 'No pudimos descargar el recibo.' }));
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
        // PSE pendiente: «En verificación» hasta que Wompi confirme (PAGO-ONLINE).
        return {
          label: locale === 'es' ? 'En verificación' : 'In verification',
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

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading || leasesLoading || requestsLoading);

  // Loading state
  if (isOnboardingLoading || leasesLoading || requestsLoading) {
    return (
      <div className="bg-bg">
        <EsqueletoDePagina variante="list" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="bg-bg">
        <div className="p-6 lg:p-8">
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
      <div className="bg-bg">
        <div className="p-6 lg:p-8">
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
  /** Tiene un contrato con cuotas aunque no tenga arriendo del portal (N-21). */
  const puedePagarEnLinea = Boolean(primaryLease && pagoEnLinea?.aplica && pagoEnLinea.cuotas.length > 0);
  const conContrato = resumen !== null && (resumen.restaPorPagar > 0 || resumen.proxima !== null);
  if (!primaryLease && (errorResumen || !cargandoResumen) && !conContrato) {
    return (
      <div className="bg-bg">
        <motion.div {...entrada} className="p-6 lg:p-8">
          <EncabezadoDePantalla
            className="mb-8"
            seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
            titulo={t('payments.title')}
            // Revisora r25: la misma descripción con y sin contrato (antes «Gestiona tus pagos de arriendo»).
            descripcion={
              locale === 'es'
                ? 'Cuánto debes y cuándo vence, cómo pagarlo y lo que ya pagaste.'
                : 'What you owe and when it is due, how to pay it and what you have already paid.'
            }
          />

          <div>
            {/* Revisora r27 (CA): el mismo vacío en las pestañas de «Mi arriendo». */}
            <SinArriendoTodavia
              queVaAqui="Aquí ves cuánto debes, cuándo vence y cómo pagarlo."
              whatGoesHere="Here you see what you owe, when it is due and how to pay it."
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-bg">
      <motion.div {...entrada} className="p-6 lg:p-8">

        {/* GLOW UP (21-10): el encabezado de todas las pantallas, con el trabajo de esta: pagar y ver lo pagado. */}
        <EncabezadoDePantalla
          className="mb-6"
          seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
          titulo={t('payments.title')}
          descripcion={
            locale === 'es'
              ? 'Cuánto debes y cuándo vence, cómo pagarlo y lo que ya pagaste.'
              : 'What you owe and when it is due, how to pay it and what you have already paid.'
          }
          // Revisora r27: sin «Ver mi estado de cuenta» (es la pestaña de al lado en el riel de «Mi arriendo»).
        />

        {/* N-21 (QA-PAGOS-95): con contrato y sin arriendo del portal, la deuda se
            ve igual, pero el pago en línea todavía no: se dice y se ofrece cómo pagar. */}
        {!primaryLease && conContrato && (
          <div className="mb-6 lg:max-w-2xl">
            <Banner variant="info" title="El pago en línea todavía no está disponible para tu contrato" data-testid="sin-pago-en-linea">
              Puedes pagar con los medios de tu inmobiliaria que ves en «Cómo pagar»: ella registra el recibo y
              lo ves en tu{' '}
              <Link href="/inquilino/estado-de-cuenta" className="underline">
                estado de cuenta
              </Link>
              .
            </Banner>
          </div>
        )}

        {/* Resumen — del estado de cuenta, el mismo documento de «Mi estado de cuenta».
            Llega en su propia consulta: el cargando se cruza con las cifras, que
            cuentan desde 0 al llegar (como `KpiValor`) y desde la anterior si cambian. */}
        <CrossFade
          swapKey={errorResumen ? 'fallo' : cargandoResumen || !resumen ? 'cargando' : 'listo'}
          className="mb-8"
        >
          {errorResumen ? (
            <FalloDeCarga error={errorResumen} queEs="lo que debes" onReintentar={cargarResumen} />
          ) : cargandoResumen || !resumen ? (
            /* Esqueleto con la forma de la cifra (antes, un spinner en una caja gris). */
            <div className="space-y-3 rounded-lg border border-border bg-surface p-6" aria-busy="true" data-testid="cifras-de-pagos-cargando">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-3.5 w-72 max-w-full" />
            </div>
          ) : (
            /* GLOW UP (22-10): LA RESPUESTA en grande —lo vencido si hay, si no la próxima cuota— y lo demás
               en una línea al pie (antes, tres cifras del mismo peso en una franja: «Resta por pagar hasta el
               fin del contrato» pesaba lo mismo que lo que vence esta semana). Las mismas cifras y testids. */
            <section className="rounded-lg border border-border bg-surface p-6" data-testid="cifras-de-pagos">
              <CifraHeroe
                rotulo={
                  resumen.vencidoCop > 0
                    ? locale === 'es'
                      ? 'Tienes vencido'
                      : 'Overdue'
                    : resumen.proxima
                      ? locale === 'es'
                        ? 'Tu próxima cuota'
                        : 'Your next installment'
                      : locale === 'es'
                        ? 'Lo que debes'
                        : 'What you owe'
                }
                cifra={
                  resumen.vencidoCop > 0 ? (
                    <span data-testid="cifra-vencido">
                      {formatCurrencyI18n(resumen.vencidoCop)}
                    </span>
                  ) : resumen.proxima ? (
                    <span data-testid="cifra-proxima-cuota">
                      {formatCurrencyI18n(resumen.proxima.valor)}
                    </span>
                  ) : (
                    formatCurrencyI18n(0)
                  )
                }
                contexto={
                  resumen.vencidoCop > 0
                    ? locale === 'es'
                      ? `en ${resumen.cuotasVencidas} ${resumen.cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}`
                      : `in ${resumen.cuotasVencidas} overdue`
                    : resumen.proxima
                      ? resumen.proxima.diasQueFaltan === 0
                        ? t('dashboard.dueToday')
                        : `${locale === 'es' ? 'vence el' : 'due'} ${fechaLegible(resumen.proxima.fecha)}`
                      : locale === 'es'
                        ? 'Estás al día y no quedan cuotas por vencer'
                        : 'You are up to date with no upcoming installments'
                }
                /* Revisora r25: la barra dice cuánto del contrato va pagado, cuánto está vencido y
                   cuánto falta por vencer. Los montos se dicen una vez, en el pie. */
                tramos={
                  avance && avance.pactado > 0
                    ? [
                        { clave: 'pagado', etiqueta: locale === 'es' ? 'Pagado' : 'Paid', monto: avance.pagado, tono: 'exito' },
                        { clave: 'vencido', etiqueta: locale === 'es' ? 'Vencido' : 'Overdue', monto: resumen.vencidoCop, tono: 'critico' },
                        {
                          clave: 'por-vencer',
                          etiqueta: locale === 'es' ? 'Por vencer' : 'Not yet due',
                          monto: Math.max(0, resumen.restaPorPagar - resumen.vencidoCop),
                          tono: 'neutro',
                        },
                      ]
                    : undefined
                }
                pie={
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    {avance && avance.pactado > 0 && (
                      <span data-testid="cifra-pagado-del-contrato">
                        {locale === 'es' ? 'Pagado' : 'Paid'}{' '}
                        <span className="font-mono tabular-nums text-fg">{formatCurrencyI18n(avance.pagado)}</span>{' '}
                        {locale === 'es' ? 'de' : 'of'}{' '}
                        <span className="font-mono tabular-nums text-fg">{formatCurrencyI18n(avance.pactado)}</span>{' '}
                        {locale === 'es' ? 'del contrato' : 'of the contract'}
                      </span>
                    )}
                    {resumen.vencidoCop > 0 && resumen.proxima && (
                      <span data-testid="cifra-proxima-cuota">
                        {locale === 'es' ? 'Próxima cuota' : 'Next installment'}{' '}
                        <span className="font-mono tabular-nums text-fg">
                          {formatCurrencyI18n(resumen.proxima.valor)}
                        </span>{' '}
                        {locale === 'es' ? 'el' : 'on'} {fechaLegible(resumen.proxima.fecha)}
                      </span>
                    )}
                    {resumen.vencidoCop === 0 && resumen.proxima && (
                      <span data-testid="cifra-vencido">{locale === 'es' ? 'Estás al día' : 'You are up to date'}</span>
                    )}
                    {/* Revisora r27 (§3): con «Pagado $ X de $ Y» a la vista, lo que resta es Y − X y la barra ya lo
                        pinta: se dice sólo cuando no hay ese avance. */}
                    {!(avance && avance.pactado > 0) && (
                      <span data-testid="cifra-resta-por-pagar">
                        {locale === 'es' ? 'Resta por pagar hasta el fin del contrato' : 'Remaining until the end of the contract'}{' '}
                        <span className="font-mono tabular-nums text-fg">
                          {formatCurrencyI18n(resumen.restaPorPagar)}
                        </span>
                      </span>
                    )}
                  </span>
                }
              />
              {/* Revisora r25: el botón «Pagar $ X» DENTRO de la respuesta, no en otro bloque debajo. */}
              {puedePagarEnLinea && primaryLease && pagoEnLinea && (
                <div className="mt-6 border-t border-border pt-6 lg:max-w-2xl">
                  <PagarLoVencido
                    key={pagoEnLinea.cuotas.map((c) => c.id).join()}
                    leaseId={primaryLease.id}
                    datos={pagoEnLinea}
                    dentroDeLaCifra
                  />
                </div>
              )}
            </section>
          )}
        </CrossFade>

        {/* «Pagar lo vencido» (PAGO-ONLINE) suelto sólo si la cifra no está (cargando o sin llegar). */}
        {puedePagarEnLinea && primaryLease && pagoEnLinea && (errorResumen || cargandoResumen || !resumen) && (
          <div className="mb-8 lg:max-w-2xl">
            <PagarLoVencido key={pagoEnLinea.cuotas.map((c) => c.id).join()} leaseId={primaryLease.id} datos={pagoEnLinea} />
          </div>
        )}

        {/* Cómo pagar: los medios que configuró la inmobiliaria (no se pinta si no hay) */}
        <MediosDePagoDeLaInmobiliaria />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Payment History */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 text-fg">{t('payments.history')}</h2>
              <span className="text-sm text-fg-muted"><span className="font-mono tabular-nums"><AnimatedNumber value={allRequests.length} /></span> {t('nav.payments').toLowerCase()}</span>
            </div>

            {/* Vacío → primer pago y cambiar de página se cruzan; un pago nuevo
                entra a la lista y los demás se corren (lo que ya estaba no se anima). */}
            {allRequests.length > 5 ? (
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" data-testid="historial-filtros">
                <PestanasDeEstado<'todos' | 'aprobados' | 'en-revision' | 'rechazados'>
                  pestanas={[
                    { valor: 'todos', etiqueta: locale === 'es' ? 'Todos' : 'All', cuantos: allRequests.length, fija: true },
                    { valor: 'aprobados', etiqueta: locale === 'es' ? 'Aprobados' : 'Approved', cuantos: cuentaDelGrupo('aprobados') },
                    { valor: 'en-revision', etiqueta: locale === 'es' ? 'En revisión' : 'In review', cuantos: cuentaDelGrupo('en-revision'), tono: 'aviso' },
                    { valor: 'rechazados', etiqueta: locale === 'es' ? 'Rechazados' : 'Rejected', cuantos: cuentaDelGrupo('rechazados') },
                  ]}
                  valor={estadoPagos}
                  onCambio={(v) => { setEstadoPagos(v); setCurrentPage(1); }}
                  etiqueta={locale === 'es' ? 'Filtrar los pagos por estado' : 'Filter payments by status'}
                />
                <Input
                  type="search"
                  value={busquedaPagos}
                  onChange={(e) => { setBusquedaPagos(e.target.value); setCurrentPage(1); }}
                  placeholder={locale === 'es' ? 'Buscar mes, año o referencia' : 'Search month, year or reference'}
                  aria-label={locale === 'es' ? 'Buscar en tus pagos' : 'Search your payments'}
                  className="md:w-64"
                  data-testid="historial-buscar"
                />
              </div>
            ) : null}
            <CrossFade swapKey={allRequests.length > 0 ? (pagosVisibles.length > 0 ? `pagina-${currentPage}` : 'sin-resultados') : 'vacio'}>
            {allRequests.length > 0 && pagosVisibles.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center" data-testid="historial-sin-resultados">
                <p className="text-body-sm font-medium text-fg">{locale === 'es' ? 'Ningún pago con ese filtro' : 'No payments match that filter'}</p>
                <p className="mt-1 text-caption text-fg-muted">{locale === 'es' ? 'Cambia la pestaña o borra la búsqueda.' : 'Change the tab or clear the search.'}</p>
              </div>
            ) : allRequests.length > 0 ? (
              <>
                <div className="relative space-y-3">
                  <AnimatePresence initial={false} mode="popLayout">
                  {paginatedRequests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);

                    // QA-INQ-95: un rechazado dice cuándo lo rechazaron (antes, «Vence …»).
                    const dateLabel = fechaDeLaSolicitud(request, locale, formatShortDate);

                    return (
                      <StaggerItem
                        key={request.id}
                        className="group rounded-lg border border-border bg-surface hover:border-border-strong transition-colors duration-slow overflow-hidden"
                      >
                        {/* Glow up de los portales (22-10): sin el ícono en su caja de color; el estado con su punto
                            y su palabra (StatusBadge) y la plata en mono sin negrilla. */}
                        <div className="flex items-center gap-4 p-4">

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-medium text-fg">
                                  {request.referenceNumber?.startsWith('vencido-')
                                    ? (locale === 'es' ? 'Pago de lo vencido' : 'Overdue payment')
                                    : <>{locale === 'es' ? 'Arriendo' : 'Rent'} · <span className="capitalize">{formatPeriod(request.periodMonth, request.periodYear)}</span></>}
                                </h3>
                                <p className="text-sm text-fg-muted truncate">
                                  {request.propertyTitle}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-mono text-body tabular-nums text-fg">
                                  {formatCurrencyI18n(request.amount)}
                                </p>
                                <StatusBadge tone={tonoDelEstadoDelPago(statusConfig.color)} className="mt-1">
                                  {statusConfig.label}
                                </StatusBadge>
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
                                {request.status === 'APPROVED' && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => descargarRecibo(request)}
                                    className="h-auto gap-1 p-0"
                                    data-testid={`recibo-${request.id}`}
                                  >
                                    <Download className="w-4 h-4" />
                                    {locale === 'es' ? 'Recibo PDF' : 'PDF receipt'}
                                  </Button>
                                )}
                                {(request.status === 'REJECTED' || request.status === 'DISPUTED') && !pagoEnLinea?.aplica && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={handlePayNow}
                                    className="h-auto gap-1 p-0"
                                  >
                                    {locale === 'es' ? 'Reintentar' : 'Retry'}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {request.rejectionReason && (
                              <p className="text-caption text-danger mt-2">
                                {request.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                  </AnimatePresence>
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
                <p className="mt-4 text-caption text-fg-muted">
                  {locale === 'es'
                    ? 'El recibo de caja es el soporte de tu pago. Si tu inmobiliaria te emite factura electrónica, te llega a tu correo.'
                    : 'The cash receipt is the proof of your payment. If your agency issues you an electronic invoice, it arrives by email.'}
                </p>
              </>
            ) : (
              <EmptyState
                icon={CurrencyCircleDollar}
                ilustracion="monedas"
                title={locale === 'es' ? 'No hay historial de pagos' : 'No payment history'}
                description={locale === 'es'
                  ? 'Cuando realices pagos de arriendo, aparecerán aquí para tu seguimiento.'
                  : 'When you make rental payments, they will appear here for your tracking.'}
                action={{ label: locale === 'es' ? 'Ver arriendo' : 'View rental', href: '/inquilino/arriendo' }}
              />
            )}
            </CrossFade>
          </div>

          {/* Sidebar — only with active lease */}
          <div className="space-y-6">
            {/* Period Status Card — depende de currentPeriodStatus. Llega en su
                propia consulta: si llega después, entra; si ya estaba, no. */}
            <Presence show={Boolean(paymentInfo) && pagoEnLinea !== null && !pagoEnLinea.aplica} initial={false}>
            {primaryLease && paymentInfo && pagoEnLinea !== null && !pagoEnLinea.aplica && (
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
                vencido={fraseDeLoVencido(resumen)}
                locale={locale}
                t={t}
                formatCurrency={formatCurrencyI18n}
              />
            )}
            </Presence>

            {/* GLOW UP (22-10): aquí iban «Ver recibos» y «Mi arriendo», que son pestañas del riel («Contrato y
                documentos», «Resumen»); el recibo de cada pago se baja en su fila. */}
            {/* 🔴 Autopago (PAGO-04). Hasta el 21-09-2026 esto mostraba
                «Próximamente» sobre un endpoint que no existía. Ya existe
                (`/portal/autopago`), y se llavea por CONTRATO —no por
                arriendo—: la deuda nace con el contrato y vive en sus cuotas. */}
            <AutopagoSection
              contractId={primaryLease?.contractId ?? null}
              canonCop={primaryLease?.monthlyRent ?? null}
            />
          </div>
        </div>
      </motion.div>

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
  /** «$6.050.000 vencidos en 3 cuotas», o null si no hay nada vencido. */
  vencido?: string | null;
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
  vencido,
  locale,
  t,
  formatCurrency,
}: PeriodStatusCardProps) {
  // PENDING_VALIDATION — viene del caso PSE PENDING (verificación bancaria)
  if (status === 'PENDING_VALIDATION') {
    return (
      <div className="rounded-lg bg-warning-soft border border-warning/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-warning" aria-hidden="true" />
          <span className="text-sm text-warning font-medium">
            {locale === 'es' ? 'Pago en verificación' : 'Payment in verification'}
          </span>
        </div>
        <p className="font-mono text-h2 tabular-nums mb-1 text-fg">
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
      <div className="rounded-lg bg-success-soft border border-success/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Check className="w-5 h-5 text-success" aria-hidden="true" />
          <span className="text-sm text-success font-medium">
            {locale === 'es' ? 'Pago confirmado' : 'Payment confirmed'}
          </span>
        </div>
        <p className="font-mono text-h2 tabular-nums mb-1 text-fg">
          {formatCurrency(amount)}
        </p>
        <p className="text-fg-muted text-sm capitalize mb-4">{periodLabel}</p>
        <p className="text-sm text-fg-muted">
          {vencido
            ? (locale === 'es'
                ? `Recibimos el pago de este mes, pero aún tienes ${vencido}.`
                : `This month's payment was received, but you still have ${vencido}.`)
            : (locale === 'es'
                ? 'Tu pago de este mes ya está al día.'
                : 'You\'re up to date for this month.')}
        </p>
      </div>
    );
  }

  // NONE | REJECTED — mostrar CTA "Pagar arriendo"
  return (
    // Revisora r25: sin la tarjeta celeste (el azul es sólo el botón de pagar).
    <div className="rounded-lg bg-surface border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-fg-muted" aria-hidden="true" />
        <span className="text-sm text-fg font-medium">
          {status === 'REJECTED'
            ? (locale === 'es' ? 'Pago rechazado' : 'Payment rejected')
            : /* Es el canon que cobra «Pagar ahora», no la próxima cuota del
                 estado de cuenta: llamarlo igual daba dos «Próximo pago» con
                 montos distintos en la misma pantalla. */
              (locale === 'es' ? `Canon de ${periodLabel}` : `Rent for ${periodLabel}`)}
        </span>
      </div>

      {status === 'REJECTED' && rejectionReason && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft p-3">
          <p className="text-caption text-danger">{rejectionReason}</p>
        </div>
      )}

      <p className="font-mono text-h2 tabular-nums mb-1 text-fg">
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
              <span className="font-mono tabular-nums text-fg">{progress} %</span>
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
      </Button>
    </div>
  );
}
