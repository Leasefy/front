'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, House, CaretRight, CheckCircle, ArrowRight, ClipboardText, Shield, Lightning, Star, MagnifyingGlass, Heart, Bell, TrendUp, Play } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import {
  deriveTenantOnboardingStatus,
  readTenantOnboardingCacheStatus,
} from '@/lib/onboarding/tenant-onboarding-status';

interface SetupStep {
  id: number;
  key: string;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 1,
    key: 'basic',
    labelEs: 'Información básica',
    labelEn: 'Basic information',
    descriptionEs: 'Nombre, teléfono y contacto',
    descriptionEn: 'Name, phone, and contact',
    icon: User,
    href: '/onboarding/inquilino',
    completed: false,
  },
  {
    id: 2,
    key: 'preferences',
    labelEs: 'Preferencias de vivienda',
    labelEn: 'Housing preferences',
    descriptionEs: 'Presupuesto, zona y amenidades',
    descriptionEn: 'Budget, area, and amenities',
    icon: House,
    href: '/onboarding/inquilino',
    completed: false,
  },
];

const QUICK_ACTIONS = [
  {
    labelEs: 'Buscar propiedades',
    labelEn: 'Search properties',
    icon: MagnifyingGlass,
    href: '/inquilino/explorar',
  },
  {
    labelEs: 'Ver guardados',
    labelEn: 'View saved',
    icon: Heart,
    href: '/inquilino/guardados',
  },
  {
    labelEs: 'Notificaciones',
    labelEn: 'Notifications',
    icon: Bell,
    href: '/inquilino/notificaciones',
  },
];

export function TenantDashboardEmpty() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Usuario' : 'User');

  const [localCache, setLocalCache] = useState<{ completedSteps: number[]; isComplete: boolean }>({
    completedSteps: [],
    isComplete: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Local wizard progress cache (in-progress drafts only; migrates old 3-step
  // data). Scoped to the current user: another account's payload reads as absent.
  const userId = user?.id;
  useEffect(() => {
    const loadProgress = () => {
      setLocalCache(readTenantOnboardingCacheStatus(userId));
      setIsLoaded(true);
    };

    // Load on mount
    loadProgress();

    // Listen for onboarding updates (dispatched by TenantOnboardingContext)
    window.addEventListener('onboarding-updated', loadProgress);

    return () => {
      window.removeEventListener('onboarding-updated', loadProgress);
    };
  }, [userId]);

  // Step status: the backend profile (name+phone / saved housing preferences)
  // is the source of truth; the local cache only adds in-progress wizard steps
  // that were passed locally but not yet submitted to the backend.
  // A cache claiming FULL completion while the authoritative backend flag says
  // the wizard never completed is stale (a real submit always stamps the flag):
  // ignore it entirely so the checklist and its Continue CTA stay actionable.
  const backendStatus = deriveTenantOnboardingStatus(user);
  const staleCompleteCache =
    user?.profileSource === 'backend' && !user.onboardingCompleted && localCache.isComplete;
  const localCompletedSteps = staleCompleteCache ? [] : localCache.completedSteps;
  const steps = SETUP_STEPS.map(step => ({
    ...step,
    completed:
      localCompletedSteps.includes(step.id) ||
      (step.key === 'basic'
        ? backendStatus.basicInfoComplete
        : backendStatus.preferencesComplete),
  }));

  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);
  const allComplete = completedCount >= totalSteps;
  const nextIncompleteStep = allComplete ? null : steps.find(s => !s.completed);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Welcome Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-sm font-medium text-fg-muted dark:text-fg-subtle mb-1">
            {greeting}
          </p>
          <h1 className="text-3xl md:text-4xl font-medium text-fg dark:text-white tracking-tight">
            {locale === 'es' ? `Hola, ${firstName}` : `Hi, ${firstName}`}
          </h1>
          <p className="mt-2 text-fg-muted dark:text-fg-subtle">
            {/* "aplicar" está muerto: docs/VOCABULARIO.md */}
            {locale === 'es'
              ? 'Completa tu perfil para postularte más rápido'
              : 'Complete your profile to apply to properties faster'}
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Progress Card - Clean Style */}
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-surface-muted flex items-center justify-center">
                    <ClipboardText weight="duotone" className="w-7 h-7 text-fg-subtle dark:text-fg-muted" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-fg dark:text-white">
                      {locale === 'es' ? 'Configura tu perfil' : 'Set up your profile'}
                    </h2>
                    <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
                      {locale === 'es'
                        ? `${completedCount} de ${totalSteps} pasos completados`
                        : `${completedCount} of ${totalSteps} steps completed`}
                    </p>
                  </div>
                </div>
                {nextIncompleteStep && (
                  <Link
                    href={nextIncompleteStep.href}
                    className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-surface dark:bg-ink text-fg border border-border dark:border-border-strong hover:border-border dark:hover:border-border-strong hover:shadow-sm active:scale-[0.98] transition-all duration-150"
                  >
                    {locale === 'es' ? 'Continuar' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative">
                <div className="h-2 bg-surface-muted dark:bg-surface-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-ink dark:bg-surface rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-fg-muted dark:text-fg-subtle">
                    {progressPercentage}% {locale === 'es' ? 'completado' : 'complete'}
                  </span>
                  <span className="text-sm text-fg-muted dark:text-fg-subtle font-medium">
                    {locale === 'es' ? `${totalSteps - completedCount} restantes` : `${totalSteps - completedCount} remaining`}
                  </span>
                </div>
              </div>

              {/* Mobile CTA */}
              {nextIncompleteStep && (
                <Link
                  href={nextIncompleteStep.href}
                  className="sm:hidden mt-6 w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-medium bg-surface dark:bg-ink text-fg border border-border dark:border-border-strong hover:border-border dark:hover:border-border-strong hover:shadow-sm active:scale-[0.98] transition-all duration-150"
                >
                  {locale === 'es' ? 'Continuar' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Setup Steps List */}
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
              <h3 className="text-base font-semibold text-fg dark:text-white mb-4">
                {locale === 'es' ? 'Pasos para completar' : 'Steps to complete'}
              </h3>
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isNext = !step.completed && steps.slice(0, index).every(s => s.completed);

                  return (
                    <Link
                      key={step.id}
                      href={step.href}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl transition-all group',
                        step.completed
                          ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                          : isNext
                          ? 'bg-surface dark:bg-[#222224] border border-border dark:border-border-strong hover:border-border dark:hover:border-border-strong'
                          : 'bg-surface/50 dark:bg-[#1f1f21] border border-border-faint dark:border-border-strong opacity-60 hover:opacity-100'
                      )}
                    >
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                        step.completed
                          ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                          : isNext
                          ? 'bg-ink dark:bg-surface'
                          : 'bg-surface-muted dark:bg-ink'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                        ) : isNext ? (
                          <Play className="w-5 h-5 text-white dark:text-fg fill-current" />
                        ) : (
                          <Icon className="w-5 h-5 text-fg-subtle dark:text-fg-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm',
                          step.completed
                            ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                            : isNext
                            ? 'text-fg dark:text-white'
                            : 'text-fg-muted dark:text-fg-subtle'
                        )}>
                          {locale === 'es' ? step.labelEs : step.labelEn}
                        </p>
                        <p className="text-xs text-fg-muted dark:text-fg-muted mt-0.5">
                          {locale === 'es' ? step.descriptionEs : step.descriptionEn}
                        </p>
                      </div>
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                        step.completed
                          ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                          : 'bg-surface-muted dark:bg-ink'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                        ) : (
                          <CaretRight className="w-4 h-4 text-fg-subtle dark:text-fg-muted transition-transform group-hover:translate-x-0.5" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Benefits Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Lightning,
                  titleEs: 'Aplica más rápido',
                  titleEn: 'Apply faster',
                  descEs: 'Postula en segundos',
                  descEn: 'Apply in seconds',
                },
                {
                  icon: Shield,
                  titleEs: 'Mayor confianza',
                  titleEn: 'More trust',
                  descEs: 'Perfil verificado',
                  descEn: 'Verified profile',
                },
                {
                  icon: Star,
                  titleEs: 'Mejor posición',
                  titleEn: 'Better position',
                  descEs: 'Destaca entre otros',
                  descEn: 'Stand out',
                },
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.titleEs}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center mb-3">
                    <benefit.icon weight="duotone" className="w-5 h-5 text-fg-subtle dark:text-fg-muted" />
                  </div>
                  <p className="font-semibold text-fg dark:text-white text-sm">
                    {locale === 'es' ? benefit.titleEs : benefit.titleEn}
                  </p>
                  <p className="text-xs text-fg-muted dark:text-fg-subtle mt-1">
                    {locale === 'es' ? benefit.descEs : benefit.descEn}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Actions */}
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-5">
              <h3 className="text-base font-semibold text-fg dark:text-white mb-4">
                {locale === 'es' ? 'Acciones rápidas' : 'Quick actions'}
              </h3>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.labelEs}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface dark:bg-[#222224] hover:bg-surface-muted dark:hover:bg-[#2a2a2c] transition-colors group border border-border-faint dark:border-border-strong"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-ink flex items-center justify-center group-hover:bg-surface-muted dark:group-hover:bg-surface-muted transition-colors">
                      <action.icon className="w-5 h-5 text-fg-muted dark:text-fg-subtle group-hover:text-fg dark:group-hover:text-white transition-colors" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-fg dark:text-fg-subtle group-hover:text-fg dark:group-hover:text-white transition-colors">
                      {locale === 'es' ? action.labelEs : action.labelEn}
                    </span>
                    <CaretRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted dark:group-hover:text-fg-subtle group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Tip Card */}
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                  <TrendUp weight="duotone" className="w-5 h-5 text-fg-subtle dark:text-fg-muted" />
                </div>
                <div>
                  <h4 className="font-semibold text-fg dark:text-white text-sm mb-1">
                    {locale === 'es' ? '¿Sabías que?' : 'Did you know?'}
                  </h4>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle leading-relaxed">
                    {locale === 'es'
                      ? 'Los perfiles completos tienen 3x más probabilidades de ser aprobados.'
                      : 'Complete profiles are 3x more likely to be approved.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-5">
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
                className="inline-flex items-center gap-2 text-sm font-medium text-fg dark:text-fg-subtle hover:text-fg dark:hover:text-white transition-colors"
              >
                {locale === 'es' ? 'Ir al centro de ayuda' : 'Go to help center'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
