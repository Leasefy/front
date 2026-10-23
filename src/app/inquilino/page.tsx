'use client';

import { PreguntaDeLaRecomendacion } from '@/components/marketplace/inmobiliaria/PreguntaDeLaRecomendacion';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useState, useEffect, useMemo } from 'react';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PortadaDelInmueble, primeraFoto } from '@/components/property/PortadaDelInmueble';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MonoLabel, Stagger, StaggerItem } from '@leasefy/cadence';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { MapPin, FileText, MagnifyingGlass, Heart, ClipboardText, Wrench, ChatCircle, Question } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { RUTA_DEL_MARKETPLACE } from '@/lib/nav/portal-del-inquilino';

import { useFeaturedProperties } from '@/lib/hooks/useProperties';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { useEvaluation } from '@/lib/hooks/useEvaluation';
import { useTenantApplications } from '@/lib/hooks/useApplications';
import { useLeases } from '@/lib/hooks/useLeases';
import { useContratosDelPortal } from '@/lib/hooks/use-contratos-del-portal';
import { useEstadoDeCuentaDelPortalConEstado } from '@/lib/hooks/useResumenDelPortal';
import { hoyLocal } from '@/components/estado-de-cuenta/filas';
import { queTeToca } from '@/lib/inquilino/que-te-toca';
import { vistaDeTuArriendo } from '@/lib/inquilino/tu-arriendo';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { useTenantCases } from '@/lib/hooks/use-tenant-cases';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { TenantDashboardEmpty } from '@/components/tenant/TenantDashboardEmpty';
import { TopeAprobadoBanner } from '@/components/tenant/TopeAprobadoBanner';
import { TuArriendo } from '@/components/tenant/TuArriendo';
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
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useI18n } from '@/lib/i18n';
import type { Property } from '@/lib/types/property';
import { formatArea } from '@/lib/format';
import { areaConocida } from '@/lib/inmuebles/area-conocida';

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

  const activeLeases = getActiveLeases();

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
  const { properties: featuredRaw, isLoading: featuredLoading } = useFeaturedProperties(24);
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
    // Los que tienen foto primero y, entre iguales, el más barato: los migrados
    // llegan sin fotos y llenaban las cuatro tarjetas de «Sin fotos» mientras
    // había inmuebles con fotos en la misma tanda (Nico, 2026-09-15).
    const conFoto = (p: Property) => (primeraFoto(p) ? 1 : 0);
    return [...dentro]
      .sort((a, b) => conFoto(b) - conFoto(a) || (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0))
      .slice(0, 4);
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
  // QA-MIGRACION-95 — CA-04 (Nico, (a)): el inquilino migrado sin arriendo (el
  // archivo no traía día de pago) tiene contratos vigentes igual: el inicio no
  // lo trata como alguien que busca dónde vivir.
  const { contratos: contratosSinArriendo } = useContratosDelPortal(dashboardWillRender);
  const cuantosArriendos = activeLeases.length + contratosSinArriendo.length;
  // «Próximo pago» sale del estado de cuenta, la misma cuenta que «Pagos» y «Mi
  // arriendo» (QA-INQ-95: venía de `/tenant-payments/mine`, armado con el día
  // pactado y el canon entero del modelo viejo).
  const estadoDelPortal = useEstadoDeCuentaDelPortalConEstado(dashboardWillRender && cuantosArriendos > 0);
  /*
   * QA de agentes 17-10 (Nico, «Inicio de arrendatario»): quien ya arrienda ve
   * su arriendo arriba (lo vencido, el próximo pago, «Pagar») y accesos de
   * arrendatario. Nada de «Propiedades para ti», postulaciones vacías ni score:
   * siguen en el menú. Sus postulaciones en curso, si tiene, sí se dicen.
   */
  const esArrendatario = cuantosArriendos > 0;
  const teToca = queTeToca({
    arrienda: esArrendatario,
    vista: esArrendatario && estadoDelPortal.doc ? vistaDeTuArriendo(estadoDelPortal.doc, hoyLocal(), {}) : null,
    aprobacionVigente: Boolean(aprobacionVigente),
    postulacionesEnCurso: activeApplications.length,
    es: locale === 'es',
    plata: (n) => i18nFormatCurrency(n),
    dia: (iso) => fechaLarga(iso),
  });
  const titulosDeLosInmuebles = useMemo(() => {
    const t: Record<string, string> = {};
    for (const l of activeLeases) if (l.contractId && l.propertyTitle) t[l.contractId] = l.propertyTitle;
    return t;
  }, [activeLeases]);

  // Loading state — wait for auth + real data so the "new user" banner doesn't flash
  const cargandoElPanel =
    authLoading || isOnboardingComplete === null || applicationsLoading || leasesLoading;
  // Carga → contenido: si se vio el esqueleto, el panel entra con 4 px; si los
  // datos ya estaban, no anima (la entrada de la página es del template).
  const entrada = useEntradaTrasCargar(cargandoElPanel);
  if (cargandoElPanel) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="dashboard" className="mx-auto max-w-7xl" />
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
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <FalloDeCarga
            error={errorPostulaciones ?? errorArriendos}
            queEs="tu panel"
            onReintentar={() => {
              if (errorPostulaciones) void recargarPostulaciones();
              if (errorArriendos) void recargarArriendos();
            }}
            // Revisora r24: la salida de un fallo es la ayuda, no ir a buscar otro arriendo.
            volverA={{ label: 'Ir al centro de ayuda', href: '/ayuda' }}
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
  const isNewUser = cuantosArriendos === 0 && activeApplications.length === 0;

  // Casos abiertos — conteo REAL (proyección de las fuentes ya cargadas; ver
  // use-tenant-cases). La tarjeta sólo aparece cuando cuenta algo (>0), igual
  // que el resto de contadores de este grid. `openCasesCount` viene del
  // `useTenantCases()` hoisteado arriba (Rules of Hooks) — acá solo se deriva
  // el flag de UI.
  const hayCasos = !isNewUser && openCasesCount > 0;

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="p-6 lg:p-8">

        {/* GLOW UP (21-10): el encabezado de todas las pantallas (antes, un saludo grande propio). */}
        <EncabezadoDePantalla
          className="mb-8"
          // Revisora r24 (Resumen del inquilino): la sección es la del riel («Inicio») y el saludo es el título.
          seccion="Inicio"
          titulo={firstName ? `${greeting}, ${firstName}` : greeting}
          // «Te toca: …» (Nico eligió «3 secciones», 21-10): lo único urgente, en una línea.
          // Revisora r25: sin tope, la cifra grande de abajo ya dice «Todavía no sabes hasta cuánto…» con su botón; el
          // «Te toca» que llevaba a lo mismo no se repite aquí. El enlace en tinta: el azul es el botón de la pantalla.
          descripcion={
            teToca && teToca.href !== '/inquilino/aprobacion' ? (
              <span data-testid="te-toca">
                {teToca.texto}
                {teToca.href ? (
                  <>
                    {' '}
                    <Link href={teToca.href} className="font-medium text-fg underline underline-offset-4 hover:text-primary">
                      {locale === 'es' ? 'Ir' : 'Go'}
                    </Link>
                  </>
                ) : null}
              </span>
            ) : undefined
          }
        />
        {/* Acá iba un "¡Tu perfil está listo!" que repetía, palabra por
            palabra, la tarjeta que viene justo debajo. Dos felicitaciones
            seguidas por el mismo hecho. Queda una. */}

        {/* «¿Recomendarías a tu inmobiliaria?» (marketplace, 09-10-2026): a
            los 3 meses del contrato y al terminar, hasta que vote. */}
        {/* Con arriendo va debajo de «Tu arriendo»: lo primero es su arriendo (Nico, 17-10). */}
        {!esArrendatario && <PreguntaDeLaRecomendacion className="mb-8" />}

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
          <div className="mb-8">
            {/* GLOW UP (22-10): el tope es LA RESPUESTA del inicio de quien llega («hasta cuánto puedo
                arrendar»): va en grande, con su rótulo en mono; en el catálogo sigue la banda de siempre. */}
            <TopeAprobadoBanner
              aprobacion={aprobacion}
              vigente={aprobacionVigente}
              tamano="heroe"
              detalle={{
                href: '/inquilino/para-ti',
                label: locale === 'es' ? 'Ver inmuebles para mí' : 'View properties for me',
                variant: 'default',
              }}
            />
          </div>
        )}

        {/* GLOW UP (22-10): aquí iba una grilla de contadores del mismo peso (calificación «Sin evaluar»,
            postulaciones, casos, «Buscar inmuebles»): repetía el riel. Lo abierto va en una línea en la
            columna principal y la calificación, sólo cuando dice algo, en la lateral. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {esArrendatario && (
              <div className="space-y-4">
                <TuArriendo estado={estadoDelPortal} hoy={hoyLocal()} titulos={titulosDeLosInmuebles} />
                <LoAbierto
                  casos={hayCasos ? openCasesCount : 0}
                  postulaciones={activeApplications.length}
                  es={locale === 'es'}
                  testid="lo-demas-del-arrendatario"
                />
                {/* GLOW UP (21-10): lo que tiene abierto (casos, postulaciones) va antes que la pregunta de la
                    recomendación, que no es su trabajo; sigue debajo de «Tu arriendo» (Nico, 17-10). */}
                <PreguntaDeLaRecomendacion />
              </div>
            )}

            {/* Quien busca y ya se postuló: lo abierto primero, en una línea (antes, contadores en tarjetas). */}
            {!esArrendatario && !isNewUser && (
              <LoAbierto
                casos={hayCasos ? openCasesCount : 0}
                postulaciones={activeApplications.length}
                es={locale === 'es'}
                testid="lo-abierto-de-la-busqueda"
              />
            )}

            {/* Recomendadas: sólo para quien todavía busca dónde vivir. */}
            {!esArrendatario && (
            <section data-testid="inmuebles-para-ti">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-h3 text-fg">
                    {locale === 'es' ? 'Inmuebles para ti' : 'Properties for you'}
                  </h2>
                  {/* Decía "Basado en tu perfil y preferencias", que no es lo
                      que hace: no hay motor de perfil detrás de esta sección.
                      Ahora dice lo que sí es cierto, y cambia según tenga o no
                      un tope aprobado. */}
                  <p className="text-sm text-fg-muted mt-0.5">
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
                {/* Revisora r25: «Ver más» sólo con inmuebles que ver (antes también sobre el vacío). */}
                {featuredProperties.length > 0 && (
                <Link
                  href="/inquilino/para-ti"
                  className="text-sm text-fg-muted hover:text-fg font-medium flex items-center gap-1 transition-colors"
                >
                  {t('common.showMore')}
                </Link>
                )}
              </div>

              {/* Las destacadas llegan DESPUÉS del panel (su propia consulta). Mientras, el esqueleto con la
                  forma de las tarjetas (antes, la sección quedaba con el título y nada debajo). */}
              {featuredLoading && featuredProperties.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-testid="inmuebles-para-ti-cargando" aria-busy="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface">
                      <Skeleton className="aspect-[16/10] w-full rounded-none" />
                      <div className="space-y-2 p-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : featuredProperties.length === 0 ? (
                /* Sin inmuebles que mostrar: qué va a aparecer, de dónde salen y por dónde seguir buscando. */
                <div className="rounded-lg border border-border bg-surface" data-testid="inmuebles-para-ti-vacio">
                  <EmptyState
                    icon={MagnifyingGlass}
                    title={
                      referenciaHome
                        ? locale === 'es'
                          ? 'Hoy no hay inmuebles dentro de tu tope'
                          : 'No properties within your cap today'
                        : locale === 'es'
                          ? 'Hoy no hay inmuebles disponibles'
                          : 'No properties available today'
                    }
                    description={
                      locale === 'es'
                        ? 'Los publican las inmobiliarias en el marketplace y aparecen aquí apenas salen. Mientras, puedes buscar con tus filtros.'
                        : 'Agencies publish them on the marketplace and they show up here as soon as they do. Meanwhile, you can search with your own filters.'
                    }
                    action={{
                      label: locale === 'es' ? 'Buscar en el marketplace' : 'Search the marketplace',
                      // El marketplace se abre en OTRA pestaña (reunión 21-10): no pierde su portal.
                      onClick: () => window.open(RUTA_DEL_MARKETPLACE, '_blank', 'noopener,noreferrer'),
                    }}
                  />
                </div>
              ) : (
              <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {featuredProperties.map((property) => (
                  <StaggerItem key={property.id} className="flex">
                  <button
                    onClick={() => handleViewProperty(property)}
                    className="group relative overflow-hidden rounded-lg border border-border bg-surface hover:border-border transition-colors duration-slow text-left w-full"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <PortadaDelInmueble
                        property={property}
                        alt={property.title}
                        className="group-hover:scale-105 transition-transform duration-reveal"
                      />

                      {/*
                        Aquí iba una insignia "92% match". El número salía de
                        `92 - index * 5`: la posición en el arreglo, no un
                        cálculo. La primera tarjeta siempre decía 92%.

                        El match REAL existe y es del backend —`/recommendations`
                        devuelve `matchScore` y lo pinta `PropertyMatchCard`—
                        pero esta sección no usa ese endpoint, usa
                        `useFeaturedProperties`. Así que la insignia afirmaba
                        una afinidad que nadie midió. Fuera hasta que la sección
                        se conecte al motor (ver el handoff de Víctor).
                      */}

                      {/* Revisora r24 (bloqueante): aquí había un corazón de «guardar» que no hacía nada (sólo
                          detenía el clic). Un control muerto promete lo que no existe: fuera. */}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium text-fg group-hover:text-primary transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                        <p className="font-mono text-body tabular-nums text-fg whitespace-nowrap flex-shrink-0">
                          {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
                          {property.monthlyRent != null ? (
                            <>
                              {i18nFormatCurrency(property.monthlyRent)}
                              <span className="font-sans text-caption text-fg-muted"> {locale === 'es' ? 'al mes' : 'per month'}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>

                      <p className="text-sm text-fg-muted flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {[property.neighborhood, property.city].filter(Boolean).join(', ')}
                      </p>

                      {/* Sólo los datos que el inmueble trae: los migrados llegan
                          sin habitaciones, baños ni área, y las pastillas salían
                          «hab», «baños», «m²» sin número. */}
                      {(property.bedrooms != null || property.bathrooms != null || areaConocida(property.area)) && (
                        <div data-testid="datos-del-inmueble" className="flex items-center gap-2 pt-3 border-t border-border-faint">
                          {property.bedrooms != null && (
                            <span className="px-2.5 py-1 bg-surface-muted rounded-md text-caption text-fg-muted font-medium">
                              {property.bedrooms} {locale === 'es' ? 'hab' : 'bed'}
                            </span>
                          )}
                          {property.bathrooms != null && (
                            <span className="px-2.5 py-1 bg-surface-muted rounded-md text-caption text-fg-muted font-medium">
                              {property.bathrooms}{' '}
                              {locale === 'es'
                                ? property.bathrooms === 1
                                  ? 'baño'
                                  : 'baños'
                                : 'bath'}
                            </span>
                          )}
                          {areaConocida(property.area) && (
                            <span className="px-2.5 py-1 bg-surface-muted rounded-md text-caption text-fg-muted font-medium">
                              {formatArea(property.area)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  </StaggerItem>
                ))}
              </Stagger>
              )}
            </section>
            )}

            {/* GLOW UP (22-10): aquí iba «Todavía no te has postulado» con «Ver propiedades para mí», la misma
                salida del tope y de «Inmuebles para ti». Sus postulaciones siguen en «Buscar arriendo». */}
          </div>

          {/* Lateral: sólo lo que el riel no tiene (GLOW UP 22-10). Antes repetía «Pagar», «Estado de cuenta»,
              «Postulaciones» y «Mi perfil» (ya están en el riel y en «Tu arriendo»), con un consejo sobre un
              corazón que ya no existe y una tarjeta de ayuda aparte. */}
          <div className="space-y-6">
            {/* La calificación sólo cuando dice algo: «Sin evaluar» no resume nada (sigue en «Mi calificación»). */}
            {!esArrendatario && isPaid && score?.level && (
              <ScoreCard isPaid={isPaid} level={score.level} onClick={() => setScoreSheetOpen(true)} />
            )}

            <section className="rounded-lg border border-border bg-surface p-5" data-testid="atajos-del-inicio">
              <h2 className="mb-3 text-fg-subtle">
                <MonoLabel>{locale === 'es' ? 'Atajos' : 'Shortcuts'}</MonoLabel>
              </h2>
              <ul className="-mx-2 space-y-0.5">
                {(esArrendatario
                  ? [
                      {
                        href: '/inquilino/solicitudes?nueva=1',
                        icon: Wrench,
                        label: locale === 'es' ? 'Reportar un daño' : 'Report damage',
                        desc: locale === 'es' ? 'Le llega a tu inmobiliaria' : 'Goes to your property manager',
                      },
                      {
                        href: '/inquilino/mensajes?nuevo=1',
                        icon: ChatCircle,
                        label: locale === 'es' ? 'Escribirle a la inmobiliaria' : 'Message your property manager',
                        desc: locale === 'es' ? 'Un mensaje directo' : 'A direct message',
                      },
                    ]
                  : [
                      // Revisora r25: sin inmuebles para ti, el vacío de arriba ya ofrece buscar en el marketplace;
                      // el atajo no lo repite.
                      ...(featuredProperties.length > 0
                        ? [
                            {
                              // Buscar se hace en el marketplace, en OTRA pestaña (reunión 21-10).
                              href: RUTA_DEL_MARKETPLACE,
                              externo: true,
                              icon: MagnifyingGlass,
                              label: locale === 'es' ? 'Buscar en el marketplace' : 'Search the marketplace',
                              desc: locale === 'es' ? 'Con tus filtros, en otra pestaña' : 'With your filters, in a new tab',
                            },
                          ]
                        : []),
                      {
                        href: '/inquilino/guardados',
                        icon: Heart,
                        label: locale === 'es' ? 'Inmuebles guardados' : 'Saved properties',
                        desc: locale === 'es' ? 'Los que marcaste para comparar' : 'The ones you saved to compare',
                      },
                    ]
                ).concat([
                  {
                    href: '/ayuda',
                    icon: Question,
                    label: locale === 'es' ? 'Centro de ayuda' : 'Help center',
                    desc: locale === 'es' ? 'Respuestas y cómo contactarnos' : 'Answers and how to reach us',
                  },
                ] as { href: string; icon: typeof MagnifyingGlass; label: string; desc: string; externo?: boolean }[]).map((action) => (
                  <li key={action.href}>
                    {'externo' in action && action.externo ? (
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-muted"
                      >
                        <action.icon className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-fg group-hover:text-primary">{action.label}</span>
                          <span className="block truncate text-caption text-fg-muted">{action.desc}</span>
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={action.href}
                        className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-muted"
                      >
                        <action.icon className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-fg group-hover:text-primary">{action.label}</span>
                          <span className="block truncate text-caption text-fg-muted">{action.desc}</span>
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </motion.div>

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

/**
 * Lo que la persona tiene abierto con su inmobiliaria (casos) y en su búsqueda (postulaciones), en una
 * línea cada uno. Sólo lo que cuenta algo: sin casos ni postulaciones no se pinta nada.
 */
function LoAbierto({
  casos,
  postulaciones,
  es,
  testid,
}: {
  casos: number;
  postulaciones: number;
  es: boolean;
  testid: string;
}) {
  if (casos === 0 && postulaciones === 0) return null;
  const filas = [
    casos > 0 && {
      href: '/inquilino/casos',
      icon: ClipboardText,
      texto: es ? `${casos === 1 ? '1 caso abierto' : `${casos} casos abiertos`} con tu inmobiliaria` : `${casos} open cases`,
    },
    postulaciones > 0 && {
      href: '/inquilino/aplicaciones',
      icon: FileText,
      texto: es
        ? postulaciones === 1
          ? '1 postulación en curso'
          : `${postulaciones} postulaciones en curso`
        : `${postulaciones} applications in progress`,
    },
  ].filter(Boolean) as { href: string; icon: typeof FileText; texto: string }[];
  return (
    <div className={`grid grid-cols-1 gap-4 ${filas.length > 1 ? 'sm:grid-cols-2' : ''}`} data-testid={testid}>
      {filas.map((f) => (
        <Link key={f.href} href={f.href} className="group">
          <div className="flex h-full items-center gap-3 rounded-lg border border-border bg-surface p-5 transition-colors hover:bg-surface-muted">
            <f.icon className="h-5 w-5 flex-shrink-0 text-fg-muted" aria-hidden="true" />
            <p className="text-sm text-fg transition-colors group-hover:text-primary">{f.texto}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
