'use client';

import Link from 'next/link';
import { Appear } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
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
    es: 'Para postularte a inmuebles y ver tus postulaciones, completa tu perfil.',
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
    es: 'Para guardar los inmuebles que te gustan, completa tu perfil.',
    en: 'To save the homes you like, complete your profile.',
  },
};

/**
 * Empty state shown when a tenant hasn't completed onboarding
 * Used on sub-pages (arriendo, aplicaciones, pagos, etc.) to encourage profile completion
 */
export function CompleteProfileFirst({ context = 'rental' }: CompleteProfileFirstProps) {
  const { locale } = useI18n();
  const { completedSteps, totalSteps } = useOnboardingStatus();

  const contextMessage = CONTEXT_MESSAGES[context];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      {/* Como un vacío del sistema: aparece después de cargar (8 px, `Appear`). */}
      <Appear className="max-w-md w-full text-center">
        {/* GLOW UP 22-10: el ícono suelto (antes, en una caja azul con borde azul). */}
        <ClipboardText className="w-8 h-8 mx-auto mb-4 text-fg-muted" aria-hidden="true" />

        {/* Title */}
        <h2 className="text-h3 text-fg mb-3">
          {locale === 'es' ? 'Completa tu perfil' : 'Complete your profile'}
        </h2>

        {/* Context-specific message */}
        <p className="text-fg-muted mb-6 leading-relaxed">
          {locale === 'es' ? contextMessage.es : contextMessage.en}
        </p>

        {/* El avance en una línea y sus pasos en contorno (antes, además una barra azul que decía lo mismo). */}
        <p className="mb-3 text-sm text-fg-muted" data-testid="avance-del-perfil">
          {locale === 'es' ? 'Llevas ' : 'You have '}
          <span className="font-mono tabular-nums text-fg">{completedSteps.length}/{totalSteps}</span>
          {locale === 'es' ? ' pasos' : ' steps done'}
        </p>

        {/* Steps preview */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isCompleted = completedSteps.includes(stepNumber);
            return (
              <div
                key={stepNumber}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center bg-surface font-mono text-sm tabular-nums transition-colors',
                  isCompleted
                    ? 'border border-success text-success'
                    : 'border border-border text-fg-subtle'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" aria-label={locale === 'es' ? `Paso ${stepNumber}, hecho` : `Step ${stepNumber}, done`} />
                ) : (
                  stepNumber
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        {/* El botón de la casa, y dice lo que pasa (antes, un enlace pintado a mano con «Comenzar ahora»). */}
        <Button asChild hideArrow>
          <Link href="/onboarding/inquilino">
            {completedSteps.length > 0
              ? (locale === 'es' ? 'Seguir con mi perfil' : 'Continue my profile')
              : (locale === 'es' ? 'Completar mi perfil' : 'Complete my profile')}
          </Link>
        </Button>

        {/* Secondary link */}
        <p className="mt-4 text-sm text-fg-muted">
          {locale === 'es' ? '¿Prefieres explorar primero?' : 'Prefer to explore first?'}{' '}
          <Link href="/inquilino/explorar" className="text-primary underline-offset-4 hover:underline">
            {locale === 'es' ? 'Ver inmuebles' : 'Browse homes'}
          </Link>
        </p>
      </Appear>
    </div>
  );
}
