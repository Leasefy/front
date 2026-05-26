'use client';

import React from 'react';
import Link from 'next/link';
import { Clock } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

export default function CotizadorPlaceholderPage() {
  const { t } = useI18n();

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-teal-50 dark:bg-teal-950/30">
          <Clock weight="duotone" className="h-7 w-7 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cotizador.placeholder.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
            {t('inmobiliaria.ai.cotizador.placeholder.subtitle')}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/30 text-xs font-medium text-teal-600 dark:text-teal-400">
          {t('inmobiliaria.ai.cotizador.placeholder.phase')}
        </span>
        <Link
          href="/panel/inmobiliaria/ai"
          className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors underline-offset-2 hover:underline"
        >
          {t('inmobiliaria.ai.cotizador.placeholder.backLink')}
        </Link>
      </div>
    </div>
  );
}
