'use client';

import { useRouter } from 'next/navigation';
import { Sparkle } from '@phosphor-icons/react';
import { PageGuard } from '@/components/auth/PageGuard';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/cadence';
import { PropertyIACapture } from '@/components/inmobiliaria/PropertyIACapture';

function CapturaContent() {
  const router = useRouter();
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.propertyIA.${s}`;

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="space-y-4">
        <BackButton
          label={t(k('back'))}
          onClick={() => router.push('/panel/inmobiliaria/inmuebles')}
        />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Sparkle className="w-6 h-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-h2 text-fg">{t(k('pageTitle'))}</h1>
            <p className="text-sm text-fg-muted line-clamp-2 max-w-2xl">{t(k('pageSubtitle'))}</p>
          </div>
        </div>
      </div>

      <PropertyIACapture />
    </div>
  );
}

export default function CapturaPropiedadPage() {
  return (
    <PageGuard module="portafolio">
      <CapturaContent />
    </PageGuard>
  );
}
