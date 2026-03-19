'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Buildings, Users, Clock, WarningCircle, CurrencyDollar, House, TrendUp, Calendar, ArrowUpRight, CaretDown, CaretRight, PencilLine, CreditCard, UserCheck, CalendarCheck, CalendarBlank, MapPin, Phone, Chat, X, Plus, Eye, FileText, ChartBarHorizontal, ChartBar, Wallet, Bell, CheckCircle, Star, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
          <WarningCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t('landlord.dashboard.pendingActions', { count: actions.length })}
          </p>
          <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
            {actions[0]?.description}
          </p>
        </div>
        <CaretDown className={cn(
          'w-5 h-5 text-amber-600 dark:text-amber-400 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.type] || WarningCircle;
            return (
              <Link
                key={action.id}
                href={action.href}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-colors',
                  action.priority === 'high'
                    ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/40'
                    : action.priority === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                      : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4 flex-shrink-0',
                  action.priority === 'high' ? 'text-red-600 dark:text-red-400'
                    : action.priority === 'medium' ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    action.priority === 'high' ? 'text-red-800 dark:text-red-200'
                      : action.priority === 'medium' ? 'text-amber-800 dark:text-amber-200'
                        : 'text-blue-800 dark:text-blue-200'
                  )}>{action.title}</p>
                  <p className={cn(
                    'text-xs opacity-70',
                    action.priority === 'high' ? 'text-red-700 dark:text-red-300'
                      : action.priority === 'medium' ? 'text-amber-700 dark:text-amber-300'
                        : 'text-blue-700 dark:text-blue-300'
                  )}>{action.description}</p>
                </div>
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  action.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                    : action.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                )}>
                  {action.count}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
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
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              {greeting}
            </p>
            <h1 className="text-3xl sm:text-4xl font-medium text-neutral-900 dark:text-white tracking-tight">
              {t('dashboard.hello', { name: firstName })}
            </h1>
          </div>
        </motion.header>

        {/* Stats Grid - Landing Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Monthly Income - Featured Card */}
          <div className="sm:col-span-2 lg:col-span-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/30 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm">
                <CurrencyDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {!isLoading && (
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
                  <TrendUp className="w-3 h-3" />
                  +12%
                </span>
              )}
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">{t('landlord.dashboard.monthlyIncome')}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-36 rounded-lg bg-emerald-200/50 dark:bg-emerald-800/30" />
            ) : (
              <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {i18nFormatCurrency(dashboardData.financial.monthlyIncome)}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-24 mt-2 rounded bg-emerald-200/50 dark:bg-emerald-800/30" />
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                {t('landlord.dashboard.activeLeases', { count: dashboardData.financial.activeLeases })}
              </p>
            )}
          </div>

          {/* Properties */}
          <div className="rounded-xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Buildings className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('landlord.dashboard.properties')}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-12 rounded-lg" />
            ) : (
              <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {properties.length}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-20 mt-2 rounded" />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                {dashboardData.financial.activeLeases} {t('landlord.dashboard.rented')}
              </p>
            )}
          </div>

          {/* Candidates */}
          <div className="rounded-xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Users className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('landlord.dashboard.candidates')}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-12 rounded-lg" />
            ) : (
              <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {totalCandidates}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-28 mt-2 rounded" />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                {pendingReviews > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{t('landlord.dashboard.pendingCount', { count: pendingReviews })}</span>
                )}
                {pendingReviews === 0 && t('landlord.dashboard.allReviewed')}
              </p>
            )}
          </div>

          {/* Collection Rate */}
          <div className="rounded-xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <ChartBar className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t('landlord.dashboard.collectionRate')}</p>
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-20 rounded-lg" />
                <Skeleton className="h-4 w-16 mt-2 rounded" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    {dashboardData.financial.collectionRate}%
                  </p>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                    {t('landlord.dashboard.excellent')}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
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
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{t('landlord.dashboard.myProperties')}</h2>
                <Link
                  href="/panel/propiedades"
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  {t('landlord.dashboard.viewAll')}
                  <CaretRight className="w-4 h-4" />
                </Link>
              </div>

              {propertiesLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl bg-stone-100 dark:bg-[#1a1a1c] overflow-hidden">
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
                          <div className="pt-4 border-t border-stone-200 dark:border-neutral-700 flex gap-3">
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
                          <div className="group relative overflow-hidden rounded-xl bg-stone-100 dark:bg-[#1a1a1c] hover:shadow-lg transition-all duration-300">
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
                                  <span className={cn(
                                    'px-2.5 py-1 text-xs font-medium rounded-full',
                                    property.status === 'available'
                                      ? 'bg-emerald-500 text-white'
                                      : property.status === 'rented'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-amber-500 text-white'
                                  )}>
                                    {property.status === 'available'
                                      ? t('landlord.dashboard.statusAvailable')
                                      : property.status === 'rented'
                                        ? t('landlord.dashboard.statusRented')
                                        : t('landlord.dashboard.statusPending')}
                                  </span>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 p-5">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {property.title}
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {property.neighborhood}, {property.city}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                                      {i18nFormatCurrency(property.monthlyRent)}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">/{t('landlord.dashboard.perMonth')}</p>
                                  </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-neutral-700">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2a2a2c] rounded-xl">
                                    <Users className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                    <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                                      {property.candidateCount}
                                    </span>
                                  </div>

                                  {property.candidateCount > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-2 bg-stone-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div
                                          className={cn(
                                            'h-full rounded-full transition-all',
                                            goodCandidatePercent >= 50 ? 'bg-emerald-500' : 'bg-amber-500'
                                          )}
                                          style={{ width: `${goodCandidatePercent}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {goodCandidatePercent}% A-B
                                      </span>
                                    </div>
                                  )}

                                  {property.pendingCount > 0 && (
                                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                      {t('landlord.dashboard.pendingCount', { count: property.pendingCount })}
                                    </span>
                                  )}

                                  {property.pendingCount === 0 && property.candidateCount > 0 && (
                                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      {t('landlord.dashboard.reviewed')}
                                    </span>
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
                <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Buildings className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                    {t('landlord.dashboard.noPublishedProperties')}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                    {t('landlord.dashboard.publishFirstProperty')}
                  </p>
                  <Link
                    href="/publicar?from=panel"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 transition-colors"
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
                  className="flex items-center justify-center gap-2 mt-4 px-5 py-3 rounded-2xl border border-stone-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-stone-50 dark:hover:bg-[#1a1a1c] hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t('landlord.dashboard.viewAllProperties')}
                  <span className="px-2 py-0.5 bg-stone-100 dark:bg-neutral-800 rounded-full text-xs">
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
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{t('landlord.dashboard.recentActivity')}</h2>
              </div>

              <div className="bg-stone-50 dark:bg-[#1a1a1c] rounded-xl overflow-hidden divide-y divide-stone-100 dark:divide-neutral-800">
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
                    <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-stone-100 dark:hover:bg-[#222224] transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm flex-shrink-0">
                        {activity.type === 'application' && <FileText className="w-5 h-5 text-blue-500" />}
                        {activity.type === 'status_change' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        {activity.type === 'message' && <Chat className="w-5 h-5 text-purple-500" />}
                        {activity.type === 'document' && <FileText className="w-5 h-5 text-amber-500" />}
                        {!['application', 'status_change', 'message', 'document'].includes(activity.type) && (
                          <Bell className="w-5 h-5 text-neutral-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                        {activity.timestamp}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
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
              className="rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 border border-indigo-200/50 dark:border-indigo-800/30 p-6"
            >
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm mb-3">
                <Wallet className="w-4 h-4" />
                {t('landlord.dashboard.financialSummary')}
              </div>
              {dashboardLoading ? (
                <>
                  <Skeleton className="h-9 w-36 rounded-lg bg-indigo-200/30 dark:bg-indigo-800/20" />
                  <Skeleton className="h-4 w-28 mt-1 rounded bg-indigo-200/30 dark:bg-indigo-800/20" />
                  <div className="mt-6 pt-4 border-t border-indigo-200/50 dark:border-indigo-900/50 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24 rounded bg-indigo-200/30 dark:bg-indigo-800/20" />
                      <Skeleton className="h-4 w-10 rounded bg-indigo-200/30 dark:bg-indigo-800/20" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full bg-indigo-200/30 dark:bg-indigo-800/20" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {i18nFormatCurrency(dashboardData.financial.monthlyIncome)}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                    {t('landlord.dashboard.incomeThisMonth')}
                  </p>

                  <div className="mt-6 pt-4 border-t border-indigo-200/50 dark:border-indigo-900/50 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">{t('landlord.dashboard.collectionRateLabel')}</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{dashboardData.financial.collectionRate}%</span>
                    </div>
                    <div className="h-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${dashboardData.financial.collectionRate}%` }}
                      />
                    </div>
                    {dashboardData.financial.pendingPayments > 0 && (
                      <div className="flex items-center justify-between text-sm pt-2">
                        <span className="text-neutral-500 dark:text-neutral-400">{t('landlord.dashboard.pendingPayments')}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{dashboardData.financial.pendingPayments}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/panel/leases"
                    className="inline-flex items-center gap-1.5 mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
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
              className="rounded-xl bg-stone-50 dark:bg-[#1a1a1c] p-5"
            >
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">{t('landlord.dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { href: '/publicar?from=panel', icon: Plus, label: t('landlord.dashboard.newProperty'), desc: t('landlord.dashboard.publishAProperty') },
                  { href: '/panel/candidatos', icon: Users, label: t('landlord.dashboard.viewCandidates'), desc: t('landlord.dashboard.applicantsCount', { count: totalCandidates }), badge: pendingReviews > 0 },
                  { href: '/panel/visitas', icon: CalendarBlank, label: t('landlord.dashboard.visits'), desc: t('landlord.dashboard.scheduledCount', { count: upcomingVisits.length }) },
                  { href: '/panel/contratos', icon: FileText, label: t('landlord.dashboard.contracts'), desc: t('landlord.dashboard.manageLeases') },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white dark:hover:bg-[#222224] transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                        <action.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{action.desc}</p>
                      </div>
                      {action.badge && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                      <CaretRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
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

const VISIT_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500',
  requested: 'bg-blue-500',
  completed: 'bg-neutral-400 dark:bg-neutral-600',
  cancelled: 'bg-red-500',
  no_show: 'bg-amber-500',
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
          <p className="text-sm text-neutral-900 dark:text-white">{selected.propertyTitle}</p>
        </div>
      ),
    },
    {
      id: 'visit-datetime',
      title: t('landlord.dashboard.visitDateTime'),
      content: (
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">
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
          <p className="text-sm text-neutral-900 dark:text-white">{selected.candidateMessage}</p>
        </div>
      ),
    }] : []),
    ...(selected.landlordNotes ? [{
      id: 'visit-notes',
      title: t('landlord.dashboard.yourNotes'),
      content: (
        <div className="flex items-start gap-3">
          <Chat className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">{selected.landlordNotes}</p>
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
        className="rounded-xl bg-stone-50 dark:bg-[#1a1a1c] p-5"
      >
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <CalendarBlank className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          {t('landlord.dashboard.upcomingVisits')}
        </h3>
        <div className="space-y-1">
          {visits.slice(0, 3).map((visit) => (
            <button
              key={visit.id}
              onClick={() => setSelected(visit)}
              className="group w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-white dark:hover:bg-[#222224] transition-colors"
            >
              <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', VISIT_STATUS_COLORS[visit.status] || 'bg-indigo-500')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{visit.candidateName}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
            className="block mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
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
              className="flex-1 text-center text-sm font-medium px-4 py-2.5 bg-white dark:bg-[#2a2a2c] border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-50 dark:hover:bg-[#333] transition-colors"
            >
              {t('landlord.dashboard.viewProperty')}
            </Link>
            <Link
              href="/panel/visitas"
              className="flex-1 text-center text-sm font-medium px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
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
    payment_due: 'bg-indigo-500',
    lease_ending: 'bg-amber-500',
    contract_renewal: 'bg-emerald-500',
    inspection: 'bg-purple-500',
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
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
          isOverdue
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            : selected.daysUntil <= 3
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
        )}>
          {urgencyLabel}
        </span>
      ),
    },
    ...(selected.description ? [{
      id: 'event-property',
      title: t('landlord.dashboard.eventProperty'),
      content: (
        <div className="flex items-start gap-3">
          <Buildings className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">{selected.description}</p>
        </div>
      ),
    }] : []),
    {
      id: 'event-date',
      title: t('landlord.dashboard.eventDate'),
      content: (
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">
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
        className="rounded-xl bg-stone-50 dark:bg-[#1a1a1c] p-5"
      >
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          {t('landlord.dashboard.upcomingEvents')}
        </h3>
        <div className="space-y-1">
          {events.slice(0, 5).map((event) => {
            const dotColor = event.daysUntil < 0 ? 'bg-red-500' : (EVENT_DOT_COLOR[event.type] || 'bg-indigo-500');
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="group w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-white dark:hover:bg-[#222224] transition-colors"
              >
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{event.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
            className="block w-full text-center text-sm font-medium px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            {actionLabel}
          </Link>
        ) : undefined}
        width="sm"
      />
    </>
  );
}
