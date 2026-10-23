'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

/** El back no respondió: se dice, con la salida a la lista. Nunca un formulario que no sabe a quién va. */
export function ArcoNoAbrio() {
  const { t } = useI18n();
  return (
    <div className="w-full max-w-xl space-y-3 rounded-lg border border-border bg-surface p-6 text-center shadow-xs sm:p-8" role="alert">
      <h1 className="text-balance font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg sm:text-[30px]">{t('inmobiliaria.ai.arco.public.title')}</h1>
      <p className="text-body-sm text-fg-muted">{t('inmobiliaria.ai.arco.public.noAbrio')}</p>
      <Link href="/arco" className="inline-block text-body-sm text-fg underline underline-offset-4 hover:text-fg-muted">
        {t('inmobiliaria.ai.arco.public.elegir.titulo')}
      </Link>
    </div>
  );
}
