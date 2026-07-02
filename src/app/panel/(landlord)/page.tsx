'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Buildings, Users, Clock, WarningCircle, CurrencyDollar, House, TrendUp, Calendar, ArrowUpRight, CaretDown, CaretRight, PencilLine, CreditCard, UserCheck, CalendarCheck, CalendarBlank, MapPin, Phone, Chat, X, Plus, Eye, FileText, ChartBarHorizontal, ChartBar, Wallet, Bell, CheckCircle, Star, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { BrandDot, BrandContour, MonoLabel, StatusBadge, SEMANTIC, type SemanticTone } from '@/components/brand';
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
import type { LandlordProperty } from '@/lib/types/landlord';
import type { DashboardUrgentAction, DashboardUpcomingEvent, DashboardData } from '@/lib/api/landlord.types';

const ACTION_ICONS: Record<DashboardUrgentAction['type'], React.ElementType> = {
  signature: FileText,
  late_payment: CreditCard,
  pending_review: UserCheck,
  ending_lease: CalendarCheck,
  pending_visit: CalendarBlank,
};

function UrgentActionsBanner({ actions }: { actions: DashboardUrgentAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  // Priority → semantic tone: high=critical, medium=warning, low=neutral (gray, not blue).
  const PRIORITY_TONE: Record<string, SemanticTone> = { high: 'critical', medium: 'warning', low: 'neutral' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-xl bg-surface border border-border overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-white/[0.04] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: SEMANTIC.warning.soft }}
        >
          <WarningCircle className="w-5 h-5" style={{ color: SEMANTIC.warning.fg }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-fg">
            {t('landlord.dashboard.pendingActions', { count: actions.length })}
          </p>
          <p className="text-xs text-fg-muted">
            {actions[0]?.description}
          </p>
        </div>
        <CaretDown className={cn(
          'w-5 h-5 text-neutral-400 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.type] || WarningCircle;
            const tone = PRIORITY_TONE[action.priority] ?? 'neutral';
            const c = SEMANTIC[tone];
            return (
              <Link
                key={action.id}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-faint hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-white/[0.04] transition-colors"
              >
                <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.soft }}>
                  <Icon className="w-4 h-4" style={{ color: c.fg }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">{action.title}</p>
                  <p className="text-xs text-fg-muted">{action.description}</p>
                </div>
                <span
                  className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
                  style={{ backgroundColor: c.soft, color: c.fg }}
                >
                  {action.count}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Landlord Dashboard Page - Modern Landing Page Style
 */
export default function PanelPage() {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const { t, locale, formatCurrency: i18nFormatCurrency, formatDate: i18nFormatDate } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstName = user?.name?.split(' ')[0] || t('landlord.dashboard.defaultName');
  const { getUpcoming: getUpcomingVisitsFromApi } = useVisits();

  // ALL hooks must be called before any conditional returns (React rules of hooks)
  const { properties: apiProperties, isLoading: propertiesLoading } = useLandlordProperties();
  const { dashboard, isLoading: dashboardLoading } = useLandlordDashboard();

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
      monthlyIncome: properties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0),
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div>
            <span className="inline-flex items-center gap-2 mb-2">
              <BrandDot />
              <MonoLabel className="text-[11px] font-medium text-primary">
                {greeting}
              </MonoLabel>
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-fg tracking-tight">
              {t('dashboard.hello', { name: firstName })}
            </h1>
          </div>
        </motion.header>

        {/* Stats Grid - Landing Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Monthly Income - Featured Card (ink brand hero) */}
          <div
            className="sm:col-span-2 lg:col-span-1 relative overflow-hidden rounded-xl p-6"
            style={{ background: 'linear-gradient(150deg, #14130f 58%, #2a2824 135%)', boxShadow: '0 10px 30px -6px rgba(26,64,255,0.30)' }}
          >
            {/* Brand contour — single hairline tracing the roof profile (badge grammar) */}
            <div className="absolute -inset-x-1 top-[34%] h-[44%] text-white/[0.14] pointer-events-none">
              <BrandContour />
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                <CurrencyDollar className="w-5 h-5 text-white/90" />
              </div>
              {!isLoading && (
                <span className="px-2.5 py-1 text-white/90 text-xs font-medium rounded-full flex items-center gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                  <TrendUp className="w-3 h-3" weight="bold" />
                  +12%
                </span>
              )}
            </div>
            <MonoLabel className="block text-[11px] font-medium text-white/55 mb-1.5">{t('landlord.dashboard.monthlyIncome')}</MonoLabel>
            {isLoading ? (
              <Skeleton className="h-9 w-36 rounded-md bg-white/10" />
            ) : (
              <p className="font-heading text-[28px] font-semibold text-white tracking-tight tabular-nums leading-none">
                {i18nFormatCurrency(dashboardData.financial.monthlyIncome)}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-24 mt-2 rounded bg-white/10" />
            ) : (
              <p className="text-sm text-white/70 mt-2">
                {t('landlord.dashboard.activeLeases', { count: dashboardData.financial.activeLeases })}
              </p>
            )}
          </div>

          {/* Properties */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <Buildings className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-sm text-fg-muted mb-1">{t('landlord.dashboard.properties')}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-12 rounded-md" />
            ) : (
              <p className="text-3xl font-bold text-fg tracking-tight">
                {properties.length}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-20 mt-2 rounded" />
            ) : (
              <p className="text-sm text-fg-muted mt-2">
                {dashboardData.financial.activeLeases} {t('landlord.dashboard.rented')}
              </p>
            )}
          </div>

          {/* Candidates */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-sm text-fg-muted mb-1">{t('landlord.dashboard.candidates')}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-12 rounded-md" />
            ) : (
              <p className="text-3xl font-bold text-fg tracking-tight">
                {totalCandidates}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-28 mt-2 rounded" />
            ) : (
              <p className="text-sm text-fg-muted mt-2">
                {pendingReviews > 0 && (
                  <span className="font-medium text-warning">{t('landlord.dashboard.pendingCount', { count: pendingReviews })}</span>
                )}
                {pendingReviews === 0 && t('landlord.dashboard.allReviewed')}
              </p>
            )}
          </div>

          {/* Collection Rate */}
          <div className="rounded-xl bg-surface-muted p-6">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4">
              <ChartBar className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-sm text-fg-muted mb-1">{t('landlord.dashboard.collectionRate')}</p>
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 mt-2 rounded" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className="font-heading text-3xl font-semibold text-fg tracking-tight tabular-nums">
                    {dashboardData.financial.collectionRate}%
                  </p>
                  <StatusBadge tone="success" dot={false}>
                    {t('landlord.dashboard.excellent')}
                  </StatusBadge>
                </div>
                <p className="text-sm text-fg-muted mt-2">
                  {t('landlord.dashboard.thisMonth')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Urgent Actions Banner */}
        {dashboardData.urgentActions.length > 0 && (
          <UrgentActionsBanner actions={dashboardData.urgentActions} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Properties Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-fg">{t('landlord.dashboard.myProperties')}</h2>
                <Link
                  href="/panel/propiedades"
                  className="text-sm text-fg-muted hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  {t('landlord.dashboard.viewAll')}
                  <CaretRight className="w-4 h-4" />
                </Link>
              </div>

              {propertiesLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl bg-surface-muted overflow-hidden">
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
                            <Skeleton className="h-8 w-16 rounded-xl" />
                            <Skeleton className="h-8 w-24 rounded-xl" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div className="space-y-4">
                  {properties.slice(0, 3).map((property, index) => {
                    const riskDist = calculateRiskDistribution(property);
                    const totalRisk = riskDist.levelA + riskDist.levelB + riskDist.levelC + riskDist.levelD;
                    const goodCandidatePercent = totalRisk > 0
                      ? Math.round(((riskDist.levelA + riskDist.levelB) / totalRisk) * 100)
                      : 0;

                    return (
                      <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Link href={`/panel/${property.id}`}>
                          <div className="group relative overflow-hidden rounded-xl bg-surface-muted hover: transition-all duration-300">
                            <div className="flex flex-col sm:flex-row">
                              {/* Image */}
                              <div className="relative w-full sm:w-48 h-36 sm:h-auto flex-shrink-0">
                                <Image
                                  src={property.thumbnailUrl}
                                  alt={property.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-500"
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
                                    <h3 className="text-lg font-semibold text-fg group-hover:text-primary transition-colors">
                                      {property.title}
                                    </h3>
                                    <p className="text-sm text-fg-muted mt-0.5 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {property.neighborhood}, {property.city}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-fg">
                                      {i18nFormatCurrency(property.monthlyRent)}
                                    </p>
                                    <p className="text-xs text-fg-muted">/{t('landlord.dashboard.perMonth')}</p>
                                  </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface rounded-xl">
                                    <Users className="w-4 h-4 text-fg-muted" />
                                    <span className="text-sm text-fg-muted font-medium">
                                      {property.candidateCount}
                                    </span>
                                  </div>

                                  {property.candidateCount > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-2 bg-surface-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{
                                            width: `${goodCandidatePercent}%`,
                                            backgroundColor: goodCandidatePercent >= 50 ? SEMANTIC.success.fg : SEMANTIC.warning.fg,
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs text-fg-muted">
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
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl bg-surface-muted py-14 px-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center mx-auto mb-5">
                    <Buildings className="w-6 h-6 text-fg-subtle" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">
                    {t('landlord.dashboard.noPublishedProperties')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                    {t('landlord.dashboard.publishFirstProperty')}
                  </p>
                  <Link
                    href="/publicar?from=panel"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-full hover:opacity-90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('landlord.dashboard.publishProperty')}
                  </Link>
                </div>
              )}

              {/* Show "Ver todas" when there are more than 3 properties */}
              {properties.length > 3 && (
                <Link
                  href="/panel/propiedades"
                  className="flex items-center justify-center gap-2 mt-4 px-5 py-3 rounded-xl border border-border text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('landlord.dashboard.viewAllProperties')}
                  <span className="px-2 py-0.5 bg-surface-muted rounded-full text-xs">
                    {t('landlord.dashboard.moreCount', { count: properties.length - 3 })}
                  </span>
                </Link>
              )}
            </motion.section>

            {/* Recent Activity */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-fg">{t('landlord.dashboard.recentActivity')}</h2>
              </div>

              <div className="bg-surface-muted rounded-xl overflow-hidden divide-y divide-border-faint">
                {dashboardLoading ? (
                  [0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
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
                      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center flex-shrink-0">
                        {activity.type === 'application' && <FileText className="w-5 h-5 text-fg-muted" />}
                        {activity.type === 'status_change' && <CheckCircle className="w-5 h-5 text-fg-muted" />}
                        {activity.type === 'message' && <Chat className="w-5 h-5 text-fg-muted" />}
                        {activity.type === 'document' && <FileText className="w-5 h-5 text-fg-muted" />}
                        {!['application', 'status_change', 'message', 'document'].includes(activity.type) && (
                          <Bell className="w-5 h-5 text-neutral-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-fg-muted truncate">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-fg-subtle whitespace-nowrap">
                        {activity.timestamp}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-fg-subtle">
                    Sin actividad reciente
                  </div>
                )}
              </div>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Financial Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-surface border border-border p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <BrandDot />
                <MonoLabel className="text-[11px] font-medium text-neutral-400">
                  {t('landlord.dashboard.financialSummary')}
                </MonoLabel>
              </div>
              {dashboardLoading ? (
                <>
                  <Skeleton className="h-9 w-36 rounded-md" />
                  <Skeleton className="h-4 w-28 mt-1 rounded" />
                  <div className="mt-6 pt-4 border-t border-border-faint space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-4 w-10 rounded" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold tracking-tight text-fg">
                    {i18nFormatCurrency(dashboardData.financial.monthlyIncome)}
                  </p>
                  <p className="text-fg-muted text-sm mt-1">
                    {t('landlord.dashboard.incomeThisMonth')}
                  </p>

                  <div className="mt-6 pt-4 border-t border-border-faint space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-fg-muted">{t('landlord.dashboard.collectionRateLabel')}</span>
                      <span className="text-fg font-medium tabular-nums">{dashboardData.financial.collectionRate}%</span>
                    </div>
                    <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${dashboardData.financial.collectionRate}%`, backgroundColor: '#1A40FF' }}
                      />
                    </div>
                    {dashboardData.financial.pendingPayments > 0 && (
                      <div className="flex items-center justify-between text-sm pt-2">
                        <span className="text-fg-muted">{t('landlord.dashboard.pendingPayments')}</span>
                        <span className="text-danger font-medium tabular-nums">{dashboardData.financial.pendingPayments}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/panel/leases"
                    className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:opacity-80 font-medium transition-opacity"
                  >
                    {t('landlord.dashboard.viewDetails')}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-surface-muted p-5"
            >
              <h3 className="font-semibold text-fg mb-4">{t('landlord.dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { href: '/publicar?from=panel', icon: Plus, label: t('landlord.dashboard.newProperty'), desc: t('landlord.dashboard.publishAProperty') },
                  { href: '/panel/candidatos', icon: Users, label: t('landlord.dashboard.viewCandidates'), desc: t('landlord.dashboard.applicantsCount', { count: totalCandidates }), badge: pendingReviews > 0 },
                  { href: '/panel/visitas', icon: CalendarBlank, label: t('landlord.dashboard.visits'), desc: t('landlord.dashboard.scheduledCount', { count: upcomingVisits.length }) },
                  { href: '/panel/contratos', icon: FileText, label: t('landlord.dashboard.contracts'), desc: t('landlord.dashboard.manageLeases') },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center transition-shadow">
                        <action.icon className="w-5 h-5 text-fg-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-fg-muted truncate">{action.desc}</p>
                      </div>
                      {action.badge && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      <CaretRight className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Upcoming Visits */}
            {upcomingVisits.length > 0 && (
              <UpcomingVisitsCard visits={upcomingVisits} />
            )}

            {/* Upcoming Events */}
            {dashboardData.upcomingEvents.length > 0 && (
              <UpcomingEventsCard events={dashboardData.upcomingEvents} />
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

function UpcomingVisitsCard({ visits }: { visits: Visit[] }) {
  const { t, locale, formatDate: i18nFmtDate } = useI18n();
  const [selected, setSelected] = useState<Visit | null>(null);

  const sections: DetailSection[] = selected ? [
    {
      id: 'visit-property',
      title: t('landlord.dashboard.visitProperty'),
      content: (
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-fg">{selected.propertyTitle}</p>
        </div>
      ),
    },
    {
      id: 'visit-datetime',
      title: t('landlord.dashboard.visitDateTime'),
      content: (
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-neutral-400 mt-0.5" />
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
          <Chat className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-fg">{selected.candidateMessage}</p>
        </div>
      ),
    }] : []),
    ...(selected.landlordNotes ? [{
      id: 'visit-notes',
      title: t('landlord.dashboard.yourNotes'),
      content: (
        <div className="flex items-start gap-3">
          <Chat className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-fg">{selected.landlordNotes}</p>
        </div>
      ),
    }] : []),
  ] : [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-surface-muted p-5"
      >
        <h3 className="font-semibold text-fg mb-4 flex items-center gap-2">
          <CalendarBlank className="w-4 h-4 text-fg-muted" />
          {t('landlord.dashboard.upcomingVisits')}
        </h3>
        <div className="space-y-1">
          {visits.slice(0, 3).map((visit) => (
            <button
              key={visit.id}
              onClick={() => setSelected(visit)}
              className="group w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-surface-hover transition-colors"
            >
              <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', VISIT_STATUS_COLORS[visit.status] || 'bg-primary')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">{visit.candidateName}</p>
                <p className="text-xs text-fg-muted">
                  {i18nFmtDate(visit.requestedDate + 'T12:00:00', {
                    day: 'numeric',
                    month: 'short',
                  })} · {visit.requestedTime} · {VISIT_STATUS_LABELS[visit.status]}
                </p>
              </div>
              <CaretRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))}
        </div>
        {visits.length > 3 && (
          <Link
            href="/panel/visitas"
            className="block mt-3 text-center text-xs text-fg-muted hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('landlord.dashboard.viewAllVisits')} →
          </Link>
        )}
      </motion.div>

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
              className="flex-1 text-center text-sm font-medium px-4 py-2.5 bg-surface border border-border text-fg rounded-xl hover:bg-neutral-50 dark:hover:bg-[#333] transition-colors"
            >
              {t('landlord.dashboard.viewProperty')}
            </Link>
            <Link
              href="/panel/visitas"
              className="flex-1 text-center text-sm font-medium px-4 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-colors"
            >
              {t('landlord.dashboard.manageVisit')}
            </Link>
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

function UpcomingEventsCard({ events }: { events: DashboardUpcomingEvent[] }) {
  const { t, locale, formatDate: i18nFmtDate } = useI18n();
  const [selected, setSelected] = useState<DashboardUpcomingEvent | null>(null);

  const EVENT_DOT_COLOR: Record<string, string> = {
    payment_due: 'bg-primary',
    lease_ending: 'bg-warning',
    contract_renewal: 'bg-success',
    inspection: 'bg-neutral-500',
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
          <Buildings className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-fg">{selected.description}</p>
        </div>
      ),
    }] : []),
    {
      id: 'event-date',
      title: t('landlord.dashboard.eventDate'),
      content: (
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-neutral-400 mt-0.5" />
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-surface-muted p-5"
      >
        <h3 className="font-semibold text-fg mb-4 flex items-center gap-2">
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
                className="group w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-surface-hover transition-colors"
              >
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{event.title}</p>
                  <p className="text-xs text-fg-muted">
                    {i18nFmtDate(event.date + 'T12:00:00', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <CaretRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </motion.div>

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
          <Link
            href={selected.href}
            className="block w-full text-center text-sm font-medium px-4 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-colors"
          >
            {actionLabel}
          </Link>
        ) : undefined}
        width="sm"
      />
    </>
  );
}
