'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendUp, Shield, SealCheck, Funnel, CaretLeft, CaretRight, Lightning, Target, Trophy } from '@phosphor-icons/react';

import { IconButton } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import type { RecommendedProperty } from '@/lib/api/recommendations.service';
import { useTenantProfile, RISK_LEVEL_LABELS } from '@/lib/context/TenantProfileContext';
import { PropertyMatchCard } from '@/components/tenant/PropertyMatchCard';
import { TopeAprobadoBanner } from '@/components/tenant/TopeAprobadoBanner';
import { QueSignificaPostularse } from '@/components/tenant/QueSignificaPostularse';
import { CatalogoPorAprobacion } from '@/components/tenant/CatalogoPorAprobacion';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { superaReferencia } from '@/lib/api/aprobacion.service';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { formatCurrency } from '@/lib/format';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { useI18n } from '@/lib/i18n';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

// ============================================================================
// TextTs & Constants
// ============================================================================

type SortOption = 'match' | 'price_asc' | 'price_desc' | 'probability';
type ProbabilityFunnel = 'all' | 'alta' | 'media' | 'baja';

const ITEMS_PER_PAGE = 9;

// ============================================================================
// Component
// ============================================================================

export default function ParaTiPage() {
  const { t, locale } = useI18n();
  const { profile, hasVerifiedProfile, isLoading } = useTenantProfile();
  const { aprobacion, vigente: aprobacionVigente } = useAprobacion();
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [probabilityFunnel, setProbabilityFunnel] = useState<ProbabilityFunnel>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Property detail sheet state
  const [selectedMatch, setSelectedMatch] = useState<RecommendedProperty | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleViewProperty = (match: RecommendedProperty) => {
    setSelectedMatch(match);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
  };

  // Get all recommendations from backend (no limit)
  // `errorCrudo`: sin mirarlo, una consulta caída llegaba como `[]` y la
  // pantalla ofrecía «Limpiar filtros» —que no arregla un fallo de red— como
  // única salida.
  const {
    recommendations: allRecommendations,
    isLoading: recommendationsLoading,
    errorCrudo: errorRecomendaciones,
    refetch: recargarRecomendaciones,
  } = useRecommendations();

  /*
   * Lo que se pasa del tope NO se muestra. Decisión de negocio (2026-08-09).
   *
   * Antes se veía marcado con `SobreTopeOverlay`, contradiciendo al banner de
   * arriba, que ya prometía «te mostramos **solo** las propiedades que van
   * contigo». Mostrarle a alguien lo que no puede tomar es ofrecerle un camino
   * que la puerta de postularse le va a cerrar.
   *
   * Se filtra ACÁ y no al pintar: la paginación, el contador «mostrando X de
   * Y» y los indicadores cuelgan de esta lista. Filtrar abajo dejaba a los
   * números contando cosas que nadie ve.
   *
   * `superaReferencia` devuelve `null` cuando no se puede saber (sin tope), y
   * `!== true` lo conserva: no se le esconde algo a alguien por un dato que
   * todavía no tenemos.
   */
  const recomendacionesQueCaben = useMemo(() => {
    if (!aprobacionVigente) return allRecommendations;
    return allRecommendations.filter(
      (r) => superaReferencia(r.property.monthlyRent, aprobacion) !== true,
    );
  }, [allRecommendations, aprobacion, aprobacionVigente]);

  /** Cuántas se ocultaron, para poder decirlo en vez de encogerse en silencio. */
  const ocultasPorTope = allRecommendations.length - recomendacionesQueCaben.length;

  // Apply filters and sorting
  const filteredRecommendations = useMemo(() => {
    let results = [...recomendacionesQueCaben];

    // Funnel by probability
    if (probabilityFunnel !== 'all') {
      results = results.filter(r => r.acceptanceProbability === probabilityFunnel);
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        results.sort((a, b) => a.property.monthlyRent - b.property.monthlyRent);
        break;
      case 'price_desc':
        results.sort((a, b) => b.property.monthlyRent - a.property.monthlyRent);
        break;
      case 'probability':
        const probOrder = { alta: 0, media: 1, baja: 2 };
        results.sort((a, b) => probOrder[a.acceptanceProbability] - probOrder[b.acceptanceProbability]);
        break;
      case 'match':
      default:
        results.sort((a, b) => b.matchScore - a.matchScore);
    }

    return results;
  }, [recomendacionesQueCaben, sortBy, probabilityFunnel]);

  // Pagination
  const totalPages = Math.ceil(filteredRecommendations.length / ITEMS_PER_PAGE);
  const paginatedRecommendations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecommendations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecommendations, currentPage]);

  // Reset page when filters change
  const handleFunnelChange = (newFunnel: ProbabilityFunnel) => {
    setProbabilityFunnel(newFunnel);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  // Calculate stats
  const stats = useMemo(() => {
    // Sobre lo que se ve, no sobre lo que se trajo: un indicador que cuenta
    // propiedades ocultas es un número que nadie puede verificar en pantalla.
    const visibles = recomendacionesQueCaben;
    if (visibles.length === 0) return null;

    const highProbCount = visibles.filter(r => r.acceptanceProbability === 'alta').length;
    const mediumProbCount = visibles.filter(r => r.acceptanceProbability === 'media').length;
    const avgMatch = Math.round(
      visibles.reduce((sum, r) => sum + r.matchScore, 0) / visibles.length
    );
    const topMatch = visibles[0]?.matchScore || 0;

    return {
      total: visibles.length,
      highProb: highProbCount,
      mediumProb: mediumProbCount,
      avgMatch,
      topMatch,
    };
  }, [recomendacionesQueCaben]);

  /*
   * El catálogo por aprobación se decide ANTES del esqueleto de carga, y a
   * propósito: `CatalogoPorAprobacion` no usa las recomendaciones para nada
   * —trae sus propias propiedades— pero estaba detrás de `recommendationsLoading`,
   * así que el destino de todo el recorrido quedaba esperando a un endpoint del
   * motor viejo que no le aporta un solo dato. Medido en local: 1,6–3,1 s de
   * espera regalada, y si `/recommendations` se cae o se cuelga, el esqueleto
   * se queda para siempre justo después de prometerle su catálogo.
   */
  if ((!hasVerifiedProfile || !profile) && aprobacionVigente && aprobacion) {
    return <CatalogoPorAprobacion aprobacion={aprobacion} />;
  }

  // Loading state
  if (isLoading || recommendationsLoading) {
    return (
      <div className="min-h-screen bg-plan-page">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-surface-muted rounded w-48" />
            <div className="h-48 bg-surface-muted rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-surface-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // El fallo, antes del vacío: el vacío de esta pantalla habla de filtros, y
  // ofrecer «limpiar filtros» sobre una petición muerta es una salida que no
  // lleva a ningún lado.
  if (errorRecomendaciones) {
    return (
      <div className="min-h-screen bg-plan-page">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <FalloDeCarga
            error={errorRecomendaciones}
            queEs="las propiedades que te caben"
            onReintentar={recargarRecomendaciones}
          />
        </div>
      </div>
    );
  }

  /*
   * Tiene aprobación pero no perfil de scoring: es el caso de todo el que llega
   * por el recorrido nuevo. Antes caía en el vacío de abajo —"necesitamos
   * conocer tu perfil"— justo después de que se le prometiera su catálogo.
   * Su aprobación YA nos dice qué puede tomar; con eso alcanza.
   * (La decisión se toma arriba, antes del esqueleto; esto queda por si el
   * perfil se resuelve después de la primera pasada.)
   */
  if ((!hasVerifiedProfile || !profile) && aprobacionVigente && aprobacion) {
    return <CatalogoPorAprobacion aprobacion={aprobacion} />;
  }

  /*
   * Sin aprobación no hay con qué personalizar. Lo que se ofrece es **pedirla**,
   * que es exactamente lo que desbloquea esta pantalla.
   *
   * Antes decía "Completa una aplicación o solicita una evaluación" y el botón
   * secundario sacaba del panel a `/productos/inquilino`, una página de
   * marketing. Tres cosas mal en dos líneas:
   *
   *  · "aplicación" está muerta en toda la UI en español (se lee como *app*)
   *  · la "evaluación" es nuestro scoring A/B/C/D y NUNCA se le nombra al
   *    inquilino: arranca sola cuando se postula, no se pide
   *  · un inquilino con sesión no se manda a una landing de producto
   *
   * Ver `docs/VOCABULARIO.md` y el estado `sin_estudio` de /inquilino/aprobacion,
   * que dice lo mismo con las mismas palabras.
   */
  if (!hasVerifiedProfile || !profile) {
    return (
      <div className="min-h-screen bg-plan-page">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link
            href="/inquilino"
            className="inline-flex items-center gap-2 text-sm text-plan-secondary hover:text-plan-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Volver a Inicio' : 'Back to Home'}
          </Link>

          <div className="rounded-xl bg-surface border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-fg mb-3">
              {locale === 'es'
                ? 'Todavía no tenemos tu aprobación'
                : 'We don\u2019t have your approval yet'}
            </h1>
            <p className="text-sm text-fg-muted max-w-md mx-auto mb-6 leading-relaxed">
              {locale === 'es'
                ? 'Con ella sabemos hasta cuánto te respaldan las aseguradoras, y acá te mostramos solo las propiedades que puedes tomar.'
                : 'With it we know how much the insurers back you, and here we show you only the properties you can take.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild>
                <Link href="/aprobacion">
                  {locale === 'es'
                    ? 'Conoce hasta cuánto te arrendamos'
                    : 'Find out how much you can rent'}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/inquilino/explorar">
                  {locale === 'es' ? 'Explorar propiedades' : 'Explore properties'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const riskLevel = profile.riskLevel || 'B';
  const primerNombre = profile.fullName.split(' ')[0];
  /** Lo que de verdad cabe en el tope. Es el número del hero: se cuenta, no se supone. */
  const cuantasCaben = recomendacionesQueCaben.length;

  /* Chips del hero. Sobre cobalto solo hay un acento: el blanco.
     Los iconos iban antes en `text-success` / `text-primary`, que sobre este
     fondo miden 1,32:1 y 1,00:1 — el escudo era literalmente invisible. */
  const chipDelHero =
    'flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white';

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/inquilino"
          className="inline-flex items-center gap-2 text-sm text-plan-secondary hover:text-plan-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'es' ? 'Volver a Inicio' : 'Back to Home'}
        </Link>

        {/*
          * Hero de marca.
          *
          * `bg-brand` y no `bg-primary`: en tema oscuro `--primary` se vuelve
          * `--indigo-300` (#8A9FFF) y el texto blanco encima queda en **2,48:1**
          * —ilegible—. `--brand` resuelve a cobalto fijo (#0040FF) en los dos
          * temas, y ahí el blanco mide 6,61:1.
          *
          * El número de la derecha era `getAccessiblePropertiesPercentage()`, una
          * tabla fija por letra de score (A=95, B=85, C=60, D=30) que no mira el
          * catálogo. Se anunciaba «95% de propiedades accesibles» justo encima de
          * «0 propiedades encontradas»: la pantalla se desmentía sola. Ahora
          * muestra el conteo real, que puede ser cero y entonces lo dice.
          */}
        <section className="rounded-xl bg-brand p-8 sm:p-10 mb-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-overline text-white/80">
                {locale === 'es' ? 'Tu catálogo' : 'Your catalog'}
              </p>

              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-white text-balance">
                {locale === 'es'
                  ? `Propiedades para ti, ${primerNombre}`
                  : `Properties for you, ${primerNombre}`}
              </h1>

              {/* Una línea, no un párrafo: el desglose del cálculo ya vive
                  completo en «Cómo calculamos tu compatibilidad», al pie. */}
              <p className="mt-2 text-sm text-white/80">
                {locale === 'es'
                  ? 'Solo las que caben en tu tope aprobado, ordenadas por qué tan bien van contigo.'
                  : 'Only the ones that fit your approved cap, sorted by how well they match you.'}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2">
                <div className={chipDelHero}>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white font-mono text-[10px] font-bold text-brand">
                    {riskLevel}
                  </span>
                  <span>Score {RISK_LEVEL_LABELS[riskLevel]}</span>
                </div>

                <div className={chipDelHero}>
                  <TrendUp className="h-3.5 w-3.5 text-white/90" />
                  <span>
                    {locale === 'es' ? 'Disponible' : 'Available'}:{' '}
                    <span className="font-mono tabular-nums">
                      {formatCurrency(profile.availableForRent)}
                    </span>
                    /{locale === 'es' ? 'mes' : 'mo'}
                  </span>
                </div>

                {profile.contractType === 'indefinite' && (
                  <div className={chipDelHero}>
                    <Shield className="h-3.5 w-3.5 text-white/90" />
                    <span>{locale === 'es' ? 'Contrato indefinido' : 'Permanent contract'}</span>
                  </div>
                )}

                {profile.hasIncomeProof && profile.hasEmploymentLetter && (
                  <div className={chipDelHero}>
                    <SealCheck className="h-3.5 w-3.5 text-white/90" />
                    <span>
                      {locale === 'es' ? 'Documentación completa' : 'Complete documentation'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* El conteo real. Se ve en móvil también: antes era `hidden lg:flex`
                y el único indicador del hero desaparecía en pantalla chica. */}
            <div className="flex items-center gap-4 border-t border-white/15 pt-6 lg:flex-col lg:items-end lg:gap-1 lg:border-t-0 lg:pt-0 lg:text-right">
              <span className="font-mono tabular-nums text-5xl font-semibold leading-none text-white">
                {cuantasCaben}
              </span>
              <span className="text-sm text-white/80 lg:max-w-[8.5rem]">
                {locale === 'es'
                  ? cuantasCaben === 1
                    ? 'propiedad cabe en tu tope'
                    : 'propiedades caben en tu tope'
                  : cuantasCaben === 1
                    ? 'property fits your cap'
                    : 'properties fit your cap'}
              </span>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        {stats && (
          <PlanStatsGrid columns={4} className="mb-6">
            <PlanStatsCard
              label={locale === 'es' ? 'Compatibles' : 'Compatible'}
              value={stats.total}
              sublabel={locale === 'es' ? 'Propiedades para ti' : 'Properties for you'}
              icon={Target}
            />
            <PlanStatsCard
              label={locale === 'es' ? 'Alta probabilidad' : 'High probability'}
              value={stats.highProb}
              sublabel={locale === 'es' ? 'Chances excelentes' : 'Excellent chances'}
              icon={Lightning}
            />
            <PlanStatsCard
              label={locale === 'es' ? 'Mejor match' : 'Best match'}
              value={`${stats.topMatch}%`}
              sublabel={locale === 'es' ? 'Tu top propiedad' : 'Your top property'}
              icon={Trophy}
            />
            <PlanStatsCard
              label={locale === 'es' ? 'Match promedio' : 'Average match'}
              value={`${stats.avgMatch}%`}
              sublabel={locale === 'es' ? 'Compatibilidad media' : 'Medium compatibility'}
              icon={TrendUp}
              variant="accent"
            />
          </PlanStatsGrid>
        )}

        {/* Funnels Bar */}
        <div className="bg-surface border border-plan-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-plan-secondary">
              <span className="font-mono tabular-nums font-medium text-plan-primary">{filteredRecommendations.length}</span> {locale === 'es' ? 'propiedades encontradas' : 'properties found'}
            </p>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown — los filtros son píldoras (DESIGN.md §15). */}
              <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger
                  className="h-9 w-auto gap-2 rounded-full bg-surface border-border text-plan-primary hover:bg-surface-muted"
                  aria-label={locale === 'es' ? 'Ordenar' : 'Sort'}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">{locale === 'es' ? 'Mayor coincidencia' : 'Best match'}</SelectItem>
                  <SelectItem value="probability">{locale === 'es' ? 'Mayor probabilidad' : 'Highest probability'}</SelectItem>
                  <SelectItem value="price_asc">{locale === 'es' ? 'Menor precio' : 'Lowest price'}</SelectItem>
                  <SelectItem value="price_desc">{locale === 'es' ? 'Mayor precio' : 'Highest price'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Probability Funnel */}
              <Select value={probabilityFunnel} onValueChange={(v) => handleFunnelChange(v as ProbabilityFunnel)}>
                <SelectTrigger
                  className="h-9 w-auto gap-2 rounded-full bg-surface border-border text-plan-primary hover:bg-surface-muted"
                  aria-label={locale === 'es' ? 'Filtrar por probabilidad' : 'Filter by probability'}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === 'es' ? 'Todas' : 'All'}</SelectItem>
                  <SelectItem value="alta">{locale === 'es' ? 'Alta probabilidad' : 'High probability'}</SelectItem>
                  <SelectItem value="media">{locale === 'es' ? 'Probabilidad media' : 'Medium probability'}</SelectItem>
                  <SelectItem value="baja">{locale === 'es' ? 'Baja probabilidad' : 'Low probability'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* El tope aprobado, siempre a la vista: es lo que vuelve personal al catálogo. */}
        <TopeAprobadoBanner aprobacion={aprobacion} vigente={aprobacionVigente} className="mb-4" />

        {/* Por qué este catálogo es suyo, y qué significa postularse. Solo tiene
            sentido cuando hay aprobación vigente: sin ella no hay catálogo
            propio del que hablar, y el banner de arriba ya invita a conseguirla. */}
        {aprobacionVigente && <QueSignificaPostularse className="mb-6" />}

        {/* Ocultamos, pero lo decimos. Un catálogo que encoge en silencio se
            lee como «no hay nada», que es una cosa muy distinta. */}
        {ocultasPorTope > 0 && (
          <p className="mb-4 text-sm text-plan-secondary">
            {locale === 'es' ? (
              <>
                No te mostramos{' '}
                <span className="font-mono tabular-nums">{ocultasPorTope}</span>{' '}
                {ocultasPorTope === 1 ? 'propiedad que se pasa' : 'propiedades que se pasan'} de tu
                tope.
              </>
            ) : (
              <>
                <span className="font-mono tabular-nums">{ocultasPorTope}</span>{' '}
                {ocultasPorTope === 1 ? 'property is' : 'properties are'} above your cap and not
                shown.
              </>
            )}
          </p>
        )}

        {/* Properties Grid */}
        {paginatedRecommendations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {/* Sin marcar nada: lo que se pasa del tope ya no llegó hasta acá. */}
              {paginatedRecommendations.map((match) => (
                <PropertyMatchCard
                  key={match.property.id}
                  match={match}
                  onViewProperty={() => handleViewProperty(match)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-surface border border-plan-border rounded-lg p-4">
                <p className="text-sm text-plan-muted">
                  {locale === 'es' ? 'Mostrando' : 'Showing'}{' '}
                  <span className="font-mono tabular-nums">
                    {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecommendations.length)}
                  </span>{' '}
                  {locale === 'es' ? 'de' : 'of'}{' '}
                  <span className="font-mono tabular-nums">{filteredRecommendations.length}</span>
                </p>

                <div className="flex items-center gap-1">
                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-full border border-plan-border',
                      currentPage === 1
                        ? 'text-plan-muted cursor-not-allowed bg-surface-muted'
                        : 'text-plan-secondary hover:bg-surface-muted hover:text-plan-primary'
                    )}
                    aria-label={locale === 'es' ? 'Página anterior' : 'Previous page'}
                    icon={<CaretLeft className="w-4 h-4" />}
                  />

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and neighbors
                    const showPage = page === 1 ||
                                    page === totalPages ||
                                    Math.abs(page - currentPage) <= 1;
                    const showEllipsis = (page === 2 && currentPage > 3) ||
                                        (page === totalPages - 1 && currentPage < totalPages - 2);

                    if (!showPage && !showEllipsis) return null;

                    if (showEllipsis && !showPage) {
                      return (
                        <span key={page} className="px-2 text-plan-muted">...</span>
                      );
                    }

                    return (
                      <Button
                        key={page}
                        variant="ghost"
                        hideArrow
                        onClick={() => setCurrentPage(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={cn(
                          'min-w-[36px] h-9 px-3 rounded-full border text-sm font-medium font-mono tabular-nums',
                          currentPage === page
                            ? 'bg-primary border-primary text-primary-fg'
                            : 'border-plan-border text-plan-secondary hover:bg-surface-muted hover:text-plan-primary'
                        )}
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-2 rounded-full border border-plan-border',
                      currentPage === totalPages
                        ? 'text-plan-muted cursor-not-allowed bg-surface-muted'
                        : 'text-plan-secondary hover:bg-surface-muted hover:text-plan-primary'
                    )}
                    aria-label={locale === 'es' ? 'Página siguiente' : 'Next page'}
                    icon={<CaretRight className="w-4 h-4" />}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-surface border border-plan-border rounded-lg p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
              <Funnel className="w-7 h-7 text-plan-muted" />
            </div>
            <h3 className="text-base font-semibold text-plan-primary mb-2">
              {/* Quedarse sin nada por el tope no es quedarse sin nada por un
                  filtro que uno mismo puso: se explica distinto. */}
              {ocultasPorTope > 0 && recomendacionesQueCaben.length === 0
                ? locale === 'es'
                  ? 'Ninguna propiedad cabe en tu tope ahora mismo'
                  : 'No properties fit your cap right now'
                : locale === 'es'
                  ? 'No hay propiedades con estos filtros'
                  : 'No properties with these filters'}
            </h3>
            <p className="text-sm text-plan-secondary mb-4">
              {locale === 'es' ? 'Intenta ajustar los filtros para ver más opciones' : 'Try adjusting filters to see more options'}
            </p>
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={() => {
                handleSortChange('match');
                handleFunnelChange('all');
              }}
              className="text-primary hover:text-primary"
            >
              {locale === 'es' ? 'Limpiar filtros' : 'Clear filters'}
            </Button>
          </div>
        )}

        {/* How it works section */}
        <div className="mt-8 bg-surface border border-plan-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-plan-border">
            <h2 className="font-semibold text-plan-primary">
              {locale === 'es' ? 'Cómo calculamos tu compatibilidad' : 'How we calculate your compatibility'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-plan-border">
            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold font-mono tabular-nums text-success">40%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Asequibilidad' : 'Affordability'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Comparamos el arriendo con tu ingreso disponible' : 'We compare rent with your available income'}
              </p>
            </div>

            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold font-mono tabular-nums text-primary">30%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Compatibilidad' : 'Compatibility'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Tu score de riesgo vs requisitos del propietario' : 'Your risk score vs landlord requirements'}
              </p>
            </div>

            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold font-mono tabular-nums text-fg-muted">15%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Perfil' : 'Profile'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Documentación completa y estabilidad laboral' : 'Complete documentation and job stability'}
              </p>
            </div>

            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold font-mono tabular-nums text-warning">15%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Preferencias' : 'Preferences'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Ciudad, tipo de propiedad y habitaciones' : 'City, property type and bedrooms'}
              </p>
            </div>
          </div>
        </div>

        {/* Improve Profile CTA */}
        <div className="mt-6 bg-primary-soft border border-border rounded-lg p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-plan-primary mb-0.5">
              {locale === 'es' ? '¿Quieres acceder a más propiedades?' : 'Want to access more properties?'}
            </h3>
            <p className="text-sm text-plan-secondary">
              {locale === 'es' ? 'Mejora tu perfil agregando documentación adicional o un codeudor' : 'Improve your profile by adding additional documentation or a co-signer'}
            </p>
          </div>
          {/* Botón del DS: píldora, sentence case. Antes era un <Link> con
              `bg-primary text-white` a mano — en oscuro ese par mide 2,48:1. */}
          <Button asChild className="shrink-0">
            <Link href="/inquilino/perfil">
              {locale === 'es' ? 'Mejorar perfil' : 'Improve profile'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Property Detail Sheet */}
      <PropertyDetailSheet
        property={selectedMatch?.property ?? null}
        open={sheetOpen}
        onClose={handleCloseSheet}
        matchData={
          selectedMatch
            ? {
                matchScore: selectedMatch.matchScore,
                acceptanceProbability: selectedMatch.acceptanceProbability,
                recommendation: selectedMatch.recommendation,
              }
            : undefined
        }
      />
    </div>
  );
}
