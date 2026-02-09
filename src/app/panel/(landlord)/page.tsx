'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Buildings, Users, Clock, WarningCircle, CurrencyDollar, House, TrendUp, Calendar, ArrowUpRight, CaretDown, CaretRight, PencilLine, CreditCard, UserCheck, CalendarCheck, CalendarBlank, MapPin, Phone, Chat, X, Plus, Eye, FileText, ChartBarHorizontal, ChartBar, Wallet, Bell, CheckCircle, Star, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

import { LANDLORD_PROPERTIES } from '@/lib/data/mock-landlord-data';
import { getRecentActivities } from '@/lib/data/mock-activity';
import { getDashboardData, formatCurrency } from '@/lib/data/mock-dashboard';
import { getUpcomingVisits } from '@/lib/data/mock-visits';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit } from '@/lib/types/visit';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { useTranslation } from '@/lib/i18n';
import { PlanDetailSheet, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { SetupDashboard } from '@/components/panel/SetupDashboard';
import { LandlordDashboardEmpty } from '@/components/panel/LandlordDashboardEmpty';
import type { LandlordProperty } from '@/lib/types/landlord';
import type { UrgentAction, UpcomingEvent } from '@/lib/data/mock-dashboard';

const ACTION_ICONS: Record<UrgentAction['type'], React.ElementType> = {
  signature: FileText,
  late_payment: CreditCard,
  pending_review: UserCheck,
  ending_lease: CalendarCheck,
  pending_visit: CalendarBlank,
};

function UrgentActionsBanner({ actions }: { actions: UrgentAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const { locale } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 overflow-hidden"
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
            {actions.length} {locale === 'es' ? 'acciones pendientes' : 'pending actions'}
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
  const { t, locale, formatCurrency: i18nFormatCurrency, formatDate: i18nFormatDate } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Propietario' : 'Owner');

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

  // Loading state while checking onboarding status
  if (isOnboardingComplete === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show empty state if onboarding is not complete
  if (!isOnboardingComplete) {
    return <LandlordDashboardEmpty />;
  }

  // Show setup dashboard if in setup mode
  if (showSetupDashboard) {
    return <SetupDashboard onDismiss={handleDismissSetup} />;
  }

  const properties = LANDLORD_PROPERTIES;
  const recentActivities = getRecentActivities(5);
  const dashboardData = getDashboardData();
  const upcomingVisits = getUpcomingVisits();

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
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {/* Monthly Income - Featured Card */}
          <div className="sm:col-span-2 lg:col-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/30 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm">
                <CurrencyDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
                <TrendUp className="w-3 h-3" />
                +12%
              </span>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">{locale === 'es' ? 'Ingresos mensuales' : 'Monthly income'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {i18nFormatCurrency(dashboardData.financial.monthlyIncome)}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
              {dashboardData.financial.activeLeases} {locale === 'es' ? 'arriendos activos' : 'active leases'}
            </p>
          </div>

          {/* Properties */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Buildings className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Propiedades' : 'Properties'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {properties.length}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              {dashboardData.financial.activeLeases} {locale === 'es' ? 'arrendadas' : 'rented'}
            </p>
          </div>

          {/* Candidates */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Users className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Candidatos' : 'Candidates'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {totalCandidates}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              {pendingReviews > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">{pendingReviews} {locale === 'es' ? 'pendientes' : 'pending'}</span>
              )}
              {pendingReviews === 0 && (locale === 'es' ? 'Todos revisados' : 'All reviewed')}
            </p>
          </div>

          {/* Collection Rate */}
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <ChartBar className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Tasa cobranza' : 'Collection rate'}</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {dashboardData.financial.collectionRate}%
              </p>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                {locale === 'es' ? 'Excelente' : 'Excellent'}
              </span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              {locale === 'es' ? 'Este mes' : 'This month'}
            </p>
          </div>
        </motion.div>

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
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Mis Propiedades' : 'My Properties'}</h2>
                <Link
                  href="/panel/propiedades"
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  {locale === 'es' ? 'Ver todas' : 'View all'}
                  <CaretRight className="w-4 h-4" />
                </Link>
              </div>

              {properties.length > 0 ? (
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
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <Link href={`/panel/${property.id}`}>
                          <div className="group relative overflow-hidden rounded-3xl bg-stone-100 dark:bg-[#1a1a1c] hover:shadow-lg transition-all duration-300">
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
                                      ? (locale === 'es' ? 'Disponible' : 'Available')
                                      : property.status === 'rented'
                                        ? (locale === 'es' ? 'Arrendada' : 'Rented')
                                        : (locale === 'es' ? 'Pendiente' : 'Pending')}
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
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">/{locale === 'es' ? 'mes' : 'mo'}</p>
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
                                      {property.pendingCount} {locale === 'es' ? 'pendientes' : 'pending'}
                                    </span>
                                  )}

                                  {property.pendingCount === 0 && property.candidateCount > 0 && (
                                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      {locale === 'es' ? 'Revisado' : 'Reviewed'}
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
                    {locale === 'es' ? 'No tienes propiedades publicadas' : 'No published properties'}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                    {locale === 'es' ? 'Publica tu primera propiedad para comenzar' : 'Publish your first property to get started'}
                  </p>
                  <Link
                    href="/publicar?from=panel"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {locale === 'es' ? 'Publicar propiedad' : 'Publish property'}
                  </Link>
                </div>
              )}

              {/* Show "Ver todas" when there are more than 3 properties */}
              {properties.length > 3 && (
                <Link
                  href="/panel/propiedades"
                  className="flex items-center justify-center gap-2 mt-4 px-5 py-3 rounded-2xl border border-stone-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-stone-50 dark:hover:bg-[#1a1a1c] hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {locale === 'es' ? 'Ver todas las propiedades' : 'View all properties'}
                  <span className="px-2 py-0.5 bg-stone-100 dark:bg-neutral-800 rounded-full text-xs">
                    +{properties.length - 3} {locale === 'es' ? 'más' : 'more'}
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
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Actividad reciente' : 'Recent activity'}</h2>
              </div>

              <div className="bg-stone-50 dark:bg-[#1a1a1c] rounded-3xl overflow-hidden divide-y divide-stone-100 dark:divide-neutral-800">
                {recentActivities.slice(0, 5).map((activity, index) => (
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
                ))}
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
              className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 border border-indigo-200/50 dark:border-indigo-800/30 p-6"
            >
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm mb-3">
                <Wallet className="w-4 h-4" />
                {locale === 'es' ? 'Resumen financiero' : 'Financial summary'}
              </div>
              <p className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {i18nFormatCurrency(dashboardData.financial.monthlyIncome)}
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                {locale === 'es' ? 'Ingresos este mes' : 'Income this month'}
              </p>

              <div className="mt-6 pt-4 border-t border-indigo-200/50 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Tasa cobranza' : 'Collection rate'}</span>
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
                    <span className="text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Pagos pendientes' : 'Pending payments'}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{dashboardData.financial.pendingPayments}</span>
                  </div>
                )}
              </div>

              <Link
                href="/panel/finanzas"
                className="inline-flex items-center gap-1.5 mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                {locale === 'es' ? 'Ver detalles' : 'View details'}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-5"
            >
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">{locale === 'es' ? 'Acciones rápidas' : 'Quick actions'}</h3>
              <div className="space-y-2">
                {[
                  { href: '/publicar?from=panel', icon: Plus, label: locale === 'es' ? 'Nueva propiedad' : 'New property', desc: locale === 'es' ? 'Publica un inmueble' : 'Publish a property' },
                  { href: '/panel/candidatos', icon: Users, label: locale === 'es' ? 'Ver candidatos' : 'View candidates', desc: `${totalCandidates} ${locale === 'es' ? 'postulantes' : 'applicants'}`, badge: pendingReviews > 0 },
                  { href: '/panel/visitas', icon: CalendarBlank, label: locale === 'es' ? 'Visitas' : 'Visits', desc: `${upcomingVisits.length} ${locale === 'es' ? 'programadas' : 'scheduled'}` },
                  { href: '/panel/contratos', icon: FileText, label: locale === 'es' ? 'Contratos' : 'Contracts', desc: locale === 'es' ? 'Gestiona arriendos' : 'Manage leases' },
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
  const { locale } = useTranslation();
  const [selected, setSelected] = useState<Visit | null>(null);

  const sections: DetailSection[] = selected ? [
    {
      id: 'visit-property',
      title: locale === 'es' ? 'Propiedad' : 'Property',
      content: (
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">{selected.propertyTitle}</p>
        </div>
      ),
    },
    {
      id: 'visit-datetime',
      title: locale === 'es' ? 'Fecha y hora' : 'Date & time',
      content: (
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">
            {new Date(selected.requestedDate + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })} {locale === 'es' ? 'a las' : 'at'} {selected.requestedTime}
          </p>
        </div>
      ),
    },
    ...(selected.candidateMessage ? [{
      id: 'visit-message',
      title: locale === 'es' ? 'Mensaje del candidato' : 'Candidate message',
      content: (
        <div className="flex items-start gap-3">
          <Chat className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">{selected.candidateMessage}</p>
        </div>
      ),
    }] : []),
    ...(selected.landlordNotes ? [{
      id: 'visit-notes',
      title: locale === 'es' ? 'Tus notas' : 'Your notes',
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
        className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-5"
      >
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <CalendarBlank className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          {locale === 'es' ? 'Próximas Visitas' : 'Upcoming Visits'}
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
                  {new Date(visit.requestedDate + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
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
            {locale === 'es' ? 'Ver todas las visitas' : 'View all visits'} →
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
              {locale === 'es' ? 'Ver propiedad' : 'View property'}
            </Link>
            <Link
              href="/panel/visitas"
              className="flex-1 text-center text-sm font-medium px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {locale === 'es' ? 'Gestionar visita' : 'Manage visit'}
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

function UpcomingEventsCard({ events }: { events: UpcomingEvent[] }) {
  const { locale } = useTranslation();
  const [selected, setSelected] = useState<UpcomingEvent | null>(null);

  const EVENT_DOT_COLOR: Record<string, string> = {
    payment_due: 'bg-indigo-500',
    lease_ending: 'bg-amber-500',
    contract_renewal: 'bg-emerald-500',
    inspection: 'bg-purple-500',
  };

  const isOverdue = selected ? selected.daysUntil < 0 : false;

  const urgencyLabel = selected
    ? isOverdue
      ? `${locale === 'es' ? 'Vencido hace' : 'Overdue by'} ${Math.abs(selected.daysUntil)} ${locale === 'es' ? 'días' : 'days'}`
      : selected.daysUntil === 0
        ? (locale === 'es' ? 'Hoy' : 'Today')
        : selected.daysUntil === 1
          ? (locale === 'es' ? 'Mañana' : 'Tomorrow')
          : `${locale === 'es' ? 'En' : 'In'} ${selected.daysUntil} ${locale === 'es' ? 'días' : 'days'}`
    : '';

  const sections: DetailSection[] = selected ? [
    {
      id: 'event-urgency',
      title: locale === 'es' ? 'Urgencia' : 'Urgency',
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
      title: locale === 'es' ? 'Propiedad' : 'Property',
      content: (
        <div className="flex items-start gap-3">
          <Buildings className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">{selected.description}</p>
        </div>
      ),
    }] : []),
    {
      id: 'event-date',
      title: locale === 'es' ? 'Fecha' : 'Date',
      content: (
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-neutral-400 mt-0.5" />
          <p className="text-sm text-neutral-900 dark:text-white">
            {new Date(selected.date + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
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
    ? (locale === 'es' ? 'Ver arriendos' : 'View rentals')
    : selected?.type === 'lease_ending'
      ? (locale === 'es' ? 'Ver contrato' : 'View contract')
      : (locale === 'es' ? 'Ver detalle' : 'View detail');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-5"
      >
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          {locale === 'es' ? 'Próximos Eventos' : 'Upcoming Events'}
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
                    {new Date(event.date + 'T12:00:00').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
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
