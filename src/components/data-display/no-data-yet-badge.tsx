'use client';

import { Hourglass } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

interface NoDataYetBadgeProps {
  reason: string;
  phase: number;
  cta?: string;
  ctaHref?: string;
}

export function NoDataYetBadge({ reason, phase, cta, ctaHref }: NoDataYetBadgeProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30 px-6 py-8 flex flex-col items-center gap-3 text-center">
      <Hourglass weight="duotone" className="h-8 w-8 text-neutral-400" />
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {t('inmobiliaria.ai.cotizador.noDataYet.heading')}
      </p>
      <p className="text-xs text-neutral-500 max-w-xs">{reason}</p>
      <span className="text-xs bg-neutral-200 dark:bg-neutral-700 rounded-full px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
        Fase {phase}
      </span>
      {cta && (
        <a href={ctaHref ?? '#'} className="text-xs text-indigo-500 underline hover:text-indigo-600">
          {cta}
        </a>
      )}
    </div>
  );
}
