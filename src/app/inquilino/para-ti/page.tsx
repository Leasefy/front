'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkle, ArrowLeft, TrendUp, Shield, SealCheck, Funnel, CaretLeft, CaretRight, Crosshair, Lightning, Medal, GridFour, List, Target, Trophy } from '@phosphor-icons/react';

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
import {
  useTenantProfile,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
  getAccessiblePropertiesPercentage,
} from '@/lib/context/TenantProfileContext';
import { PropertyMatchCard } from '@/components/tenant/PropertyMatchCard';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { formatCurrency } from '@/lib/format';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { useI18n } from '@/lib/i18n';

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
  const { recommendations: allRecommendations, isLoading: recommendationsLoading } = useRecommendations();

  // Apply filters and sorting
  const filteredRecommendations = useMemo(() => {
    let results = [...allRecommendations];

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
  }, [allRecommendations, sortBy, probabilityFunnel]);

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
    if (allRecommendations.length === 0) return null;

    const highProbCount = allRecommendations.filter(r => r.acceptanceProbability === 'alta').length;
    const mediumProbCount = allRecommendations.filter(r => r.acceptanceProbability === 'media').length;
    const avgMatch = Math.round(
      allRecommendations.reduce((sum, r) => sum + r.matchScore, 0) / allRecommendations.length
    );
    const topMatch = allRecommendations[0]?.matchScore || 0;

    return {
      total: allRecommendations.length,
      highProb: highProbCount,
      mediumProb: mediumProbCount,
      avgMatch,
      topMatch,
    };
  }, [allRecommendations]);

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

  // No profile state
  if (!hasVerifiedProfile || !profile) {
    return (
      <div className="min-h-screen bg-plan-page">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link
            href="/inquilino"
            className="inline-flex items-center gap-2 text-sm text-plan-secondary hover:text-plan-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'es' ? 'Volver al panel' : 'Back to dashboard'}
          </Link>

          <div className="bg-surface border border-plan-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center mx-auto mb-6">
              <Sparkle className="w-8 h-8 text-[#1A40FF]" />
            </div>
            <h1 className="text-xl font-semibold text-plan-primary mb-3">
              {locale === 'es' ? 'Recomendaciones personalizadas' : 'Personalized recommendations'}
            </h1>
            <p className="text-sm text-plan-secondary max-w-md mx-auto mb-6">
              {locale === 'es'
                ? 'Para mostrarte propiedades donde tienes alta probabilidad de ser aceptado, necesitamos conocer tu perfil. Completa una aplicación o solicita una evaluación.'
                : 'To show you properties where you have a high probability of being accepted, we need to know your profile. Complete an application or request an evaluation.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/inquilino/explorar"
                className="px-5 py-2 bg-[#1A40FF] text-white text-sm font-medium hover:opacity-90 transition-colors"
              >
                {locale === 'es' ? 'Explorar propiedades' : 'Explore properties'}
              </Link>
              <Link
                href="/productos/evaluacion"
                className="px-5 py-2 border border-plan-border text-plan-primary text-sm font-medium hover:bg-surface-muted transition-colors"
              >
                {locale === 'es' ? 'Solicitar evaluación' : 'Request evaluation'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const riskLevel = profile.riskLevel || 'B';
  const riskColors = RISK_LEVEL_COLORS[riskLevel];
  const accessPercentage = getAccessiblePropertiesPercentage(riskLevel);

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/inquilino"
          className="inline-flex items-center gap-2 text-sm text-plan-secondary hover:text-plan-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'es' ? 'Volver al panel' : 'Back to dashboard'}
        </Link>

        {/* Hero Section - Clean PLan style */}
        <div className="bg-[#1A40FF] p-8 mb-6">
          <div className="flex items-start justify-between gap-8">
            {/* Left Content */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#B7791F]/20 flex items-center justify-center">
                  <Sparkle className="w-5 h-5 text-[#B7791F]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">
                    {locale === 'es'
                      ? `Propiedades para ti, ${profile.fullName.split(' ')[0]}`
                      : `Properties for you, ${profile.fullName.split(' ')[0]}`}
                  </h1>
                  <p className="text-sm text-white/60">
                    {locale === 'es' ? 'Basado en tu perfil verificado' : 'Based on your verified profile'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/70 max-w-lg mb-6">
                {locale === 'es'
                  ? 'Analizamos tu información financiera, historial laboral y documentación para encontrar propiedades donde tienes las mejores probabilidades de ser aceptado.'
                  : 'We analyze your financial information, employment history, and documentation to find properties where you have the best chances of being accepted.'}
              </p>

              {/* Profile Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                  'bg-surface/10 border border-white/10'
                )}>
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    riskLevel === 'A' ? 'bg-[#2C7A53] text-white' :
                    riskLevel === 'B' ? 'bg-[#1A40FF] text-white' :
                    riskLevel === 'C' ? 'bg-[#B7791F] text-white' :
                    'bg-[#C4503B] text-white'
                  )}>
                    {riskLevel}
                  </span>
                  <span className="text-white/90">Score {RISK_LEVEL_LABELS[riskLevel]}</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 border border-white/10 text-sm">
                  <TrendUp className="w-3.5 h-3.5 text-[#2C7A53]" />
                  <span className="text-white/90">
                    {locale === 'es' ? 'Disponible' : 'Available'}: {formatCurrency(profile.availableForRent)}/{locale === 'es' ? 'mes' : 'mo'}
                  </span>
                </div>

                {profile.contractType === 'indefinite' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 border border-white/10 text-sm">
                    <Shield className="w-3.5 h-3.5 text-[#1A40FF]" />
                    <span className="text-white/90">
                      {locale === 'es' ? 'Contrato indefinido' : 'Permanent contract'}
                    </span>
                  </div>
                )}

                {profile.hasIncomeProof && profile.hasEmploymentLetter && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 border border-white/10 text-sm">
                    <SealCheck className="w-3.5 h-3.5 text-fg-muted dark:text-fg-subtle" />
                    <span className="text-white/90">
                      {locale === 'es' ? 'Documentación completa' : 'Complete documentation'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right - Access Percentage */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-surface/5 border border-white/10 px-8 py-6 min-w-[160px]">
              <span className="text-5xl font-bold text-[#B7791F] tracking-tight">
                {accessPercentage}%
              </span>
              <span className="text-xs text-white/60 mt-1 text-center">
                {locale === 'es' ? 'de propiedades' : 'of properties'}<br />{locale === 'es' ? 'accesibles' : 'accessible'}
              </span>
            </div>
          </div>
        </div>

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
        <div className="bg-surface border border-plan-border p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-plan-secondary">
              <span className="font-medium text-plan-primary">{filteredRecommendations.length}</span> {locale === 'es' ? 'propiedades encontradas' : 'properties found'}
            </p>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger
                  className="h-9 w-auto gap-2 rounded-none bg-surface-muted border-plan-border text-plan-primary"
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
                  className="h-9 w-auto gap-2 rounded-none bg-surface-muted border-plan-border text-plan-primary"
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

        {/* Properties Grid */}
        {paginatedRecommendations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
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
              <div className="flex items-center justify-between bg-surface border border-plan-border p-4">
                <p className="text-sm text-plan-muted">
                  {locale === 'es' ? 'Mostrando' : 'Showing'} {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecommendations.length)} {locale === 'es' ? 'de' : 'of'} {filteredRecommendations.length}
                </p>

                <div className="flex items-center gap-1">
                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-none border border-plan-border',
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
                          'min-w-[36px] h-9 px-3 rounded-none border text-sm font-medium',
                          currentPage === page
                            ? 'bg-[#1A40FF] border-[#1A40FF]/30 text-white'
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
                      'p-2 rounded-none border border-plan-border',
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
          <div className="bg-surface border border-plan-border p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
              <Funnel className="w-7 h-7 text-plan-muted" />
            </div>
            <h3 className="text-base font-semibold text-plan-primary mb-2">
              {locale === 'es' ? 'No hay propiedades con estos filtros' : 'No properties with these filters'}
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
              className="text-[#1A40FF] hover:text-[#1A40FF]"
            >
              {locale === 'es' ? 'Limpiar filtros' : 'Clear filters'}
            </Button>
          </div>
        )}

        {/* How it works section */}
        <div className="mt-8 bg-surface border border-plan-border">
          <div className="px-5 py-4 border-b border-plan-border">
            <h2 className="font-semibold text-plan-primary">
              {locale === 'es' ? 'Cómo calculamos tu compatibilidad' : 'How we calculate your compatibility'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-plan-border">
            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-[#2C7A53]">40%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Asequibilidad' : 'Affordability'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Comparamos el arriendo con tu ingreso disponible' : 'We compare rent with your available income'}
              </p>
            </div>

            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-[#1A40FF]">30%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Compatibilidad' : 'Compatibility'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Tu score de riesgo vs requisitos del propietario' : 'Your risk score vs landlord requirements'}
              </p>
            </div>

            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-fg-muted dark:text-fg-subtle">15%</span>
              </div>
              <h3 className="text-sm font-medium text-plan-primary mb-1">
                {locale === 'es' ? 'Perfil' : 'Profile'}
              </h3>
              <p className="text-xs text-plan-muted">
                {locale === 'es' ? 'Documentación completa y estabilidad laboral' : 'Complete documentation and job stability'}
              </p>
            </div>

            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-[#B7791F]">15%</span>
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
        <div className="mt-6 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-plan-primary mb-0.5">
              {locale === 'es' ? '¿Quieres acceder a más propiedades?' : 'Want to access more properties?'}
            </h3>
            <p className="text-sm text-plan-secondary">
              {locale === 'es' ? 'Mejora tu perfil agregando documentación adicional o un codeudor' : 'Improve your profile by adding additional documentation or a co-signer'}
            </p>
          </div>
          <Link
            href="/inquilino/perfil"
            className="px-5 py-2 bg-[#1A40FF] text-white text-sm font-medium hover:opacity-90 transition-colors flex-shrink-0"
          >
            {locale === 'es' ? 'Mejorar perfil' : 'Improve profile'}
          </Link>
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
