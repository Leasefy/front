'use client';

import { useRouter } from 'next/navigation';
import { CaretLeft, Sparkle } from '@phosphor-icons/react';
import { PageGuard } from '@/components/auth/PageGuard';
import { useI18n } from '@/lib/i18n';
import { PropertyIACapture } from '@/components/inmobiliaria/PropertyIACapture';

function CapturaContent() {
  const router = useRouter();
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.propertyIA.${s}`;

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="space-y-4">
        <button
          onClick={() => router.push('/panel/inmobiliaria/propiedades')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          {t(k('back'))}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Sparkle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" weight="fill" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t(k('pageTitle'))}</h1>
            <p className="text-muted-foreground text-sm">{t(k('pageSubtitle'))}</p>
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
