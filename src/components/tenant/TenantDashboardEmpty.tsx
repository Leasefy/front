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

  const [steps, setSteps] = useState(SETUP_STEPS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from localStorage (migrate old 3-step data to 2-step)
  useEffect(() => {
    const loadProgress = () => {
      const saved = localStorage.getItem('plan_onboarding_tenant');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const completedSteps = (parsed.completedSteps || []).filter((s: number) => s <= 2);

          // Migrate: if old data had step 3 completed (employment, now removed),
          // treat step 2 as completed since it was the old step 3 (preferences)
          const oldCompletedSteps = parsed.completedSteps || [];
          if (oldCompletedSteps.includes(3) && !completedSteps.includes(2)) {
            completedSteps.push(2);
          }

          setSteps(prev =>
            prev.map(step => ({
              ...step,
              completed: completedSteps.includes(step.id),
            }))
          );
        } catch (e) {
          console.error('Error loading onboarding progress:', e);
        }
      }
      setIsLoaded(true);
    };

    // Load on mount
    loadProgress();

    // Listen for onboarding updates (dispatched by TenantOnboardingContext)
    const handleOnboardingUpdate = () => {
      loadProgress();
    };

    window.addEventListener('onboarding-updated', handleOnboardingUpdate);

    return () => {
      window.removeEventListener('onboarding-updated', handleOnboardingUpdate);
    };
  }, []);

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
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {greeting}
          </p>
          <h1 className="text-3xl md:text-4xl font-medium text-neutral-900 dark:text-white tracking-tight">
            {locale === 'es' ? `Hola, ${firstName}` : `Hi, ${firstName}`}
          </h1>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {locale === 'es'
              ? 'Completa tu perfil para aplicar a propiedades más rápido'
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
            <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center">
                    <ClipboardText weight="duotone" className="w-7 h-7 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                      {locale === 'es' ? 'Configura tu perfil' : 'Set up your profile'}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {locale === 'es'
                        ? `${completedCount} de ${totalSteps} pasos completados`
                        : `${completedCount} of ${totalSteps} steps completed`}
                    </p>
                  </div>
                </div>
                {nextIncompleteStep && (
                  <Link
                    href={nextIncompleteStep.href}
                    className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 hover:shadow-sm active:scale-[0.98] transition-all duration-150"
                  >
                    {locale === 'es' ? 'Continuar' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative">
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-neutral-900 dark:bg-white rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {progressPercentage}% {locale === 'es' ? 'completado' : 'complete'}
                  </span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                    {locale === 'es' ? `${totalSteps - completedCount} restantes` : `${totalSteps - completedCount} remaining`}
                  </span>
                </div>
              </div>

              {/* Mobile CTA */}
              {nextIncompleteStep && (
                <Link
                  href={nextIncompleteStep.href}
                  className="sm:hidden mt-6 w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-medium bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 hover:shadow-sm active:scale-[0.98] transition-all duration-150"
                >
                  {locale === 'es' ? 'Continuar' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Setup Steps List */}
            <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-6">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">
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
                          ? 'bg-white dark:bg-[#222224] border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                          : 'bg-white/50 dark:bg-[#1f1f21] border border-neutral-100 dark:border-neutral-800 opacity-60 hover:opacity-100'
                      )}
                    >
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                        step.completed
                          ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                          : isNext
                          ? 'bg-neutral-900 dark:bg-white'
                          : 'bg-neutral-100 dark:bg-neutral-800'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                        ) : isNext ? (
                          <Play className="w-5 h-5 text-white dark:text-neutral-900 fill-current" />
                        ) : (
                          <Icon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm',
                          step.completed
                            ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                            : isNext
                            ? 'text-neutral-900 dark:text-white'
                            : 'text-neutral-600 dark:text-neutral-400'
                        )}>
                          {locale === 'es' ? step.labelEs : step.labelEn}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                          {locale === 'es' ? step.descriptionEs : step.descriptionEn}
                        </p>
                      </div>
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                        step.completed
                          ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                          : 'bg-neutral-100 dark:bg-neutral-800'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                        ) : (
                          <CaretRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform group-hover:translate-x-0.5" />
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
                  className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center mb-3">
                    <benefit.icon weight="duotone" className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                    {locale === 'es' ? benefit.titleEs : benefit.titleEn}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
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
            <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">
                {locale === 'es' ? 'Acciones rápidas' : 'Quick actions'}
              </h3>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.labelEs}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#222224] hover:bg-neutral-50 dark:hover:bg-[#2a2a2c] transition-colors group border border-neutral-100 dark:border-neutral-800"
                  >
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                      <action.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                      {locale === 'es' ? action.labelEs : action.labelEn}
                    </span>
                    <CaretRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Tip Card */}
            <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center flex-shrink-0">
                  <TrendUp weight="duotone" className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                    {locale === 'es' ? '¿Sabías que?' : 'Did you know?'}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {locale === 'es'
                      ? 'Los perfiles completos tienen 3x más probabilidades de ser aprobados.'
                      : 'Complete profiles are 3x more likely to be approved.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5">
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
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
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
