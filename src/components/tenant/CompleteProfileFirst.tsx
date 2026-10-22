'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Appear, motionDuration, motionEase } from '@leasefy/cadence';
import { CheckCircle, ClipboardText } from '@phosphor-icons/react';
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
      {/* Como un vacío del sistema: aparece después de cargar (8 px, `Appear`). */}
      <Appear className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-lg bg-[#EEF1FF] border border-[#1A40FF]/30 flex items-center justify-center">
          <ClipboardText className="w-10 h-10 text-[#1A40FF]" />
        </div>

        {/* Title */}
        <h2 className="text-h3 text-fg mb-3">
          {locale === 'es' ? 'Completa tu perfil' : 'Complete your profile'}
        </h2>

        {/* Context-specific message */}
        <p className="text-fg-muted mb-6 leading-relaxed">
          {locale === 'es' ? contextMessage.es : contextMessage.en}
        </p>

        {/* Progress indicator */}
        <div className="mb-8 px-4">
          <div className="flex items-center justify-between text-sm text-fg-muted mb-2">
            <span>
              {locale === 'es' ? 'Progreso del perfil' : 'Profile progress'}
            </span>
            <span className="font-medium text-fg">
              {completedSteps.length}/{totalSteps}
            </span>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            {/* Se llena con `transform` (translateX), no con `width`. */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: `${progressPercentage - 100}%` }}
              transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
              className="h-full w-full bg-[#1A40FF] rounded-full"
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
                    ? 'bg-[#E8F3EC] text-[#2C7A53]'
                    : 'bg-surface-muted text-fg-subtle'
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
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A40FF] hover:opacity-90 text-white font-medium rounded-full transition-colors"
        >
          {completedSteps.length > 0
            ? (locale === 'es' ? 'Continuar perfil' : 'Continue profile')
            : (locale === 'es' ? 'Comenzar ahora' : 'Get started')}
        </Link>

        {/* Secondary link */}
        <p className="mt-4 text-sm text-fg-muted">
          {locale === 'es' ? '¿Prefieres explorar primero?' : 'Prefer to explore first?'}{' '}
          <Link
            href="/inquilino/explorar"
            className="text-[#1A40FF] hover:text-[#1A40FF] font-medium"
          >
            {locale === 'es' ? 'Ver propiedades' : 'Browse properties'}
          </Link>
        </p>
      </Appear>
    </div>
  );
}
