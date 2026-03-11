'use client';

import Link from 'next/link';
import { CaretLeft, Buildings } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { ConsignacionWizard } from '@/components/inmobiliaria/ConsignacionWizard';
import { usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';

export default function NuevaConsignacionPage() {
  const { t } = useI18n();
  const { propietarios } = usePropietarios();
  const { agentes } = useAgentes();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0c0c0d]">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          {/* Back Link */}
          <Link
            href="/panel/inmobiliaria/portafolio"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors w-fit"
          >
            <CaretLeft className="w-4 h-4" />
            {t('inmobiliaria.portafolio.detail.backToPortfolio')}
          </Link>

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Buildings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {t('inmobiliaria.portafolio.new.title')}
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400">
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
    </div>
  );
}
