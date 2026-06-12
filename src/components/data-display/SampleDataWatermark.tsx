'use client';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface SampleDataWatermarkProps {
  children: React.ReactNode;
  show: boolean;
  copy?: string; // optional override for watermark text
}

export function SampleDataWatermark({ children, show, copy }: SampleDataWatermarkProps) {
  const { t } = useI18n();
  const label = copy ?? t('inmobiliaria.ai.cobranza.analitica.sampleDataWatermark');

  if (!show) {
    return <div className="relative">{children}</div>;
  }

  return (
    <div className="relative">
      {children}
      {/* Badge — top-right corner */}
      <div className="absolute top-3 right-3 z-10">
        <span
          role="note"
          aria-label={label}
          className={cn(
            'inline-flex items-center text-[11px] font-medium',
            'text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700',
            'rounded-full px-2 py-0.5 bg-neutral-50 dark:bg-neutral-900/30'
          )}
        >
          {label}
        </span>
      </div>
      {/* Diagonal overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <span className="text-neutral-300 dark:text-neutral-700 text-4xl font-bold opacity-15 rotate-[-15deg] mix-blend-multiply dark:mix-blend-screen tracking-widest uppercase whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}
