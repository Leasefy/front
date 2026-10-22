'use client';

import { PortadaDelInmueble } from '@/components/property/PortadaDelInmueble';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cifra, CrossFade, FranjaDeCifras, MonoLabel, StatusBadge } from '@leasefy/cadence';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { MapPin, Calendar, House, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useLeases, useLeasePaymentInfo } from '@/lib/hooks/useLeases';
import { useEstadoDeCuentaDelPortal } from '@/lib/hooks/useResumenDelPortal';
import { resumenDePagos } from '@/lib/estado-de-cuenta/resumen-de-pagos';
import { proximoPagoDelPortal } from '@/lib/estado-de-cuenta/proximo-pago-del-portal';
import { hoyLocal } from '@/components/estado-de-cuenta/filas';
import { estadoGeneralDelArriendo, diaDePagoLegible } from '@/lib/estado-de-cuenta/estado-general-del-portal';
import { leasesApi } from '@/lib/api/leases.service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { fechaDeVigencia } from '@/lib/contratos/fecha-de-vigencia';
import { NoVoyARenovar } from '@/components/inquilino/NoVoyARenovar';
import { ContratosSinArriendo } from '@/components/inquilino/ContratosSinArriendo';
import { useContratosDelPortal } from '@/lib/hooks/use-contratos-del-portal';

/**
 * QA-INQ-95: el inicio y el fin del arriendo son DÍAS. `new Date('2025-11-01T00:00:00.000Z')`
 * en Colombia es el 31 de octubre: «Mi arriendo» decía «31 de oct de 2025 → 30 de oct de 2026»
 * de un contrato del 1 de noviembre al 31 de octubre. Un instante (con hora) sigue siendo instante.
 */
function diaDelArriendo(iso: string): Date {
  return fechaDeVigencia(iso) ?? new Date(iso);
}

/**
 * Tenant Leases Page - Landing Style (matching main dashboard)
 */
/** El portal en inglés es residual: sólo las etiquetas que ya existían. */
function estadoEn(es: string): string {
  const m: Record<string, string> = {
    'Al día': 'Up to date',
    'En verificación': 'In verification',
    'Pago rechazado': 'Payment rejected',
    'Pendiente': 'Pending',
    'Con saldo vencido': 'Overdue balance',
    'Pago del mes recibido': 'This month received',
  };
  return m[es] ?? es;
}

export default function ArriendoPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();

  const { leases, isLoading, error, errorCrudo, refetch, getActive } = useLeases();

  const activeLeases = isOnboardingComplete ? getActive() : [];
  const primaryLease = activeLeases[0];
  // QA-MIGRACION-95 — CA-04 (Nico, (a)): los contratos migrados sin arriendo
  // (sin día de pago en el archivo), por la identidad de la sesión.
  const { contratos: contratosSinArriendo, cargando: cargandoContratos } = useContratosDelPortal(isOnboardingComplete === true);
  const cuantosContratos = activeLeases.length + contratosSinArriendo.length;

  // Estado del período actual — misma fuente única que pagos/page.tsx.
  const { info: paymentInfo } = useLeasePaymentInfo(primaryLease?.id ?? null);
  // UNA lectura del estado de cuenta: el «Estado general» y el «Próximo pago» de
  // cada tarjeta salen de ahí, como «Pagos» (QA-INQ-95: el próximo pago venía de
  // `/tenant-payments/mine`, armado con el día pactado y el canon entero).
  const estadoDeCuenta = useEstadoDeCuentaDelPortal(Boolean(primaryLease));
  const hoy = hoyLocal();
  const resumenDeCuotas = estadoDeCuenta ? resumenDePagos(estadoDeCuenta, hoy) : null;

  // Calculate totals
  const totalMonthlyRent = activeLeases.reduce(
    (sum, lease) => sum + lease.monthlyRent + (lease.adminFee ?? 0),
    0
  );

  const formatDate = (dateString: string) => {
    return diaDelArriendo(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return diaDelArriendo(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Get days remaining for a lease
  const getDaysRemaining = (endDate: string) => {
    const end = diaDelArriendo(endDate);
    const today = new Date();
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Calculate lease progress (time elapsed)
  const getLeaseProgress = (startDate: string, endDate: string) => {
    const start = diaDelArriendo(startDate);
    const end = diaDelArriendo(endDate);
    const today = new Date();
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  };

  // Loading state
  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading || isLoading);
  if (isOnboardingLoading || isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="dashboard" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <CompleteProfileFirst context="rental" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          {/* `ErrorState` mostraba el mensaje crudo del backend y ofrecía
              reintentar siempre, incluso sobre un 404. `FalloDeCarga` clasifica
              el fallo y sólo ofrece reintentar cuando puede cambiar algo. */}
          <FalloDeCarga error={errorCrudo ?? error} queEs="tu arriendo" onReintentar={refetch} />
        </div>
      </div>
    );
  }

  // Estado general — sale de las CUOTAS (la misma fuente que «Mi estado de
  // cuenta»), no sólo del pago del período: con cuotas vencidas no se dice
  // «Al día». Neutral y factual, sin referencias a centrales de riesgo.
  const estadoGeneral = estadoGeneralDelArriendo(
    paymentInfo?.currentPeriodStatus,
    resumenDeCuotas,
    paymentInfo?.currentPeriodRejectionReason,
  );
  const overallStatus = estadoGeneral
    ? {
        label: locale === 'es' ? estadoGeneral.etiqueta : estadoEn(estadoGeneral.etiqueta),
        detail: estadoGeneral.detalle,
      }
    : null;

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="p-6 lg:p-8">

        {/* GLOW UP (21-10): el encabezado de todas las pantallas; la acción que más se hace desde aquí es pagar. */}
        <EncabezadoDePantalla
          className="mb-6"
          seccion={locale === 'es' ? 'Tu arriendo' : 'Your rental'}
          titulo={t('rental.title')}
          descripcion={
            locale === 'es'
              ? 'Tu contrato, lo que pagas cada mes y cuánto le queda.'
              : 'Your contract, what you pay each month and how long it has left.'
          }
          accionPrincipal={
            activeLeases.length > 0 ? (
              <Button asChild size="sm" hideArrow className="max-lg:flex-1">
                <Link href="/inquilino/pagos">{locale === 'es' ? 'Pagar' : 'Pay'}</Link>
              </Button>
            ) : undefined
          }
        />

        {/*
          Los KPI solo cuando hay algo que resumir.
          Sin contratos decían "0", "$0" y —lo peor— "Al día · Todos los pagos
          al día", que es una afirmación FALSA: no hay pagos que estén al día.
          Un resumen de nada no informa, y encima ocupa el lugar donde debería
          estar lo único útil de esta pantalla: qué hacer para tener un arriendo.
        */}
        {/* GLOW UP (21-10): las tres cifras en la franja común (antes, tres tarjetas teñidas con su ícono en
            caja). El estado va primero: es lo que se viene a mirar. Status refleja las cuotas, no una constante. */}
        {activeLeases.length > 0 && (
          // QA 21-10 (390 px): de a dos por fila, «$ 1.400.000» se cortaba y el estado se partía
          // en tres renglones. Con plata larga, una por fila en el celular (fila="xl" de Cadence).
          <FranjaDeCifras className="mb-8" fila="xl" data-testid="cifras-del-arriendo">
            <Cifra
              etiqueta={locale === 'es' ? 'Estado' : 'Status'}
              valor={overallStatus ? overallStatus.label : '—'}
              tono={
                estadoGeneral?.tono === 'ok'
                  ? 'exito'
                  : estadoGeneral?.tono === 'peligro'
                    ? 'peligro'
                    : estadoGeneral?.tono === 'espera'
                      ? 'aviso'
                      : undefined
              }
              detalle={overallStatus ? overallStatus.detail : locale === 'es' ? 'Sin información de pago' : 'No payment info'}
              data-testid="cifra-estado-del-arriendo"
            />
            <Cifra
              etiqueta={locale === 'es' ? 'Total mensual' : 'Monthly total'}
              valor={formatCurrency(totalMonthlyRent)}
              detalle={locale === 'es' ? 'Arriendo + administración' : 'Rent + admin fee'}
            />
            <Cifra
              etiqueta={locale === 'es' ? 'Arriendos activos' : 'Active rentals'}
              valor={activeLeases.length}
              detalle={locale === 'es' ? 'Contratos vigentes' : 'Current contracts'}
            />
          </FranjaDeCifras>
        )}

        {/* Leases List */}
        <section>
          {/* Sin contratos no va el encabezado: "Contratos activos · 0
              contratos" arriba de "No tienes arriendos activos" dice lo mismo
              dos veces, y la segunda ya lo dice mejor. */}
          {cuantosContratos > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 text-fg">{locale === 'es' ? 'Contratos activos' : 'Active contracts'}</h2>
              <span className="text-sm text-fg-muted">
                <span className="font-mono tabular-nums">{cuantosContratos}</span> {locale === 'es' ? (cuantosContratos !== 1 ? 'contratos' : 'contrato') : (cuantosContratos !== 1 ? 'contracts' : 'contract')}
              </span>
            </div>
          )}

          {activeLeases.length > 0 ? (
            <div className="space-y-4">
              {activeLeases.map((lease, index) => {
                const nextPayment = estadoDeCuenta
                  ? proximoPagoDelPortal(estadoDeCuenta, hoy, lease.contractId ?? null)
                  : null;
                const daysRemaining = getDaysRemaining(lease.endDate);
                const leaseProgress = getLeaseProgress(lease.startDate, lease.endDate);

                return (
                  <div key={lease.id}>
                    <Link href={`/inquilino/arriendo/${lease.id}`}>
                      <div className="group rounded-lg border border-border bg-surface hover:border-border-strong transition-colors duration-slow overflow-hidden">
                        <div className="flex flex-col lg:flex-row">
                          {/* Image */}
                          <div className="relative w-full lg:w-72 h-52 lg:h-auto flex-shrink-0">
                            {/* Sin foto no hay <Image>: los inmuebles migrados llegan con
                                `propertyThumbnail: null`, y `next/image` con `src={null}` tumbaba
                                la pantalla entera («Leasefy no pudo abrir», QA 22-09). */}
                            <PortadaDelInmueble
                              property={{ thumbnailUrl: lease.propertyThumbnail }}
                              alt={lease.propertyTitle}
                              sizes="(max-width: 1024px) 100vw, 288px"
                              priority={index === 0}
                              className="transition-transform duration-reveal group-hover:scale-105"
                            />
                            {/* Status Badge */}
                            {/* El estado con su punto y su palabra (StatusBadge de Cadence), sobre la foto. */}
                            <div className="absolute top-4 left-4">
                              <StatusBadge tone={lease.status === 'ending_soon' ? 'warning' : 'success'} className="bg-surface/90 backdrop-blur-sm">
                                {lease.status === 'ending_soon' ? (locale === 'es' ? 'Termina pronto' : 'Ending soon') : t('common.active')}
                              </StatusBadge>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6">
                            {/* D-19: con un aviso de no renovación, la tarjeta no ofrece
                                «Aceptar renovación»: el aviso va debajo de la tarjeta. */}
                            {lease.renovacion && !(lease.avisoNoRenovar ?? lease.renovacion.avisoNoRenovar) && (
                              <div className="mb-4 rounded-lg border border-primary/30 bg-primary-soft/40 p-3">
                                <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                                  <ArrowsClockwise className="w-4 h-4" aria-hidden="true" />
                                  {locale === 'es' ? 'Tu contrato está en proceso de renovación' : 'Your contract is up for renewal'}
                                </p>
                                <p className="text-caption text-fg-muted mt-1">
                                  {locale === 'es' ? 'Nuevo canon propuesto: ' : 'Proposed new rent: '}
                                  <span className="font-mono tabular-nums text-fg">
                                    {formatCurrency(lease.renovacion.proposedRent + (lease.renovacion.proposedAdminFee ?? 0))}
                                  </span>
                                </p>
                                {/* Aceptar → «Aceptaste»: el botón se cruza con la confirmación. */}
                                <CrossFade swapKey={lease.renovacion.tenantAcceptedAt ? 'aceptada' : 'pendiente'}>
                                {lease.renovacion.tenantAcceptedAt ? (
                                  <p className="mt-2 text-caption font-medium text-success flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" weight="fill" />
                                    {locale === 'es' ? 'Aceptaste la renovación' : 'You accepted the renewal'}
                                  </p>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    hideArrow
                                    className="mt-2"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      try {
                                        await leasesApi.acceptRenovacion(lease.id);
                                        toast.success(locale === 'es' ? 'Renovación aceptada' : 'Renewal accepted');
                                        refetch();
                                      } catch (err) {
                                        toast.error(locale === 'es' ? 'No se pudo aceptar la renovación' : 'Could not accept the renewal', {
                                          description: mensajeParaLaPersona(err, { accion: 'aceptar la renovación' }),
                                        });
                                      }
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    {locale === 'es' ? 'Aceptar renovación' : 'Accept renewal'}
                                  </Button>
                                )}
                                </CrossFade>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                              <div>
                                <h3 className="text-h3 text-fg group-hover:text-primary transition-colors [text-wrap:balance]">
                                  {lease.propertyTitle}
                                </h3>
                                {/* Los migrados llevan la dirección como título: no se repite. */}
                                {lease.propertyAddress && lease.propertyAddress.trim() !== (lease.propertyTitle ?? '').trim() && (
                                <p className="text-sm text-fg-muted mt-1 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {lease.propertyAddress}
                                </p>
                                )}
                              </div>
                              <div className="sm:text-right">
                                <p className="font-mono text-h3 tabular-nums text-fg">
                                  {formatCurrency(lease.monthlyRent + (lease.adminFee ?? 0))}
                                </p>
                                <p className="text-caption text-fg-muted">{locale === 'es' ? 'al mes' : 'per month'}</p>
                              </div>
                            </div>

                            {/* Contract Info Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border-faint">
                              <div>
                                <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Arriendo' : 'Rent'}</MonoLabel>
                                <p className="font-mono text-sm tabular-nums text-fg">
                                  {formatCurrency(lease.monthlyRent)}
                                </p>
                              </div>
                              <div>
                                <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Administración' : 'Admin fee'}</MonoLabel>
                                <p className="font-mono text-sm tabular-nums text-fg">
                                  {(lease.adminFee ?? 0) > 0 ? formatCurrency(lease.adminFee ?? 0) : '—'}
                                </p>
                              </div>
                              <div>
                                <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Día de pago' : 'Payment day'}</MonoLabel>
                                <p className="text-sm font-medium text-fg">
                                  {diaDePagoLegible(lease.paymentDay) ?? (locale === 'es' ? 'Sin definir' : 'Not set')}
                                </p>
                              </div>
                              <div>
                                <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Vencimiento' : 'Expiration'}</MonoLabel>
                                <p className="text-sm font-medium text-fg">
                                  {formatShortDate(lease.endDate)}
                                </p>
                              </div>
                            </div>

                            {/* Contract Progress */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-caption text-fg-muted mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(lease.startDate)}
                                </span>
                                <span>{formatDate(lease.endDate)}</span>
                              </div>
                              <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                {/* `transform`, no `width`: la barra entera corrida a su avance. */}
                                <div
                                  className={cn(
                                    "h-full w-full rounded-full transition-transform duration-slow ease-enter",
                                    daysRemaining < 30 ? "bg-warning" : "bg-success"
                                  )}
                                  style={{ transform: `translateX(${leaseProgress - 100}%)` }}
                                />
                              </div>
                              <p className="text-caption text-fg-muted mt-1.5 text-right">
                                {t('dashboard.daysRemaining', { days: daysRemaining })}
                              </p>
                            </div>

                            {/* Next Payment */}
                            {nextPayment && (
                              <div className="flex items-center justify-between gap-3 mt-4 p-4 bg-surface-muted rounded-lg">
                                <div className="min-w-0">
                                  <MonoLabel className="block text-fg-subtle">{t('dashboard.nextPayment')}</MonoLabel>
                                  <p className="text-sm text-fg">
                                    <span className="font-mono tabular-nums">{formatCurrency(nextPayment.valor)}</span> · {formatShortDate(nextPayment.fecha)}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                                  {locale === 'es' ? 'Ver detalle' : 'View details'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                    {/* D-19 (QA-INQ-95 ronda 2): la otra mitad de la decisión, también
                        desde la lista (antes sólo «Aceptar renovación»). Va FUERA del
                        enlace de la tarjeta: abrir el diálogo no navega al detalle. */}
                    <div className="mt-2 px-1">
                      <NoVoyARenovar lease={lease} onCambio={refetch} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : contratosSinArriendo.length > 0 || cargandoContratos ? null : (
            <EmptyState
              icon={House}
              ilustracion="casa"
              title="No tienes arriendos activos"
              description="Cuando firmes un contrato de arriendo, tu información aparecerá aquí."
              /* "aplicaciones" está muerto (docs/VOCABULARIO.md). Y quien no
                 tiene arriendo no necesita revisar su historial: necesita
                 encontrar dónde vivir. */
              action={{ label: 'Ver propiedades para mí', href: '/inquilino/para-ti' }}
            />
          )}
          {/* QA-MIGRACION-95 — CA-04: los contratos que la inmobiliaria cargó sin arriendo. */}
          {contratosSinArriendo.length > 0 ? (
            <div className={activeLeases.length > 0 ? 'mt-4' : undefined}>
              <ContratosSinArriendo contratos={contratosSinArriendo} />
            </div>
          ) : null}
        </section>

      </motion.div>
    </div>
  );
}
