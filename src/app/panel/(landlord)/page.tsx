'use client';

import { plataQueLlega } from '@/lib/plata/plata-que-llega';
import { PreguntaDeLaRecomendacion } from '@/components/marketplace/inmobiliaria/PreguntaDeLaRecomendacion';
import { LoQueEsperaTuRespuesta, usePendientesDelPropietario } from '@/components/landlord/portal/LoQueEsperaTuRespuesta';
import { TusGiros } from '@/components/landlord/portal/TusGiros';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PortadaDelInmueble } from '@/components/property/PortadaDelInmueble';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatedNumber, Cifra, Collapse, CrossFade, FranjaDeCifras } from '@leasefy/cadence';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { useEntradaTrasCargar, useHuboEsqueleto } from '@/components/portales/use-entrada-tras-cargar';
import { AparecerSi } from '@/components/portales/AparecerSi';
import { Buildings, Users, Clock, WarningCircle, Calendar, ArrowUpRight, CaretDown, CreditCard, UserCheck, CalendarCheck, CalendarBlank, MapPin, Chat, Plus, FileText, Bell, CheckCircle, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { StatusBadge, SEMANTIC, type SemanticTone } from '@/components/brand';
import { Skeleton } from '@/components/ui/skeleton';

import { useLandlordProperties, useLandlordDashboard } from '@/lib/hooks/useLandlord';
import { useVisits } from '@/lib/hooks/useVisits';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit } from '@/lib/types/visit';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { useI18n } from '@/lib/i18n';
import { PlanDetailSheet, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { SetupDashboard } from '@/components/panel/SetupDashboard';
import { LandlordDashboardEmpty } from '@/components/panel/LandlordDashboardEmpty';
import {
  ContratosConLaInmobiliaria,
  useContratosAdministrados,
} from '@/components/landlord/ContratosConLaInmobiliaria';
import type { LandlordProperty } from '@/lib/types/landlord';
import type { DashboardUrgentAction, DashboardUpcomingEvent, DashboardData } from '@/lib/api/landlord.types';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';

const ACTION_ICONS: Record<DashboardUrgentAction['type'], React.ElementType> = {
  signature: FileText,
  late_payment: CreditCard,
  pending_review: UserCheck,
  ending_lease: CalendarCheck,
  pending_visit: CalendarBlank,
};

function UrgentActionsBanner({ actions, entra }: { actions: DashboardUrgentAction[]; entra: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  // Priority → semantic tone: high=critical, medium=warning, low=neutral (gray, not blue).
  const PRIORITY_TONE: Record<string, SemanticTone> = { high: 'critical', medium: 'warning', low: 'neutral' };

  return (
    // Llega con el resumen: aparece si vino después de cargar.
    <AparecerSi si={entra} className="mb-8 rounded-lg bg-surface border border-border overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-surface-muted transition-colors"
      >
        <WarningCircle className="w-5 h-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-fg">
            {t('landlord.dashboard.pendingActions', { count: actions.length })}
          </p>
          <p className="text-caption text-fg-muted">
            {actions[0]?.description}
          </p>
        </div>
        <CaretDown className={cn(
          'w-5 h-5 text-fg-subtle transition-transform duration-slow ease-emphasis',
          expanded && 'rotate-180'
        )} />
      </button>

      {/* Se abre y se cierra con su altura; el chevrón gira con la misma curva. */}
      <Collapse open={expanded} className="px-4 pb-4 space-y-2">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.type] || WarningCircle;
            const tone = PRIORITY_TONE[action.priority] ?? 'neutral';
            const c = SEMANTIC[tone];
            return (
              <Link
                key={action.id}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border-faint hover:bg-[rgba(0,0,0,0.03)] transition-colors"
              >
                <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.soft }}>
                  <Icon className="w-4 h-4" style={{ color: c.fg }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">{action.title}</p>
                  <p className="text-caption text-fg-muted">{action.description}</p>
                </div>
                <span
                  className="font-mono text-caption font-medium px-2 py-0.5 rounded-full tabular-nums"
                  style={{ backgroundColor: c.soft, color: c.fg }}
                >
                  {action.count}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 text-fg-subtle" />
              </Link>
            );
          })}
      </Collapse>
    </AparecerSi>
  );
}

/**
 * Inicio del propietario al que una INMOBILIARIA le administra los inmuebles:
 * sus contratos y el camino a su estado de cuenta. No pide nada del panel del
 * propietario independiente (esas rutas responden «panel en pausa»).
 */
/**
 * GLOW UP (21-10-2026) — el Inicio del propietario de inmobiliaria, por su trabajo.
 *
 * Viene a dos cosas: decidir lo que la inmobiliaria le pregunta y saber cuánto y
 * cuándo le giran. Antes: un saludo grande, el aviso de reparaciones (lo único
 * pendiente que se decía), la pregunta de la recomendación, la lista de contratos
 * y cuatro tarjetas-enlace iguales. Ahora, en el orden en que lo hace:
 *   1. Encabezado común: el saludo, para qué es el portal, «Ver mi estado de
 *      cuenta» (la única azul) y «Mis giros».
 *   2. «Lo que espera tu respuesta»: TODO lo que espera una decisión suya
 *      (giro devuelto, reparaciones, sobrecostos, escoger inquilino, canon), con
 *      su botón. Sin nada pendiente no se pinta.
 *   3. Su plata en una franja: último giro, próximo giro, por girar, vigentes.
 *   4. Sus contratos (cada uno abre su inmueble).
 *   5. Sus documentos (informes y certificados), callados, y al final la
 *      pregunta de la recomendación.
 */
function InicioDelPropietarioDeInmobiliaria({ doc }: { doc: NonNullable<ReturnType<typeof useContratosAdministrados>['doc']> }) {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const { t } = useI18n();
  const firstName = user?.name?.split(' ')[0] || t('landlord.dashboard.defaultName');
  const pendientes = usePendientesDelPropietario();
  const quien = doc.inmobiliaria.nombre || doc.inmobiliaria.razonSocial || 'tu inmobiliaria';
  return (
    <div className="min-h-screen bg-bg">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          // Glow up 22-10 (como el del inquilino): la sección es la del riel y el saludo es el título.
          seccion="Inicio"
          titulo={`${greeting}, ${firstName}`}
          descripcion={`Lo que ${quien} te administra: cuánto te gira, cuándo y lo que te pregunta.`}
          acciones={
            <Button asChild variant="outline" size="sm" hideArrow className="max-lg:flex-1">
              <Link href="/panel/giros">Mis giros</Link>
            </Button>
          }
          accionPrincipal={
            <Button asChild size="sm" hideArrow className="max-lg:flex-1">
              <Link href="/panel/estado-de-cuenta">Ver mi estado de cuenta</Link>
            </Button>
          }
          data-testid="encabezado-del-propietario"
        />
        {/* SO-10 (QA 04-10) y el glow up: TODO lo que espera su respuesta, arriba de todo. */}
        <LoQueEsperaTuRespuesta pendientes={pendientes} />
        <TusGiros doc={doc} />
        <ContratosConLaInmobiliaria doc={doc} />
        <nav aria-label="Tus documentos" className="flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="tus-documentos">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">Tus documentos</span>
          {[
            { href: '/panel/informes', titulo: 'Mis informes', texto: 'certificado anual de ingresos y detalle por inmueble' },
            { href: '/panel/certificados', titulo: 'Certificados y facturas', texto: 'se generan al cerrar el año' },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="text-body-sm text-fg-muted hover:text-fg">
              <span className="font-medium text-fg underline decoration-border-strong underline-offset-4">{a.titulo}</span>
              <span className="max-sm:hidden"> · {a.texto}</span>
            </Link>
          ))}
        </nav>
        {/* «¿Recomendarías a la inmobiliaria?» (marketplace, 09-10-2026): al final, no es la tarea. */}
        <PreguntaDeLaRecomendacion />
      </div>
    </div>
  );
}

/**
 * QA-PROP-95 PO-27 (04-10): la inmobiliaria ya tiene su ficha (y lo invitó),
 * pero todavía ningún contrato. El vacío honesto, sin el panel del
 * independiente (sus rutas responden «panel en pausa»).
 */
function InicioSinContratos({ inmobiliaria }: { inmobiliaria: string }) {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const { t } = useI18n();
  const firstName = user?.name?.split(' ')[0] || t('landlord.dashboard.defaultName');
  return (
    <div className="min-h-screen bg-bg">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Inicio"
          titulo={`${greeting}, ${firstName}`}
          descripcion={`Tu portal con ${inmobiliaria}: lo que te gira, lo que falta y tus informes.`}
        />
        {/* GLOW UP (21-10): el vacío grande con su ilustración, qué va a aparecer, quién lo trae y su botón. */}
        <section className="rounded-lg border border-border bg-surface" data-testid="inicio-sin-contratos">
          <EmptyState
            icon={Buildings}
            ilustracion="casa"
            title={`${inmobiliaria} todavía no tiene contratos tuyos en Leasefy`}
            description="Cuando registre el contrato de uno de tus inmuebles, aquí ves lo que te gira, lo que falta y tus informes. Mientras tanto puedes escribirle por Mensajes."
            action={{ label: `Escribirle a ${inmobiliaria}`, href: '/panel/mensajes' }}
          />
        </section>
      </div>
    </div>
  );
}

export default function PanelPage() {
  const administrados = useContratosAdministrados();
  if (administrados.cargando) {
    // Glow up 22-10: el esqueleto con la forma del inicio (encabezado, la cifra, los contratos) en vez de una
    // caja centrada que no se parecía a lo que llega.
    return (
      <div className="min-h-screen bg-bg">
        <div className="space-y-6 p-6 lg:p-8" aria-busy="true" data-testid="inicio-del-propietario-cargando">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-2 w-full" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  if (administrados.doc) return <InicioDelPropietarioDeInmobiliaria doc={administrados.doc} />;
  if (administrados.fichaSinContratos) return <InicioSinContratos inmobiliaria={administrados.fichaSinContratos.inmobiliaria} />;
  return <PanelDelPropietarioIndependiente />;
}

/**
 * Landlord Dashboard Page - Modern Landing Page Style
 */
function PanelDelPropietarioIndependiente() {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const { t, locale, formatCurrency: i18nFormatCurrency, formatDate: i18nFormatDate } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstName = user?.name?.split(' ')[0] || t('landlord.dashboard.defaultName');
  const { getUpcoming: getUpcomingVisitsFromApi } = useVisits();

  // ALL hooks must be called before any conditional returns (React rules of hooks)
  const { properties: apiProperties, isLoading: propertiesLoading, error: propertiesError, refetch: recargarPropiedades } = useLandlordProperties();
  const { dashboard, isLoading: dashboardLoading, refetch: recargarTablero } = useLandlordDashboard();
  // Propietario de una inmobiliaria: sus contratos no salen por `landlordId`.
  const administrados = useContratosAdministrados();
  // ¿Se vieron los esqueletos? Entonces las cifras que llegan cuentan desde 0
  // (como `KpiValor`) y las tarjetas que dependen del resumen aparecen; si los
  // datos ya estaban, todo se pinta quieto.
  const huboCarga = useHuboEsqueleto(propertiesLoading || dashboardLoading);
  const entradaAdministrados = useEntradaTrasCargar(propertiesLoading || administrados.cargando);

  // Check if coming from onboarding or if user hasn't completed onboarding
  const isSetupMode = searchParams.get('setup') === 'true';
  const [showSetupDashboard, setShowSetupDashboard] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    // Check localStorage for onboarding completion
    const checkOnboardingStatus = () => {
      const saved = localStorage.getItem('plan_onboarding_landlord');
      if (!saved) {
        // No onboarding data - show empty state
        setIsOnboardingComplete(false);
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        const completedSteps = parsed.completedSteps || [];
        // All 4 steps must be completed
        setIsOnboardingComplete(completedSteps.length >= 4);
      } catch {
        setIsOnboardingComplete(false);
      }
    };

    checkOnboardingStatus();

    // Listen for storage changes
    window.addEventListener('storage', checkOnboardingStatus);
    return () => window.removeEventListener('storage', checkOnboardingStatus);
  }, []);

  useEffect(() => {
    // Show setup dashboard if URL has ?setup=true
    const needsSetup = isSetupMode || (user && user.onboardingCompleted === false);
    setShowSetupDashboard(!!needsSetup);
  }, [isSetupMode, user]);

  // Handle dismiss of setup dashboard
  const handleDismissSetup = () => {
    setShowSetupDashboard(false);
    // Remove setup param from URL
    router.replace('/panel');
  };

  const properties = apiProperties;
  const upcomingVisits = getUpcomingVisitsFromApi();

  // Show empty/setup state ONLY after API has finished loading and returned 0 properties.
  // While loading, always show the dashboard layout with skeletons (never the empty state).
  const apiFinished = !propertiesLoading;
  const hasNoProperties = apiFinished && properties.length === 0;

  /*
   * 🔴 QA 22-09: a un propietario invitado por su inmobiliaria, con cuatro
   * contratos en su estado de cuenta, el inicio le decía «No tienes propiedades
   * publicadas · Tu potencial mensual $0 · Publicar propiedad». No publica: se
   * los administra la inmobiliaria. Se le dice eso, con sus contratos.
   */
  if (hasNoProperties && administrados.doc) {
    return (
      <div className="min-h-screen bg-bg">
        <motion.div {...entradaAdministrados} className="p-6 lg:p-8 space-y-8">
          {/* Glow up 22-10: el encabezado común (sección del riel y el saludo como título). */}
          <EncabezadoDePantalla seccion="Inicio" titulo={`${greeting}, ${firstName}`} />
          <ContratosConLaInmobiliaria doc={administrados.doc} />
        </motion.div>
      </div>
    );
  }

  if (hasNoProperties && administrados.cargando) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Skeleton className="h-40 w-full max-w-3xl rounded-lg" />
      </div>
    );
  }

  if (hasNoProperties) {
    // Empty state only when we're sure there are no properties
    if (!isOnboardingComplete) {
      return <LandlordDashboardEmpty />;
    }
    if (showSetupDashboard) {
      return <SetupDashboard onDismiss={handleDismissSetup} />;
    }
  }

  // Calculate risk distribution for properties
  const calculateRiskDistribution = (property: LandlordProperty) => {
    const candidates = property.candidates || [];
    return {
      levelA: candidates.filter(c => c.riskLevel === 'A').length,
      levelB: candidates.filter(c => c.riskLevel === 'B').length,
      levelC: candidates.filter(c => c.riskLevel === 'C').length,
      levelD: candidates.filter(c => c.riskLevel === 'D').length,
    };
  };

  const totalCandidates = properties.reduce((sum, p) => sum + (p.candidateCount || 0), 0);
  const pendingReviews = properties.reduce((sum, p) => sum + (p.pendingCount || 0), 0);

  const formatDateShort = (dateString: string) => {
    return i18nFormatDate(dateString, {
      day: 'numeric',
      month: 'short',
    });
  };

  // Unified loading flag — true while data is still being fetched
  const isLoading = propertiesLoading || dashboardLoading;

  // Fallback dashboard data when the endpoint fails or hasn't loaded yet
  const dashboardData: DashboardData = dashboard ?? {
    financial: {
      // Revisora r25 (R3): sin el tablero no hay ingreso que mostrar. Antes se
      // sumaba el canon pedido de TODOS los inmuebles, vacíos incluidos.
      monthlyIncome: 0,
      activeLeases: 0,
      collectionRate: 100,
      pendingPayments: 0,
    },
    urgentActions: [],
    upcomingEvents: [],
    recentActivity: [],
    riskDistribution: { A: 0, B: 0, C: 0, D: 0 },
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="p-6 lg:p-8">

        {/* Glow up 22-10: el encabezado común; publicar es la acción principal del propietario que arrienda solo. */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion="Inicio"
          titulo={`${greeting}, ${firstName}`}
          descripcion={locale === 'es' ? 'Lo que te entra cada mes, tus inmuebles y tus candidatos.' : 'What comes in each month, your properties and your applicants.'}
          accionPrincipal={
            <Button asChild size="sm" hideArrow className="max-lg:flex-1">
              <Link href="/publicar?from=panel">{t('landlord.dashboard.newProperty')}</Link>
            </Button>
          }
          data-testid="encabezado-del-propietario-independiente"
        />

        {/* LA RESPUESTA: lo que te entra al mes, en grande; inmuebles, candidatos y recaudo en una franja (antes,
            cuatro tarjetas del mismo peso, la primera en medianoche con degradado, un brillo azul y el ícono en caja). */}
        <div className="mb-10 space-y-4" data-testid="cifras-del-propietario">
          {isLoading ? (
            <div className="space-y-3 rounded-lg border border-border bg-surface p-5" aria-busy="true">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : !dashboard ? (
            // Sin el tablero del back: la cifra en «—» y el porqué, con su reintento (R3).
            <CifraHeroe
              rotulo={t('landlord.dashboard.monthlyIncome')}
              cifra="—"
              pie={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="ingreso-del-mes-sin-datos">
                  <span>{locale === 'es' ? 'No pudimos traer tus ingresos.' : "We couldn't load your income."}</span>
                  <button
                    type="button"
                    onClick={() => void recargarTablero()}
                    className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg"
                  >
                    {locale === 'es' ? 'Reintentar' : 'Retry'}
                  </button>
                </span>
              }
              data-testid="ingreso-del-mes"
            />
          ) : (
            <CifraHeroe
              rotulo={t('landlord.dashboard.monthlyIncome')}
              cifra={
                <AnimatedNumber
                  value={dashboardData.financial.monthlyIncome}
                  from={huboCarga ? 0 : undefined}
                  format={plataQueLlega(dashboardData.financial.monthlyIncome, i18nFormatCurrency)}
                />
              }
              contexto={t('landlord.dashboard.activeLeases', { count: dashboardData.financial.activeLeases })}
              pie={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {dashboardData.financial.pendingPayments > 0 && (
                    <span>
                      {t('landlord.dashboard.pendingPayments')}{' '}
                      <span className="font-mono tabular-nums text-danger">{dashboardData.financial.pendingPayments}</span>
                    </span>
                  )}
                  <Link href="/panel/leases" className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg">
                    {t('landlord.dashboard.viewDetails')}
                  </Link>
                </span>
              }
              data-testid="ingreso-del-mes"
            />
          )}
          <FranjaDeCifras aria-label={locale === 'es' ? 'Tus inmuebles' : 'Your properties'}>
            <Cifra
              etiqueta={t('landlord.dashboard.properties')}
              valor={isLoading ? '—' : properties.length}
              detalle={isLoading || !dashboard ? undefined : `${dashboardData.financial.activeLeases} ${t('landlord.dashboard.rented')}`}
            />
            <Cifra
              etiqueta={t('landlord.dashboard.candidates')}
              valor={isLoading ? '—' : totalCandidates}
              tono={!isLoading && pendingReviews > 0 ? 'aviso' : undefined}
              detalle={
                isLoading
                  ? undefined
                  : pendingReviews > 0
                    ? t('landlord.dashboard.pendingCount', { count: pendingReviews })
                    : t('landlord.dashboard.allReviewed')
              }
            />
            {/* Revisora r24 (N8): sin el tablero del back no hay tasa que mostrar (antes, un 100 % de respaldo). */}
            <Cifra
              etiqueta={t('landlord.dashboard.collectionRate')}
              valor={!isLoading && dashboard ? `${Math.round(dashboardData.financial.collectionRate)} %` : '—'}
              tono={!isLoading && dashboard && dashboardData.financial.collectionRate >= 95 ? 'exito' : undefined}
              detalle={t('landlord.dashboard.thisMonth')}
            />
          </FranjaDeCifras>
        </div>

        {/* Urgent Actions Banner */}
        {dashboardData.urgentActions.length > 0 && (
          <UrgentActionsBanner actions={dashboardData.urgentActions} entra={huboCarga} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Properties Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3 text-fg">{t('landlord.dashboard.myProperties')}</h2>
                <Link
                  href="/panel/propiedades"
                  className="text-sm text-fg-muted hover:text-fg font-medium flex items-center gap-1 transition-colors"
                >
                  {t('landlord.dashboard.viewAll')}
                </Link>
              </div>

              {/* Cargando → inmuebles (o el vacío): se cruzan. */}
              {/* Si la lista no cargó, se dice con su reintento: un fallo nunca se
                  pinta como «no tienes inmuebles publicados». */}
              <CrossFade swapKey={propertiesLoading ? 'cargando' : properties.length > 0 ? 'lista' : propertiesError ? 'fallo' : 'vacio'}>
              {propertiesLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-lg bg-surface-muted overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <Skeleton className="w-full sm:w-48 h-36 rounded-none" />
                        <div className="flex-1 p-5 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-44 rounded" />
                              <Skeleton className="h-4 w-32 rounded" />
                            </div>
                            <Skeleton className="h-6 w-24 rounded" />
                          </div>
                          <div className="pt-4 border-t border-border flex gap-3">
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-24 rounded-lg" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div className="space-y-4">
                  {properties.slice(0, 3).map((property) => {
                    const riskDist = calculateRiskDistribution(property);
                    const totalRisk = riskDist.levelA + riskDist.levelB + riskDist.levelC + riskDist.levelD;
                    const goodCandidatePercent = totalRisk > 0
                      ? Math.round(((riskDist.levelA + riskDist.levelB) / totalRisk) * 100)
                      : 0;

                    return (
                      <div key={property.id}>
                        <Link href={`/panel/${property.id}`}>
                          <div className="group relative overflow-hidden rounded-lg bg-surface-muted hover: transition-colors duration-slow">
                            <div className="flex flex-col sm:flex-row">
                              {/* Image */}
                              <div className="relative w-full sm:w-48 h-36 sm:h-auto flex-shrink-0">
                                <PortadaDelInmueble
                                  property={property}
                                  alt={property.title}
                                  className="group-hover:scale-105 transition-transform duration-reveal"
                                />
                                {/* Status badge on image */}
                                <div className="absolute top-3 left-3">
                                  <StatusBadge
                                    tone={property.status === 'available'
                                      ? 'success'
                                      : property.status === 'rented'
                                        ? 'info'
                                        : 'neutral'}
                                    dot={false}
                                  >
                                    {property.status === 'available'
                                      ? t('landlord.dashboard.statusAvailable')
                                      : property.status === 'rented'
                                        ? t('landlord.dashboard.statusRented')
                                        : t('landlord.dashboard.statusPending')}
                                  </StatusBadge>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 p-5">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="text-lg font-medium text-fg group-hover:text-primary transition-colors">
                                      {property.title}
                                    </h3>
                                    <p className="text-sm text-fg-muted mt-0.5 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {barrioYCiudad(property.neighborhood, property.city)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
                                    <p className="font-mono text-body tabular-nums text-fg">
                                      {property.monthlyRent != null ? i18nFormatCurrency(property.monthlyRent) : '—'}
                                    </p>
                                    {property.monthlyRent != null && (
                                      <p className="text-caption text-fg-muted">/{t('landlord.dashboard.perMonth')}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface rounded-lg">
                                    <Users className="w-4 h-4 text-fg-muted" />
                                    <span className="text-sm text-fg-muted font-medium">
                                      {property.candidateCount}
                                    </span>
                                  </div>

                                  {property.candidateCount > 0 && (
                                    <div className="flex items-center gap-2">
                                      {/* `transform`, no `width`: la barra entera corrida a su avance. */}
                                      <div className="w-20 h-2 bg-surface-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full w-full rounded-full transition-[transform,background-color] duration-slow ease-enter"
                                          style={{
                                            transform: `translateX(${goodCandidatePercent - 100}%)`,
                                            backgroundColor: goodCandidatePercent >= 50 ? SEMANTIC.success.fg : SEMANTIC.warning.fg,
                                          }}
                                        />
                                      </div>
                                      <span className="text-caption text-fg-muted">
                                        {goodCandidatePercent}% A-B
                                      </span>
                                    </div>
                                  )}

                                  {property.pendingCount > 0 && (
                                    <StatusBadge tone="warning" dot={false}>
                                      {t('landlord.dashboard.pendingCount', { count: property.pendingCount })}
                                    </StatusBadge>
                                  )}

                                  {property.pendingCount === 0 && property.candidateCount > 0 && (
                                    <StatusBadge tone="success" dot={false}>
                                      <Check className="w-3 h-3" weight="bold" />
                                      {t('landlord.dashboard.reviewed')}
                                    </StatusBadge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : propertiesError ? (
                <FalloDeCarga error={propertiesError} queEs="tus inmuebles" onReintentar={recargarPropiedades} />
              ) : (
                <div className="rounded-lg bg-surface-muted py-14 px-6 text-center">
                  <Buildings className="w-6 h-6 text-fg-subtle shrink-0 mx-auto" aria-hidden="true" />
                  <h3 className="text-base font-medium text-foreground mb-1.5">
                    {t('landlord.dashboard.noPublishedProperties')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                    {t('landlord.dashboard.publishFirstProperty')}
                  </p>
                  <Button asChild hideArrow>
                    <Link href="/publicar?from=panel">
                      <Plus className="w-4 h-4" />
                      {t('landlord.dashboard.publishProperty')}
                    </Link>
                  </Button>
                </div>
              )}
              </CrossFade>

              {/* Show "Ver todas" when there are more than 3 properties */}
              {properties.length > 3 && (
                <Link
                  href="/panel/propiedades"
                  className="flex items-center justify-center gap-2 mt-4 px-5 py-3 rounded-lg border border-border text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg transition-colors"
                >
                  {t('landlord.dashboard.viewAllProperties')}
                  <span className="px-2 py-0.5 bg-surface-muted rounded-full text-caption">
                    {t('landlord.dashboard.moreCount', { count: properties.length - 3 })}
                  </span>
                </Link>
              )}
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3 text-fg">{t('landlord.dashboard.recentActivity')}</h2>
              </div>

              {/* Cargando → actividad: la caja entera se cruza (es la misma lista con `divide-y`). */}
              <CrossFade
                swapKey={dashboardLoading ? 'cargando' : 'listo'}
                className="bg-surface-muted rounded-lg overflow-hidden divide-y divide-border-faint"
              >
                {dashboardLoading ? (
                  [0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 rounded" />
                        <Skeleton className="h-3 w-32 rounded" />
                      </div>
                      <Skeleton className="h-3 w-14 rounded" />
                    </div>
                  ))
                ) : dashboardData.recentActivity.length > 0 ? (
                  dashboardData.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors">
                      <div className="flex w-5 shrink-0 items-center justify-center" aria-hidden="true">
                        {activity.type === 'application' && <FileText className="w-5 h-5 text-fg-muted" />}
                        {activity.type === 'status_change' && <CheckCircle className="w-5 h-5 text-fg-muted" />}
                        {activity.type === 'message' && <Chat className="w-5 h-5 text-fg-muted" />}
                        {activity.type === 'document' && <FileText className="w-5 h-5 text-fg-muted" />}
                        {!['application', 'status_change', 'message', 'document'].includes(activity.type) && (
                          <Bell className="w-5 h-5 text-fg-subtle" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">
                          {activity.title}
                        </p>
                        <p className="text-caption text-fg-muted truncate">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-caption text-fg-subtle whitespace-nowrap">
                        {activity.timestamp}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-fg-subtle">
                    Sin actividad reciente
                  </div>
                )}
              </CrossFade>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <div className="rounded-lg bg-surface-muted p-5">
              <h3 className="font-medium text-fg mb-4">{t('landlord.dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { href: '/publicar?from=panel', icon: Plus, label: t('landlord.dashboard.newProperty'), desc: t('landlord.dashboard.publishAProperty') },
                  { href: '/panel/candidatos', icon: Users, label: t('landlord.dashboard.viewCandidates'), desc: t('landlord.dashboard.applicantsCount', { count: totalCandidates }), badge: pendingReviews > 0 },
                  { href: '/panel/visitas', icon: CalendarBlank, label: t('landlord.dashboard.visits'), desc: t('landlord.dashboard.scheduledCount', { count: upcomingVisits.length }) },
                  { href: '/panel/contratos', icon: FileText, label: t('landlord.dashboard.contracts'), desc: t('landlord.dashboard.manageLeases') },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group">
                      <action.icon className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-caption text-fg-muted truncate">{action.desc}</p>
                      </div>
                      {action.badge && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Upcoming Visits */}
            {upcomingVisits.length > 0 && (
              <UpcomingVisitsCard visits={upcomingVisits} entra={huboCarga} />
            )}

            {/* Upcoming Events */}
            {dashboardData.upcomingEvents.length > 0 && (
              <UpcomingEventsCard events={dashboardData.upcomingEvents} entra={huboCarga} />
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// Upcoming Visits Card
// ============================================================================

// Semantic dots: confirmed=success, requested=info, completed=neutral, cancelled=critical, no_show=warning.
const VISIT_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-success',
  requested: 'bg-primary',
  completed: 'bg-fg-subtle',
  cancelled: 'bg-danger',
  no_show: 'bg-warning',
};

function UpcomingVisitsCard({ visits, entra }: { visits: Visit[]; entra: boolean }) {
  const { t, locale, formatDate: i18nFmtDate } = useI18n();
  const [selected, setSelected] = useState<Visit | null>(null);

  const sections: DetailSection[] = selected ? [
    {
      id: 'visit-property',
      title: t('landlord.dashboard.visitProperty'),
      content: (
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-fg-subtle mt-0.5" />
          <p className="text-sm text-fg">{selected.propertyTitle}</p>
        </div>
      ),
    },
    {
      id: 'visit-datetime',
      title: t('landlord.dashboard.visitDateTime'),
      content: (
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-fg-subtle mt-0.5" />
          <p className="text-sm text-fg">
            {i18nFmtDate(selected.requestedDate + 'T12:00:00', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })} {t('landlord.dashboard.visitAtTime')} {selected.requestedTime}
          </p>
        </div>
      ),
    },
    ...(selected.candidateMessage ? [{
      id: 'visit-message',
      title: t('landlord.dashboard.candidateMessage'),
      content: (
        <div className="flex items-start gap-3">
          <Chat className="w-4 h-4 text-fg-subtle mt-0.5" />
          <p className="text-sm text-fg">{selected.candidateMessage}</p>
        </div>
      ),
    }] : []),
    ...(selected.landlordNotes ? [{
      id: 'visit-notes',
      title: t('landlord.dashboard.yourNotes'),
      content: (
        <div className="flex items-start gap-3">
          <Chat className="w-4 h-4 text-fg-subtle mt-0.5" />
          <p className="text-sm text-fg">{selected.landlordNotes}</p>
        </div>
      ),
    }] : []),
  ] : [];

  return (
    <>
      <AparecerSi si={entra} className="rounded-lg bg-surface-muted p-5">
        <h3 className="font-medium text-fg mb-4 flex items-center gap-2">
          <CalendarBlank className="w-4 h-4 text-fg-muted" />
          {t('landlord.dashboard.upcomingVisits')}
        </h3>
        <div className="space-y-1">
          {visits.slice(0, 3).map((visit) => (
            <button
              key={visit.id}
              onClick={() => setSelected(visit)}
              className="group w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-surface-hover transition-colors"
            >
              <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', VISIT_STATUS_COLORS[visit.status] || 'bg-primary')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">{visit.candidateName}</p>
                <p className="text-caption text-fg-muted">
                  {i18nFmtDate(visit.requestedDate + 'T12:00:00', {
                    day: 'numeric',
                    month: 'short',
                  })} · {visit.requestedTime} · {VISIT_STATUS_LABELS[visit.status]}
                </p>
              </div>
            </button>
          ))}
        </div>
        {visits.length > 3 && (
          <Link
            href="/panel/visitas"
            className="block mt-3 text-center text-caption text-fg-muted hover:text-fg transition-colors"
          >
            {t('landlord.dashboard.viewAllVisits')} →
          </Link>
        )}
      </AparecerSi>

      <PlanDetailSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        profile={selected ? {
          name: selected.candidateName,
          subtitle: VISIT_STATUS_LABELS[selected.status],
          status: selected.status === 'confirmed' ? 'accepted' : selected.status === 'requested' ? 'new' : 'pending',
          statusLabel: VISIT_STATUS_LABELS[selected.status],
        } : undefined}
        sections={sections}
        footerActions={selected ? (
          <div className="flex gap-2">
            <Link
              href={`/panel/${selected.propertyId}`}
              className="flex-1 text-center text-sm font-medium px-4 py-2.5 bg-surface border border-border text-fg rounded-lg hover:bg-surface-muted transition-colors"
            >
              {t('landlord.dashboard.viewProperty')}
            </Link>
            <Button asChild hideArrow className="flex-1">
              <Link href="/panel/visitas">{t('landlord.dashboard.manageVisit')}</Link>
            </Button>
          </div>
        ) : undefined}
        width="sm"
      />
    </>
  );
}

// ============================================================================
// Upcoming Events Card
// ============================================================================

function UpcomingEventsCard({ events, entra }: { events: DashboardUpcomingEvent[]; entra: boolean }) {
  const { t, locale, formatDate: i18nFmtDate } = useI18n();
  const [selected, setSelected] = useState<DashboardUpcomingEvent | null>(null);

  const EVENT_DOT_COLOR: Record<string, string> = {
    payment_due: 'bg-primary',
    lease_ending: 'bg-warning',
    contract_renewal: 'bg-success',
    inspection: 'bg-fg-subtle',
  };

  const isOverdue = selected ? selected.daysUntil < 0 : false;

  const urgencyLabel = selected
    ? isOverdue
      ? t('landlord.dashboard.overdueBy', { count: Math.abs(selected.daysUntil) })
      : selected.daysUntil === 0
        ? t('landlord.dashboard.today')
        : selected.daysUntil === 1
          ? t('landlord.dashboard.tomorrow')
          : t('landlord.dashboard.inDays', { count: selected.daysUntil })
    : '';

  const sections: DetailSection[] = selected ? [
    {
      id: 'event-urgency',
      title: t('landlord.dashboard.urgency'),
      content: (
        <StatusBadge tone={isOverdue ? 'critical' : selected.daysUntil <= 3 ? 'warning' : 'info'} dot={false}>
          {urgencyLabel}
        </StatusBadge>
      ),
    },
    ...(selected.description ? [{
      id: 'event-property',
      title: t('landlord.dashboard.eventProperty'),
      content: (
        <div className="flex items-start gap-3">
          <Buildings className="w-4 h-4 text-fg-subtle mt-0.5" />
          <p className="text-sm text-fg">{selected.description}</p>
        </div>
      ),
    }] : []),
    {
      id: 'event-date',
      title: t('landlord.dashboard.eventDate'),
      content: (
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-fg-subtle mt-0.5" />
          <p className="text-sm text-fg">
            {i18nFmtDate(selected.date + 'T12:00:00', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      ),
    },
  ] : [];

  const actionLabel = selected?.type === 'payment_due'
    ? t('landlord.dashboard.viewRentals')
    : selected?.type === 'lease_ending'
      ? t('landlord.dashboard.viewContract')
      : t('landlord.dashboard.viewDetail');

  return (
    <>
      <AparecerSi si={entra} className="rounded-lg bg-surface-muted p-5">
        <h3 className="font-medium text-fg mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-fg-muted" />
          {t('landlord.dashboard.upcomingEvents')}
        </h3>
        <div className="space-y-1">
          {events.slice(0, 5).map((event) => {
            const dotColor = event.daysUntil < 0 ? 'bg-danger' : (EVENT_DOT_COLOR[event.type] || 'bg-primary');
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="group w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-surface-hover transition-colors"
              >
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{event.title}</p>
                  <p className="text-caption text-fg-muted">
                    {i18nFmtDate(event.date + 'T12:00:00', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                </button>
            );
          })}
        </div>
      </AparecerSi>

      <PlanDetailSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        profile={selected ? {
          name: selected.title,
          subtitle: selected.description || '',
          status: isOverdue ? 'important' : selected?.daysUntil <= 3 ? 'pending' : 'in_progress',
          statusLabel: urgencyLabel,
        } : undefined}
        sections={sections}
        footerActions={selected?.href ? (
          <Button asChild hideArrow className="w-full">
            <Link href={selected.href}>{actionLabel}</Link>
          </Button>
        ) : undefined}
        width="sm"
      />
    </>
  );
}
