'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

/** El back no respondió: se dice, con la salida a la lista. Nunca un formulario que no sabe a quién va. */
export function ArcoNoAbrio() {
  const { t } = useI18n();
  return (
    <div className="w-full max-w-xl rounded-[22px] border border-border bg-surface p-8 text-center" role="alert">
      <h1 className="text-2xl font-semibold font-heading text-fg mb-3">{t('inmobiliaria.ai.arco.public.title')}</h1>
      <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.arco.public.noAbrio')}</p>
      <Link href="/arco" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
        {t('inmobiliaria.ai.arco.public.elegir.titulo')}
      </Link>
    </div>
  );
}
