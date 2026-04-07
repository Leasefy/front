'use client';

import { useState } from 'react';
import { Globe, Envelope } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ImportStepProps } from '../ImportWizard';

interface PortalItem {
  id: string;
  name: string;
  domain: string;
  color: string;
  description: string;
}

const PORTALS: PortalItem[] = [
  {
    id: 'fincaraiz',
    name: 'FincaRaíz',
    domain: 'fincaraiz.com.co',
    color: 'bg-green-600',
    description: 'Ideal para agencias con 50+ propiedades publicadas',
  },
  {
    id: 'metrocuadrado',
    name: 'Metrocuadrado',
    domain: 'metrocuadrado.com',
    color: 'bg-blue-600',
    description: 'Importa tu portafolio de Metrocuadrado',
  },
  {
    id: 'ciencuadras',
    name: 'Ciencuadras',
    domain: 'ciencuadras.com',
    color: 'bg-orange-500',
    description: 'Próxima integración disponible',
  },
];

export function StepPortalImport({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail('');
    // Reset after a few seconds so user can submit again
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.import.portal.title')}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.import.portal.subtitle')}
        </p>
      </div>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PORTALS.map((portal, index) => (
          <div
            key={portal.id}
            className="animate-stagger-in rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 relative overflow-hidden"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {/* Próximamente badge */}
            <div className="absolute top-0 right-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs font-mono uppercase tracking-wide px-3 py-1 rounded-bl-xl">
              {t('inmobiliaria.import.portal.comingSoon')}
            </div>

            {/* Icon */}
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
              portal.color
            )}>
              <Globe className="w-6 h-6 text-white" />
            </div>

            {/* Name & domain */}
            <p className="font-semibold text-neutral-900 dark:text-white text-lg">
              {portal.name}
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
              {portal.domain}
            </p>

            {/* Description */}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              {portal.description}
            </p>

            {/* Disabled URL input */}
            <div className="mt-4">
              <input
                type="url"
                disabled
                placeholder={`https://${portal.domain}/tu-agencia`}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-400 dark:text-neutral-600 opacity-50 cursor-not-allowed"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Email capture */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <Envelope className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.import.portal.emailCapture.title')}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('inmobiliaria.import.portal.emailCapture.subtitle')}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            {t('inmobiliaria.import.portal.emailCapture.success')}
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="flex">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('inmobiliaria.import.portal.emailCapture.placeholder')}
              className="flex-1 px-4 py-2.5 rounded-l-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-r-xl bg-indigo-600 text-white uppercase tracking-wide font-mono font-medium text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              {t('inmobiliaria.import.portal.emailCapture.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
