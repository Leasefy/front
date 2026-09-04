'use client';

/**
 * Seguridad de tu cuenta: doble factor (real, `MfaSetupSection`) y los dos
 * accesos que todavía no tienen pantalla propia —cambiar contraseña y sesiones
 * activas—, que dicen exactamente qué hacer en vez de fingir que abren algo.
 */

import { toast } from 'sonner';
import { CaretRight, Lock, Monitor } from '@phosphor-icons/react';

import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';

export function SeccionSeguridad() {
  const { t } = useI18n();

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="divide-y divide-border">
        <MfaSetupSection />

        <Button
          variant="ghost"
          hideArrow
          onClick={() =>
            toast.info(t('inmobiliaria.config.security.changePassword'), {
              description: t('inmobiliaria.config.security.changePasswordToast'),
            })
          }
          className="flex h-auto w-full items-center justify-between rounded-none px-4 py-4 text-left hover:bg-surface-muted/60 sm:px-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
              <Lock className="h-[18px] w-[18px] text-fg-muted" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-medium text-fg">
                {t('inmobiliaria.config.security.changePassword')}
              </span>
              <span className="block text-sm text-fg-muted">
                {t('inmobiliaria.config.security.changePasswordDesc')}
              </span>
            </span>
          </span>
          <CaretRight className="h-4 w-4 shrink-0 text-fg-muted" />
        </Button>

        <Button
          variant="ghost"
          hideArrow
          onClick={() =>
            toast.info(t('inmobiliaria.config.security.activeSessions'), {
              description: t('inmobiliaria.config.security.activeSessionsDesc'),
            })
          }
          className="flex h-auto w-full items-center justify-between rounded-none px-4 py-4 text-left hover:bg-surface-muted/60 sm:px-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
              <Monitor className="h-[18px] w-[18px] text-fg-muted" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-medium text-fg">
                {t('inmobiliaria.config.security.activeSessions')}
              </span>
              <span className="block text-sm text-fg-muted">
                {t('inmobiliaria.config.security.activeSessionsDesc')}
              </span>
            </span>
          </span>
          <CaretRight className="h-4 w-4 shrink-0 text-fg-muted" />
        </Button>
      </div>
    </section>
  );
}
