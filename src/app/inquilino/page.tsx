'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin, CreditCard, FileText, House, CaretRight, MagnifyingGlass, Heart, Shield, CheckCircle, Check, ArrowRight, Lightbulb } from '@phosphor-icons/react';

import { useFeaturedProperties } from '@/lib/hooks/useProperties';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { useEvaluation } from '@/lib/hooks/useEvaluation';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { TenantDashboardEmpty } from '@/components/tenant/TenantDashboardEmpty';
import { ScoreCard } from '@/components/tenant/ScoreCard';
import { ScoreDetailSheet } from '@/components/tenant/ScoreDetailSheet';
import { ScoreShareModal } from '@/components/tenant/ScoreShareModal';
import { downloadScorePDF } from '@/lib/utils/generate-score-pdf';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Property } from '@/lib/types/property';

/**
 * Tenant Dashboard - Landing Page Style
 * Handles both new users (empty states) and active users (with data)
 */
export default function InquilinoPage() {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const { t, locale, formatCurrency: i18nFormatCurrency } = useI18n();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Usuario' : 'User');

  // Property detail sheet state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Evaluation state
  const { evaluation, isPaid, score, purchaseEvaluation } = useEvaluation();
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handlePurchaseEvaluation = () => {
    purchaseEvaluation();
  };

  const handleDownloadPDF = () => {
    if (!score || !evaluation?.verificationCode || !evaluation.paidAt || !evaluation.expiresAt) return;
    const name = user?.name || 'Inquilino';
    downloadScorePDF(name, score, evaluation.verificationCode, evaluation.paidAt, evaluation.expiresAt);
  };

  // Onboarding state - check if profile is complete
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      const saved = localStorage.getItem('plan_onboarding_tenant');
      if (!saved) {
        setIsOnboardingComplete(false);
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        const rawSteps = parsed.completedSteps || [];
        const completedSteps = rawSteps.filter((s: number) => s <= 2);
        // Migrate: old step 3 (employment) was removed; if it was completed,
        // treat step 2 (now preferences) as completed too
        if (rawSteps.includes(3) && !completedSteps.includes(2)) {
          completedSteps.push(2);
        }
        setIsOnboardingComplete(completedSteps.length >= 2);
      } catch {
        setIsOnboardingComplete(false);
      }
    };

    checkOnboardingStatus();

    window.addEventListener('storage', checkOnboardingStatus);
    window.addEventListener('onboarding-updated', checkOnboardingStatus);
    return () => {
      window.removeEventListener('storage', checkOnboardingStatus);
      window.removeEventListener('onboarding-updated', checkOnboardingStatus);
    };
  }, []);

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setSheetOpen(true);
  };

  // ==========================================================================
  // TODO (Backend): Replace these with actual API calls
  // For a new user, these should all be empty
  // ==========================================================================
  const activeLeases: any[] = []; // Empty for new users
  const activeApplications: any[] = []; // Empty for new users
  const nextPayment: { amount: number; dueDate: string } | null = null; // No payments for new users
  const primaryLease: { id: string; propertyName: string } | null = null;
  // ==========================================================================

  // Featured properties for recommendation (always show)
  const { properties: featuredProperties, isLoading: featuredLoading } = useFeaturedProperties(4);

  // Loading state
  if (isOnboardingComplete === null) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding if not complete
  if (!isOnboardingComplete) {
    return <TenantDashboardEmpty />;
  }

  // Check if user is "new" (no leases, no applications)
  const isNewUser = activeLeases.length === 0 && activeApplications.length === 0;

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {greeting}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium text-neutral-900 dark:text-white tracking-tight">
            {t('dashboard.hello', { name: firstName })}
          </h1>
          {isNewUser && (
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">
              {locale === 'es'
                ? '¡Tu perfil está listo! Ahora puedes buscar y aplicar a propiedades.'
                : 'Your profile is ready! Now you can search and apply to properties.'}
            </p>
          )}
        </motion.header>

        {/* Welcome Card for New Users */}
        {isNewUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-7 h-7 text-[#2C7A53] dark:text-[#3EAE70]" weight="fill" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
                  {locale === 'es' ? '¡Perfil completado!' : 'Profile completed!'}
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                  {locale === 'es'
                    ? 'Tu score de inquilino está activo. Explora propiedades y aplica con un solo clic.'
                    : 'Your tenant score is active. Explore properties and apply with one click.'}
                </p>
              </div>
              <Button asChild className="flex-shrink-0">
                <Link href="/inquilino/explorar">
                  {locale === 'es' ? 'Buscar propiedades' : 'Search properties'}
                </Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* Trust Score - Always show */}
          <ScoreCard
            isPaid={isPaid}
            level={score?.level}
            onClick={() => setScoreSheetOpen(true)}
          />

          {/* Active Leases */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
              <House className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Arriendos' : 'Rentals'}</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{activeLeases.length}</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
              {activeLeases.length === 0
                ? (locale === 'es' ? 'Sin arriendos activos' : 'No active rentals')
                : (locale === 'es' ? 'Contratos vigentes' : 'Active contracts')}
            </p>
          </div>

          {/* Applications */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('nav.applications')}</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{activeApplications.length}</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
              {activeApplications.length === 0
                ? (locale === 'es' ? 'Sin aplicaciones' : 'No applications')
                : (locale === 'es' ? 'En proceso' : 'In progress')}
            </p>
          </div>

          {/* Next Payment or CTA */}
          {nextPayment && primaryLease ? (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-5">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('dashboard.nextPayment')}</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {i18nFormatCurrency((nextPayment as { amount: number }).amount)}
              </p>
            </div>
          ) : (
            <Link href="/inquilino/explorar" className="group">
              <div className="h-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-5 hover:bg-neutral-100 dark:hover:bg-[#222224] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
                  <MagnifyingGlass className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <p className="text-xs text-primary font-medium mb-1">
                  {locale === 'es' ? 'Comienza ahora' : 'Get started'}
                </p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">
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
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {locale === 'es' ? 'Propiedades para ti' : 'Properties for you'}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {locale === 'es' ? 'Basado en tu perfil y preferencias' : 'Based on your profile and preferences'}
                  </p>
                </div>
                <Link
                  href="/inquilino/explorar"
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
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
                    className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors duration-300 text-left w-full"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={property.images[0]}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Match badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 text-white text-xs font-medium rounded-full flex items-center gap-1" style={{ backgroundColor: '#0B1220' }}>
                        <Check className="w-3 h-3" weight="bold" />
                        {92 - index * 5}% match
                      </div>

                      {/* Heart - Glass effect */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 cursor-pointer"
                      >
                        <Heart className="w-4 h-4 text-white drop-" />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white whitespace-nowrap flex-shrink-0">
                          {i18nFormatCurrency(property.monthlyRent)}
                          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">/{locale === 'es' ? 'mes' : 'mo'}</span>
                        </p>
                      </div>

                      <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {property.neighborhood}, {property.city}
                      </p>

                      <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                          {property.bedrooms} {locale === 'es' ? 'hab' : 'bed'}
                        </span>
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                          {property.bathrooms} {locale === 'es' ? 'baños' : 'bath'}
                        </span>
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                          {property.area} m²
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            {/* Empty State for Applications - Show when no applications */}
            {activeApplications.length === 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
                    <FileText className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">
                    {locale === 'es' ? 'Sin aplicaciones aún' : 'No applications yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                    {locale === 'es'
                      ? 'Cuando apliques a una propiedad, podrás ver el estado de tu aplicación aquí.'
                      : 'When you apply to a property, you\'ll see the status of your application here.'}
                  </p>
                  <Button asChild>
                    <Link href="/inquilino/explorar">
                      {locale === 'es' ? 'Explorar propiedades' : 'Explore properties'}
                    </Link>
                  </Button>
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
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-5"
            >
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
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
                    desc: locale === 'es' ? 'Ver mis aplicaciones' : 'View my applications'
                  },
                  {
                    href: '/inquilino/perfil',
                    icon: Shield,
                    label: locale === 'es' ? 'Mi perfil' : 'My profile',
                    desc: locale === 'es' ? 'Editar información' : 'Edit information'
                  },
                ].map((action, i) => (
                  <Link key={i} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-[#222224] transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center transition-shadow">
                        <action.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{action.desc}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
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
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161618] p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                      {locale === 'es' ? 'Consejo' : 'Tip'}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
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
              className="rounded-xl bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-800 p-5"
            >
              <h4 className="font-semibold text-neutral-900 dark:text-white text-sm mb-2">
                {locale === 'es' ? '¿Necesitas ayuda?' : 'Need help?'}
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
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
