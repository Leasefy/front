'use client';

import { useState, useEffect, useMemo } from 'react';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin, CreditCard, FileText, House, CaretRight, MagnifyingGlass, Heart, Shield, CheckCircle, Check, ArrowRight, Lightbulb, ClipboardText } from '@phosphor-icons/react';

import { useFeaturedProperties } from '@/lib/hooks/useProperties';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { useEvaluation } from '@/lib/hooks/useEvaluation';
import { useTenantApplications } from '@/lib/hooks/useApplications';
import { useLeases, useMyPayments } from '@/lib/hooks/useLeases';
import { useTenantCases } from '@/lib/hooks/use-tenant-cases';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { TenantDashboardEmpty } from '@/components/tenant/TenantDashboardEmpty';
import { TopeAprobadoBanner } from '@/components/tenant/TopeAprobadoBanner';
// El de `ui/` es el de Cadence —la baldosa con degradado cobalto→cian— y es el
// que usan las otras seis pantallas del inquilino. El de `data-display/` es
// otro, con círculo gris: mezclarlos es justo lo que hacía que el home se
// viera de otro producto.
import { EmptyState } from '@/components/ui/empty-state';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { referenciaCanon } from '@/lib/api/aprobacion.service';
import {
  deriveTenantOnboardingStatus,
  readTenantOnboardingCacheStatus,
  rehydrateTenantOnboardingCache,
} from '@/lib/onboarding/tenant-onboarding-status';
import { ScoreCard } from '@/components/tenant/ScoreCard';
import { ScoreDetailSheet } from '@/components/tenant/ScoreDetailSheet';
import { ScoreShareModal } from '@/components/tenant/ScoreShareModal';
import { downloadScorePDF } from '@/lib/utils/generate-score-pdf';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import type { Property } from '@/lib/types/property';

/**
 * Tenant Dashboard - Landing Page Style
 * Handles both new users (empty states) and active users (with data)
 */
export default function InquilinoPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { greeting } = useTimeGreeting();
  const { t, locale, formatCurrency: i18nFormatCurrency } = useI18n();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Usuario' : 'User');

  // Property detail sheet state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Evaluation state
  const { evaluation, isPaid, score, purchaseEvaluation } = useEvaluation();
  const { aprobacion, vigente: aprobacionVigente } = useAprobacion();
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handlePurchaseEvaluation = () => {
    purchaseEvaluation();
  };

  const handleDownloadPDF = () => {
    // TODO: migrar a GET /evaluations/:applicationId/certificate.pdf
    // Bloqueado por: useEvaluation está mockeado (localStorage + IDs fake).
    // Cuando useEvaluation se conecte al agente real → usar apiClient.getBlob con evaluation.id
    // y eliminar generate-score-pdf.ts.
    if (!score || !evaluation?.verificationCode || !evaluation.paidAt || !evaluation.expiresAt) return;
    const name = user?.name || 'Inquilino';
    downloadScorePDF(name, score, evaluation.verificationCode, evaluation.paidAt, evaluation.expiresAt);
  };

  // Onboarding completeness — the BACKEND (GET /users/me via the auth context)
  // is the source of truth: a profile whose onboardingCompletedAt flag is
  // stamped NEVER sees the empty "Configura tu perfil" dashboard, regardless
  // of localStorage; a flag-less profile (e.g. auto-provisioned OAuth with a
  // Google-metadata name) always sees the checklist to confirm its data.
  // The localStorage wizard cache is only read as a fallback while no backend
  // user is available (dev/test storage-seeded auth).
  const backendOnboarding = deriveTenantOnboardingStatus(user);
  const hasBackendProfile = user?.profileSource === 'backend';
  const userId = user?.id;
  const [localCacheComplete, setLocalCacheComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLocalCache = () => {
      // Another account's cached payload is treated as absent (PII scoping).
      setLocalCacheComplete(readTenantOnboardingCacheStatus(userId).isComplete);
    };

    checkLocalCache();

    window.addEventListener('storage', checkLocalCache);
    window.addEventListener('onboarding-updated', checkLocalCache);
    return () => {
      window.removeEventListener('storage', checkLocalCache);
      window.removeEventListener('onboarding-updated', checkLocalCache);
    };
  }, [userId]);

  // Self-heal: when the backend says complete but the local wizard cache was
  // cleared (reset button, fresh device), rehydrate it so localStorage-driven
  // UI (sidebar progress) stays consistent. No-ops when already in sync.
  // Only a real backend profile may rehydrate — the degraded session fallback
  // fabricates onboardingCompleted and must never poison the cache.
  useEffect(() => {
    if (user?.profileSource === 'backend') rehydrateTenantOnboardingCache(user);
  }, [user]);

  // Backend completeness is only trusted for real backend profiles; the
  // degraded session fallback keeps the previous cache-based gate.
  const isOnboardingComplete: boolean | null = hasBackendProfile
    ? backendOnboarding.isComplete
    : localCacheComplete;

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setSheetOpen(true);
  };

  // Real data: applications, leases and next payment come from the backend.
  const {
    active: activeApplications,
    isLoading: applicationsLoading,
    error: errorPostulaciones,
    refetch: recargarPostulaciones,
  } = useTenantApplications();
  const {
    getActive: getActiveLeases,
    isLoading: leasesLoading,
    error: errorArriendos,
    refetch: recargarArriendos,
  } = useLeases();
  const { getNextPayment } = useMyPayments();

  const activeLeases = getActiveLeases();
  const nextPaymentRaw = getNextPayment();
  const nextPayment: { amount: number; dueDate: string } | null = nextPaymentRaw
    ? { amount: nextPaymentRaw.amount, dueDate: nextPaymentRaw.dueDate }
    : null;
  const primaryLease: { id: string; propertyName: string } | null = activeLeases[0]
    ? { id: activeLeases[0].id, propertyName: activeLeases[0].propertyTitle }
    : null;

  /*
   * Vista previa de su catálogo. Se piden más de las que se muestran porque
   * después se filtran.
   *
   * El filtro es el MISMO que el de `/inquilino/para-ti`, y eso es el punto:
   * antes el home mostraba destacadas sin filtrar, así que alguien aprobado
   * hasta $2.800.000 podía ver acá una de $4.000.000, hacer clic en "Ver más"
   * y no encontrarla en su catálogo. La vista previa prometía algo que el
   * destino no tenía.
   */
  const { properties: featuredRaw, isLoading: featuredLoading } = useFeaturedProperties(12);
  const referenciaHome = referenciaCanon(aprobacion);
  const featuredProperties = useMemo(() => {
    // T-0038: this widget compares against a RENT approval cap
    // (`referenciaHome.valorCop`) — a SALE listing has no `monthlyRent`
    // (contract.md §3.2.4) and doesn't belong in a rent-budget comparison.
    // Excluded explicitly rather than left to fall out of a `null <= x`
    // comparison (contract.md §3.7 — deliberate, not a silent side effect).
    const disponibles = featuredRaw.filter((p) => p.status !== 'rented' && p.listingType !== 'sale');
    const dentro = referenciaHome
      ? disponibles.filter((p) => (p.monthlyRent ?? 0) <= referenciaHome.valorCop)
      : disponibles;
    // Safe: every row here already passed the `listingType !== 'sale'` filter above.
    return [...dentro].sort((a, b) => (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0)).slice(0, 4);
  }, [featuredRaw, referenciaHome]);

  /*
   * `useTenantCases()` MUST be called unconditionally — it used to live below
   * the three early returns further down (loading / onboarding-incomplete /
   * error), which is a `react-hooks/rules-of-hooks` violation: the SAME
   * mounted instance calls a different number of hooks depending on which
   * branch it took, and React throws the moment it transitions from one of
   * those early states into the fully-loaded one.
   *
   * Hoisting it here fixes the violation, but a naive hoist would ALSO make
   * it fetch unconditionally — today it only ever mounted (and only ever
   * fetched) once the dashboard actually reached its full render, so a
   * visitor stuck loading, mid-onboarding, or looking at the error state
   * NEVER triggered this fetch. Onboarding-incomplete in particular is not a
   * rare edge case — it's every new signup. `skip` preserves that exact
   * gate: it mirrors the same condition the three early returns below test,
   * so the hook still fetches if and only if the old call site would have
   * been reached.
   */
  const dashboardWillRender =
    !authLoading &&
    isOnboardingComplete !== null &&
    !applicationsLoading &&
    !leasesLoading &&
    isOnboardingComplete &&
    !errorPostulaciones &&
    !errorArriendos;
  const { openCasesCount } = useTenantCases({ skip: !dashboardWillRender });

  // Loading state — wait for auth + real data so the "new user" banner doesn't flash
  if (authLoading || isOnboardingComplete === null || applicationsLoading || leasesLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show onboarding if not complete
  if (!isOnboardingComplete) {
    return <TenantDashboardEmpty />;
  }

  /*
   * No se puede armar el inicio sin saber si tiene arriendo o postulaciones:
   * cualquier cosa que se pinte acá sería una afirmación sobre datos que no
   * llegaron. Se dice, con reintento, en vez de inventar un panel vacío.
   */
  if (errorPostulaciones || errorArriendos) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <FalloDeCarga
            error={errorPostulaciones ?? errorArriendos}
            queEs="tu panel"
            onReintentar={() => {
              if (errorPostulaciones) void recargarPostulaciones();
              if (errorArriendos) void recargarArriendos();
            }}
            volverA={{ label: 'Explorar propiedades', href: '/inquilino/explorar' }}
          />
        </div>
      </div>
    );
  }

  /*
   * Si la carga FALLÓ, las dos listas quedan vacías y esta pantalla concluía
   * que la persona es nueva: a alguien con un arriendo activo lo saludaba como
   * si acabara de llegar y le escondía sus postulaciones.
   *
   * Un fallo no es una ausencia. Los hooks siempre expusieron `error`; la
   * pantalla lo ignoraba.
   */
  const isNewUser = activeLeases.length === 0 && activeApplications.length === 0;

  // Casos abiertos — conteo REAL (proyección de las fuentes ya cargadas; ver
  // use-tenant-cases). La tarjeta sólo aparece cuando cuenta algo (>0), igual
  // que el resto de contadores de este grid. `openCasesCount` viene del
  // `useTenantCases()` hoisteado arriba (Rules of Hooks) — acá solo se deriva
  // el flag de UI.
  const hayCasos = !isNewUser && openCasesCount > 0;

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm font-medium text-fg-muted dark:text-fg-subtle mb-1">
            {greeting}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium text-fg dark:text-white tracking-tight">
            {t('dashboard.hello', { name: firstName })}
          </h1>
          {/* Acá iba un "¡Tu perfil está listo!" que repetía, palabra por
              palabra, la tarjeta que viene justo debajo. Dos felicitaciones
              seguidas por el mismo hecho. Queda una. */}
        </motion.header>

        {/*
          Lo primero del home es la aprobación, y reemplaza al viejo
          "¡Perfil completado!".

          El perfil completo no es el hito que le importa a nadie: es un trámite
          nuestro. El hito es **hasta cuánto puede arrendar** — sin eso no se
          puede postular a nada, y con eso el catálogo deja de ser una vitrina.
          El banner cubre los cuatro estados, así que el home empuja la acción
          correcta en cada uno: conseguirla, esperarla, ver qué hacer si le
          dijeron que no, o ir a su catálogo si ya la tiene.

          Desde el home el paso siguiente es el catálogo, no el detalle: por eso
          `detalle` apunta a "para ti" y no a la pantalla del tope.
        */}
        {isNewUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <TopeAprobadoBanner
              aprobacion={aprobacion}
              vigente={aprobacionVigente}
              detalle={{
                href: '/inquilino/para-ti',
                label: locale === 'es' ? 'Ver mis propiedades' : 'View my properties',
                variant: 'default',
              }}
            />
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`grid gap-4 mb-8 ${
            isNewUser
              ? 'grid-cols-1 sm:grid-cols-2'
              : hayCasos
                ? 'grid-cols-2 lg:grid-cols-5'
                : 'grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {/* Trust Score - Always show */}
          <ScoreCard
            isPaid={isPaid}
            level={score?.level}
            onClick={() => setScoreSheetOpen(true)}
          />

          {/* Contadores — solo cuando cuentan algo. Un "Arriendos 0" y un
              "Postulaciones 0" no resumen nada y ocupan el lugar de lo único
              útil, que es por dónde empezar. */}
          {!isNewUser && (
          <>
          {/* Active Leases */}
          <Link href="/inquilino/arriendo" className="group">
            <div className="h-full rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5 hover:bg-surface-muted dark:hover:bg-[#222224] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                <House className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
              </div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{locale === 'es' ? 'Arriendos' : 'Rentals'}</p>
              <p className="text-2xl font-bold text-fg dark:text-white group-hover:text-primary transition-colors">{activeLeases.length}</p>
              <p className="text-[10px] text-fg-subtle dark:text-fg-muted mt-1">
                {activeLeases.length === 0
                  ? (locale === 'es' ? 'Sin arriendos activos' : 'No active rentals')
                  : (locale === 'es' ? 'Contratos vigentes' : 'Active contracts')}
              </p>
            </div>
          </Link>

          {/* Applications */}
          <Link href="/inquilino/aplicaciones" className="group">
            <div className="h-full rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5 hover:bg-surface-muted dark:hover:bg-[#222224] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
              </div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('nav.applications')}</p>
              <p className="text-2xl font-bold text-fg dark:text-white group-hover:text-primary transition-colors">{activeApplications.length}</p>
              <p className="text-[10px] text-fg-subtle dark:text-fg-muted mt-1">
                {locale === 'es' ? 'En proceso' : 'In progress'}
              </p>
            </div>
          </Link>

          {/* Casos abiertos — conteo real con deep-link al hub /inquilino/casos.
              Sólo cuando hay casos: "Casos 0" no resume nada (misma regla del grid). */}
          {hayCasos && (
            <Link href="/inquilino/casos" className="group">
              <div className="h-full rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5 hover:bg-surface-muted dark:hover:bg-[#222224] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <ClipboardText className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                </div>
                <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{locale === 'es' ? 'Casos' : 'Cases'}</p>
                <p className="text-2xl font-bold text-fg dark:text-white group-hover:text-primary transition-colors">{openCasesCount}</p>
                <p className="text-[10px] text-fg-subtle dark:text-fg-muted mt-1">
                  {locale === 'es' ? 'Abiertos' : 'Open'}
                </p>
              </div>
            </Link>
          )}
          </>
          )}

          {/* Next Payment or CTA */}
          {nextPayment && primaryLease ? (
            <Link href="/inquilino/pagos" className="group">
              <div className="h-full rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5 hover:bg-surface-muted dark:hover:bg-[#222224] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                </div>
                <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('dashboard.nextPayment')}</p>
                <p className="text-2xl font-bold text-fg dark:text-white group-hover:text-primary transition-colors">
                  {i18nFormatCurrency((nextPayment as { amount: number }).amount)}
                </p>
              </div>
            </Link>
          ) : (
            <Link href="/inquilino/explorar" className="group">
              <div className="h-full rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5 hover:bg-surface-muted dark:hover:bg-[#222224] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <MagnifyingGlass className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                </div>
                <p className="text-xs text-primary font-medium mb-1">
                  {locale === 'es' ? 'Comienza ahora' : 'Get started'}
                </p>
                <p className="text-sm font-semibold text-fg dark:text-white group-hover:text-primary transition-colors">
                  {locale === 'es' ? 'Buscar propiedades' : 'Search properties'}
                </p>
              </div>
            </Link>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Recommended Properties - Always show prominently */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-fg dark:text-white">
                    {locale === 'es' ? 'Propiedades para ti' : 'Properties for you'}
                  </h2>
                  {/* Decía "Basado en tu perfil y preferencias", que no es lo
                      que hace: no hay motor de perfil detrás de esta sección.
                      Ahora dice lo que sí es cierto, y cambia según tenga o no
                      un tope aprobado. */}
                  <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
                    {referenciaHome
                      ? locale === 'es'
                        ? 'Dentro de tu tope aprobado'
                        : 'Within your approved cap'
                      : locale === 'es'
                        ? 'Disponibles ahora'
                        : 'Available now'}
                  </p>
                </div>
                {/* Apunta al catálogo propio, no a Explorar: la sección se
                    llama "Propiedades para ti" y mandaba al listado general. */}
                <Link
                  href="/inquilino/para-ti"
                  className="text-sm text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  {t('common.showMore')}
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {featuredProperties.map((property, index) => (
                  <motion.button
                    key={property.id}
                    onClick={() => handleViewProperty(property)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                    className="group relative overflow-hidden rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] hover:border-border dark:hover:border-border-strong transition-colors duration-300 text-left w-full"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={property.images[0]}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/*
                        Acá iba una insignia "92% match". El número salía de
                        `92 - index * 5`: la posición en el arreglo, no un
                        cálculo. La primera tarjeta siempre decía 92%.

                        El match REAL existe y es del backend —`/recommendations`
                        devuelve `matchScore` y lo pinta `PropertyMatchCard`—
                        pero esta sección no usa ese endpoint, usa
                        `useFeaturedProperties`. Así que la insignia afirmaba
                        una afinidad que nadie midió. Fuera hasta que la sección
                        se conecte al motor (ver el handoff de Víctor).
                      */}

                      {/* Heart - Glass effect */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all backdrop-blur-xl bg-surface/20 border border-white/30 hover:bg-surface/30 cursor-pointer"
                      >
                        <Heart className="w-4 h-4 text-white drop-" />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-fg dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                        <p className="text-lg font-bold text-fg dark:text-white whitespace-nowrap flex-shrink-0">
                          {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
                          {property.monthlyRent != null ? (
                            <>
                              {i18nFormatCurrency(property.monthlyRent)}
                              <span className="text-xs font-normal text-fg-muted dark:text-fg-subtle">/{locale === 'es' ? 'mes' : 'mo'}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>

                      <p className="text-sm text-fg-muted dark:text-fg-subtle flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {property.neighborhood}, {property.city}
                      </p>

                      <div className="flex items-center gap-2 pt-3 border-t border-border-faint dark:border-border-strong">
                        <span className="px-2.5 py-1 bg-surface-muted dark:bg-ink rounded-md text-xs text-fg-muted dark:text-fg-subtle font-medium">
                          {property.bedrooms} {locale === 'es' ? 'hab' : 'bed'}
                        </span>
                        <span className="px-2.5 py-1 bg-surface-muted dark:bg-ink rounded-md text-xs text-fg-muted dark:text-fg-subtle font-medium">
                          {property.bathrooms}{' '}
                          {locale === 'es'
                            ? property.bathrooms === 1
                              ? 'baño'
                              : 'baños'
                            : 'bath'}
                        </span>
                        <span className="px-2.5 py-1 bg-surface-muted dark:bg-ink rounded-md text-xs text-fg-muted dark:text-fg-subtle font-medium">
                          {property.area} m²
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            {/*
              Antes esto era un bloque suelto: sin encabezado y sobre un fondo
              `surface-muted/80` que encima del fondo de la página no se ve, así
              que quedaba flotando después de las tarjetas sin pertenecer a
              nada. Un vacío sin sección no dice de qué está vacío.

              Ahora es una sección como la de arriba —título, subtítulo y enlace
              a la lista completa— y el vacío usa el `EmptyState` compartido,
              el mismo de Documentos y Contratos, dentro de una tarjeta con
              borde como el resto de las superficies del home.
            */}
            {activeApplications.length === 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-fg dark:text-white">
                      {t('nav.applications')}
                    </h2>
                    <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
                      {locale === 'es'
                        ? 'El estado de cada propiedad a la que te postules'
                        : 'The status of every property you apply to'}
                    </p>
                  </div>
                  <Link
                    href="/inquilino/aplicaciones"
                    className="text-sm text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
                  >
                    {t('common.showMore')}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618]">
                  {/* "aplicación / aplicar" está muerto: docs/VOCABULARIO.md.
                      Y el CTA va a su catálogo, que es lo siguiente que haría. */}
                  <EmptyState
                    icon={FileText}
                    title={locale === 'es' ? 'Todavía no te has postulado' : 'You have not applied yet'}
                    description={
                      locale === 'es'
                        ? 'Cuando te postules a una propiedad, podrás seguir acá cómo va tu postulación.'
                        : 'When you apply to a property, you\'ll be able to follow your application here.'
                    }
                    action={{
                      label: locale === 'es' ? 'Ver propiedades para mí' : 'View properties for me',
                      href: '/inquilino/para-ti',
                    }}
                  />
                </div>
              </motion.section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5"
            >
              <h3 className="font-semibold text-fg dark:text-white mb-4">
                {t('dashboard.quickActions')}
              </h3>
              <div className="space-y-2">
                {[
                  {
                    href: '/inquilino/explorar',
                    icon: MagnifyingGlass,
                    label: locale === 'es' ? 'Buscar propiedades' : 'Search properties',
                    desc: locale === 'es' ? 'Explora el mercado' : 'Explore the market',
                  },
                  {
                    href: '/inquilino/guardados',
                    icon: Heart,
                    label: locale === 'es' ? 'Propiedades guardadas' : 'Saved properties',
                    desc: locale === 'es' ? 'Ver favoritos' : 'View favorites'
                  },
                  {
                    href: '/inquilino/aplicaciones',
                    icon: FileText,
                    label: t('nav.applications'),
                    desc: locale === 'es' ? 'Ver mis postulaciones' : 'View my applications'
                  },
                  {
                    href: '/inquilino/perfil',
                    icon: Shield,
                    label: locale === 'es' ? 'Mi perfil' : 'My profile',
                    desc: locale === 'es' ? 'Editar información' : 'Edit information'
                  },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface dark:hover:bg-[#222224] transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center transition-shadow">
                        <action.icon className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg dark:text-white group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">{action.desc}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-fg-subtle group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Tips Card for New Users */}
            {isNewUser && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-fg dark:text-white text-sm mb-1">
                      {locale === 'es' ? 'Consejo' : 'Tip'}
                    </h4>
                    <p className="text-sm text-fg-muted dark:text-fg-subtle leading-relaxed">
                      {locale === 'es'
                        ? 'Guarda propiedades que te interesen tocando el corazón. Así podrás compararlas fácilmente.'
                        : 'Save properties you like by tapping the heart. This way you can easily compare them.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Help Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-xl bg-surface dark:bg-[#1a1a1c] border border-border dark:border-border-strong p-5"
            >
              <h4 className="font-semibold text-fg dark:text-white text-sm mb-2">
                {locale === 'es' ? '¿Necesitas ayuda?' : 'Need help?'}
              </h4>
              <p className="text-sm text-fg-muted dark:text-fg-subtle mb-4">
                {locale === 'es'
                  ? 'Nuestro equipo está listo para asistirte.'
                  : 'Our team is ready to assist you.'}
              </p>
              <Link
                href="/ayuda"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
              >
                {locale === 'es' ? 'Ir al centro de ayuda' : 'Go to help center'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Property Detail Sheet */}
      <PropertyDetailSheet
        property={selectedProperty}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

      {/* Score Detail Sheet */}
      <ScoreDetailSheet
        open={scoreSheetOpen}
        onClose={() => setScoreSheetOpen(false)}
        isPaid={isPaid}
        score={score}
        verificationCode={evaluation?.verificationCode ?? null}
        onPurchase={handlePurchaseEvaluation}
        onDownloadPDF={handleDownloadPDF}
        onShare={() => {
          setScoreSheetOpen(false);
          setShareModalOpen(true);
        }}
      />

      {/* Score Share Modal */}
      {evaluation?.verificationCode && (
        <ScoreShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          verificationCode={evaluation.verificationCode}
        />
      )}
    </div>
  );
}
