'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Play, CreditCard, CaretRight, Check, ArrowRight, Shield, Lightning, Users, Buildings, Clock, TrendUp, X, VideoCamera, FileText, ChartBar, ChartBarHorizontal } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';

// ============================================================================
// TextTs
// ============================================================================

interface SetupStep {
  id: string;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: React.ElementType;
  href?: string;
  action?: 'video' | 'modal';
  completed: boolean;
}

// ============================================================================
// Setup Steps Configuration
// ============================================================================

const getSetupSteps = (hasProperty: boolean): SetupStep[] => [
  {
    id: 'create_account',
    labelEs: 'Crear tu cuenta',
    labelEn: 'Create your account',
    descriptionEs: 'Te registraste en Leasefy',
    descriptionEn: 'You signed up for Leasefy',
    icon: Check,
    completed: true, // Always completed
  },
  {
    id: 'watch_intro',
    labelEs: 'Conoce la plataforma',
    labelEn: 'Learn the platform',
    descriptionEs: 'VideoCamera de 2 min sobre cómo funciona',
    descriptionEn: '2 min video on how it works',
    icon: VideoCamera,
    action: 'video',
    completed: false,
  },
  {
    id: 'publish_property',
    labelEs: 'Publica tu propiedad',
    labelEn: 'List your property',
    descriptionEs: 'Llega a miles de inquilinos verificados',
    descriptionEn: 'Reach thousands of verified tenants',
    icon: Plus,
    href: '/publicar?from=panel',
    completed: hasProperty,
  },
  {
    id: 'setup_payments',
    labelEs: 'Configura tus cobros',
    labelEn: 'Set up payments',
    descriptionEs: 'Recibe el arriendo automáticamente',
    descriptionEn: 'Receive rent automatically',
    icon: CreditCard,
    href: '/panel/configuracion',
    completed: false,
  },
];

// ============================================================================
// VideoCamera Modal Component
// ============================================================================

function VideoCameraModal({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete: () => void }) {
  const { locale } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-surface rounded-lg overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* VideoCamera placeholder - replace with actual video embed */}
        <div className="aspect-video bg-neutral-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Play className="w-10 h-10 text-white fill-white" />
            </div>
            <p className="text-white/60 text-sm">
              {locale === 'es' ? 'VideoCamera introductorio' : 'Intro video'}
            </p>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-fg mb-2">
            {locale === 'es' ? 'Cómo funciona Leasefy' : 'How Leasefy works'}
          </h3>
          <p className="text-sm text-fg-muted mb-4">
            {locale === 'es'
              ? 'Descubre cómo publicar tu propiedad, recibir aplicaciones verificadas y cobrar tu arriendo de forma segura.'
              : 'Learn how to list your property, receive verified applications, and collect rent securely.'}
          </p>
          <button
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="w-full py-3 bg-fg text-bg font-semibold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            {locale === 'es' ? 'Entendido, continuar' : 'Got it, continue'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LandlordDashboardEmpty() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || (locale === 'es' ? 'Propietario' : 'Owner');

  const [videoModalOpen, setVideoCameraModalOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(['create_account']);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('plan_getting_started');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompletedSteps(parsed.completedSteps || ['create_account']);
        setIsCollapsed(parsed.isCollapsed || false);
      } catch (e) {
        console.error('Error loading progress:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // FloppyDisk progress to localStorage
  const saveProgress = (steps: string[], collapsed: boolean) => {
    localStorage.setItem('plan_getting_started', JSON.stringify({
      completedSteps: steps,
      isCollapsed: collapsed,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const markStepComplete = (stepId: string) => {
    const updated = [...completedSteps, stepId];
    setCompletedSteps(updated);
    saveProgress(updated, isCollapsed);
  };

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    saveProgress(completedSteps, newCollapsed);
  };

  // Check if user has any properties (in real app, this would come from API)
  const hasProperty = false; // TODO: Replace with actual check

  const steps = getSetupSteps(hasProperty).map(step => ({
    ...step,
    completed: completedSteps.includes(step.id) || step.id === 'create_account',
  }));

  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);
  const nextStep = steps.find(s => !s.completed);

  if (!isLoaded) return null;

  const handleStepClick = (step: SetupStep) => {
    if (step.completed) return;

    if (step.action === 'video') {
      setVideoCameraModalOpen(true);
    } else if (step.href) {
      // Compass handled by Link
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Welcome Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm font-medium text-fg-muted mb-1">
            {greeting}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium text-fg tracking-tight">
            {locale === 'es' ? `Bienvenido, ${firstName}` : `Welcome, ${firstName}`} 👋
          </h1>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Getting Started Widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg bg-surface overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={toggleCollapsed}
                className="w-full p-6 flex items-center justify-between hover:bg-surface-muted transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">🚀</div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-fg">
                      {locale === 'es' ? 'Primeros pasos' : 'Getting started'}
                    </h2>
                    <p className="text-sm text-fg-muted">
                      {completedCount === totalSteps
                        ? (locale === 'es' ? '¡Completado!' : 'Completed!')
                        : `${totalSteps - completedCount} ${locale === 'es' ? 'pasos restantes' : 'steps left'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Progress */}
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="w-32 h-2 bg-surface-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        className="h-full bg-fg rounded-full"
                      />
                    </div>
                    <span className="text-sm font-medium text-fg-muted">
                      {progressPercentage}%
                    </span>
                  </div>
                  <CaretRight className={cn(
                    'w-5 h-5 text-fg-subtle transition-transform',
                    !isCollapsed && 'rotate-90'
                  )} />
                </div>
              </button>

              {/* Steps List */}
              {!isCollapsed && (
                <div className="px-6 pb-6 space-y-2">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isNext = !step.completed && index === steps.findIndex(s => !s.completed);

                    const content = (
                      <div
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg transition-all',
                          step.completed
                            ? 'bg-success-soft dark:bg-[#2C7A53]/15'
                            : isNext
                            ? 'bg-surface border border-border cursor-pointer hover:border-border-strong'
                            : 'bg-surface opacity-50'
                        )}
                        onClick={() => !step.href && handleStepClick(step)}
                      >
                        {/* Icon/Check */}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          step.completed
                            ? 'bg-success-soft dark:bg-[#2C7A53]/15'
                            : isNext
                            ? 'bg-fg'
                            : 'bg-surface-muted'
                        )}>
                          {step.completed ? (
                            <Check className="w-5 h-5 text-success dark:text-[#3EAE70]" strokeWidth={2.5} />
                          ) : (
                            <Icon className={cn(
                              'w-5 h-5',
                              isNext ? 'text-bg' : 'text-fg-subtle'
                            )} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'font-medium',
                            step.completed
                              ? 'text-success dark:text-[#3EAE70]'
                              : 'text-fg'
                          )}>
                            {locale === 'es' ? step.labelEs : step.labelEn}
                          </p>
                          <p className="text-sm text-fg-muted mt-0.5">
                            {locale === 'es' ? step.descriptionEs : step.descriptionEn}
                          </p>
                        </div>

                        {/* Action */}
                        {!step.completed && isNext && (
                          <div className="flex items-center gap-2">
                            {step.action === 'video' && (
                              <span className="text-sm font-medium text-fg">
                                {locale === 'es' ? 'Ver video' : 'Watch'}
                              </span>
                            )}
                            <CaretRight className="w-5 h-5 text-fg-subtle" />
                          </div>
                        )}
                      </div>
                    );

                    if (step.href && !step.completed && isNext) {
                      return (
                        <Link key={step.id} href={step.href}>
                          {content}
                        </Link>
                      );
                    }

                    return <div key={step.id}>{content}</div>;
                  })}
                </div>
              )}
            </motion.div>

            {/* Value Proposition Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {[
                {
                  icon: Shield,
                  titleEs: 'Protegemos tu inversión',
                  titleEn: 'We protect your investment',
                  descEs: 'Seguro contra impago hasta 24 meses',
                  descEn: 'Non-payment insurance up to 24 months',
                },
                {
                  icon: Users,
                  titleEs: 'Inquilinos verificados',
                  titleEn: 'Verified tenants',
                  descEs: 'Evaluación crediticia completa',
                  descEn: 'Complete credit evaluation',
                },
                {
                  icon: Lightning,
                  titleEs: 'Cobros automáticos',
                  titleEn: 'Automatic collection',
                  descEs: 'Recibe el arriendo puntual cada mes',
                  descEn: 'Receive rent on time every month',
                },
              ].map((card) => (
                <div
                  key={card.titleEs}
                  className="rounded-lg bg-surface p-5"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
                    <card.icon weight="duotone" className="w-5 h-5 text-fg-subtle" />
                  </div>
                  <h3 className="font-semibold text-fg mb-1">
                    {locale === 'es' ? card.titleEs : card.titleEn}
                  </h3>
                  <p className="text-sm text-fg-muted">
                    {locale === 'es' ? card.descEs : card.descEn}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Empty state for properties — estilo limpio canónico */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-muted">
                <Buildings weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[15px] font-semibold text-fg">
                  {locale === 'es' ? 'No tienes propiedades publicadas' : 'No published properties'}
                </p>
                <p className="text-sm text-fg-muted max-w-sm leading-relaxed mx-auto">
                  {locale === 'es'
                    ? 'Publica tu primera propiedad y comienza a recibir aplicaciones de inquilinos verificados.'
                    : 'List your first property and start receiving applications from verified tenants.'}
                </p>
              </div>
              <div className="mt-1">
                <Link
                  href="/publicar?from=panel"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-surface text-fg border border-border hover:border-border-strong hover:shadow-sm active:scale-[0.98] transition-all duration-150"
                >
                  <Plus className="w-4 h-4" />
                  {locale === 'es' ? 'Publicar propiedad' : 'List property'}
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Stats (placeholder) */}
            <div className="rounded-lg bg-surface p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendUp weight="duotone" className="w-5 h-5 text-fg-subtle" />
                <span className="text-sm font-medium text-fg-muted">
                  {locale === 'es' ? 'Tu potencial mensual' : 'Your monthly potential'}
                </span>
              </div>
              <p className="text-3xl font-bold text-fg mb-1">$0</p>
              <p className="text-sm text-fg-muted">
                {locale === 'es' ? 'Publica una propiedad para comenzar' : 'List a property to get started'}
              </p>
            </div>

            {/* Resources */}
            <div className="rounded-lg bg-surface p-5">
              <h3 className="font-semibold text-fg mb-4">
                {locale === 'es' ? 'Recursos útiles' : 'Helpful resources'}
              </h3>
              <div className="space-y-2">
                {[
                  { icon: FileText, labelEs: 'Guía para propietarios', labelEn: 'Landlord guide', href: '/ayuda/propietarios' },
                  { icon: ChartBar, labelEs: 'Precios del mercado', labelEn: 'Market prices', href: '/propiedades' },
                  { icon: Shield, labelEs: 'Cómo funciona el seguro', labelEn: 'How insurance works', href: '/productos/asegurabilidad' },
                ].map((resource) => (
                  <Link
                    key={resource.labelEs}
                    href={resource.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center group-hover:bg-surface-muted transition-colors">
                      <resource.icon className="w-5 h-5 text-fg-muted" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-fg-muted">
                      {locale === 'es' ? resource.labelEs : resource.labelEn}
                    </span>
                    <CaretRight className="w-4 h-4 text-fg-subtle group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Need help */}
            <div className="rounded-lg bg-surface p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                  <Clock weight="duotone" className="w-5 h-5 text-fg-subtle" />
                </div>
                <div>
                  <h4 className="font-medium text-fg mb-1">
                    {locale === 'es' ? '¿Necesitas ayuda?' : 'Need help?'}
                  </h4>
                  <p className="text-sm text-fg-muted mb-3">
                    {locale === 'es'
                      ? 'Nuestro equipo responde en menos de 2 horas.'
                      : 'Our team responds in under 2 hours.'}
                  </p>
                  <Link
                    href="/ayuda"
                    className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
                  >
                    {locale === 'es' ? 'Contactar soporte' : 'Contact support'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* VideoCamera Modal */}
      <VideoCameraModal
        open={videoModalOpen}
        onClose={() => setVideoCameraModalOpen(false)}
        onComplete={() => markStepComplete('watch_intro')}
      />
    </div>
  );
}
