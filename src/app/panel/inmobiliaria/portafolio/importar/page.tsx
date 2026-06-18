'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { FileArrowUp } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/ui';
import { ImportWizard } from '@/components/inmobiliaria/import/ImportWizard';

function ImportarContent() {
  const { t } = useI18n();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back Link */}
      <BackButton
        href="/panel/inmobiliaria/portafolio"
        label={t('inmobiliaria.portafolio.detail.backToPortfolio')}
      />

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
          <FileArrowUp className="w-6 h-6 text-primary" weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.import.title')}
          </h1>
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.import.subtitle')}
          </p>
        </div>
      </div>

      {/* Wizard */}
      <ImportWizard />
    </div>
  );
}

export default function ImportarPage() {
  return (
    <PageGuard module="portafolio">
      <ImportarContent />
    </PageGuard>
  );
}
