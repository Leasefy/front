'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserCircle, ArrowRight, CheckCircle, ClipboardText } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { cn } from '@/lib/utils';

interface CompleteProfileFirstProps {
  /** The page context for messaging (e.g., 'rental', 'applications', 'payments') */
  context?: 'rental' | 'applications' | 'payments' | 'documents' | 'messages' | 'saved';
}

const CONTEXT_MESSAGES = {
  rental: {
    es: 'Para ver tus arriendos activos, primero completa tu perfil.',
    en: 'To view your active rentals, first complete your profile.',
  },
  applications: {
    es: 'Para postular a propiedades y ver tus aplicaciones, completa tu perfil.',
    en: 'To apply to properties and view your applications, complete your profile.',
  },
  payments: {
    es: 'Para gestionar tus pagos, primero completa tu perfil.',
    en: 'To manage your payments, first complete your profile.',
  },
  documents: {
    es: 'Para acceder a tus documentos, primero completa tu perfil.',
    en: 'To access your documents, first complete your profile.',
  },
  messages: {
    es: 'Para ver tus mensajes con propietarios, completa tu perfil.',
    en: 'To view messages with landlords, complete your profile.',
  },
  saved: {
    es: 'Para guardar propiedades favoritas, completa tu perfil.',
    en: 'To save favorite properties, complete your profile.',
  },
};

/**
 * Empty state shown when a tenant hasn't completed onboarding
 * Used on sub-pages (arriendo, aplicaciones, pagos, etc.) to encourage profile completion
 */
export function CompleteProfileFirst({ context = 'rental' }: CompleteProfileFirstProps) {
  const { locale } = useI18n();
  const { progressPercentage, completedSteps, totalSteps } = useOnboardingStatus();

  const contextMessage = CONTEXT_MESSAGES[context];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-950/50 dark:to-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center">
          <ClipboardText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-3">
          {locale === 'es' ? 'Completa tu perfil' : 'Complete your profile'}
        </h2>

        {/* Context-specific message */}
        <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
          {locale === 'es' ? contextMessage.es : contextMessage.en}
        </p>

        {/* Progress indicator */}
        <div className="mb-8 px-4">
          <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            <span>
              {locale === 'es' ? 'Progreso del perfil' : 'Profile progress'}
            </span>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {completedSteps.length}/{totalSteps}
            </span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-indigo-600 dark:bg-indigo-600 rounded-full"
            />
          </div>
        </div>

        {/* Steps preview */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isCompleted = completedSteps.includes(stepNumber);
            return (
              <div
                key={stepNumber}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <Link
          href="/onboarding/inquilino"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white uppercase tracking-wide font-mono font-medium rounded-full transition-colors"
        >
          {completedSteps.length > 0
            ? (locale === 'es' ? 'Continuar perfil' : 'Continue profile')
            : (locale === 'es' ? 'Comenzar ahora' : 'Get started')}
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Secondary link */}
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          {locale === 'es' ? '¿Prefieres explorar primero?' : 'Prefer to explore first?'}{' '}
          <Link
            href="/inquilino/explorar"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            {locale === 'es' ? 'Ver propiedades' : 'Browse properties'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
