'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { Buildings } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/ui';
import { ConsignacionWizard } from '@/components/inmobiliaria/ConsignacionWizard';
import { usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';

function NuevaConsignacionContent() {
  const { t } = useI18n();
  const { propietarios } = usePropietarios();
  const { agentes } = useAgentes();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Back Link */}
        <BackButton
          href="/panel/inmobiliaria/portafolio"
          label={t('inmobiliaria.portafolio.detail.backToPortfolio')}
        />

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Buildings className="w-6 h-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {t('inmobiliaria.portafolio.new.title')}
            </h1>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.portafolio.new.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <ConsignacionWizard
        propietarios={propietarios}
        agentes={agentes}
      />
    </div>
  );
}

export default function NuevaConsignacionPage() {
  return (
    <PageGuard module="portafolio">
      <NuevaConsignacionContent />
    </PageGuard>
  );
}
