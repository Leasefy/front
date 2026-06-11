'use client';

import { FileXls, Desktop, Globe, DownloadSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { downloadTemplate } from '../lib/parseFile';
import type { ImportStepProps } from '../ImportWizard';
import type { ImportMethod } from '../lib/importTypes';

interface MethodCard {
  method: ImportMethod;
  titleKey: string;
  descKey: string;
  badgeKey: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  disabled?: boolean;
}

const METHOD_CARDS: MethodCard[] = [
  {
    method: 'excel',
    titleKey: 'inmobiliaria.import.methods.excel.title',
    descKey: 'inmobiliaria.import.methods.excel.desc',
    badgeKey: 'inmobiliaria.import.methods.excel.badge',
    badgeColor: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
    icon: FileXls,
    iconBg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    disabled: false,
  },
  {
    method: 'software',
    titleKey: 'inmobiliaria.import.methods.software.title',
    descKey: 'inmobiliaria.import.methods.software.desc',
    badgeKey: 'inmobiliaria.import.methods.software.badge',
    badgeColor: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
    icon: Desktop,
    iconBg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    disabled: false,
  },
  {
    method: 'portal',
    titleKey: 'inmobiliaria.import.methods.portal.title',
    descKey: 'inmobiliaria.import.methods.portal.desc',
    badgeKey: 'inmobiliaria.import.methods.portal.badge',
    badgeColor: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
    icon: Globe,
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    disabled: false,
  },
];

export function StepChooseMethod({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();

  const handleSelect = (method: ImportMethod, disabled?: boolean) => {
    if (disabled) return;
    updateState({ method });
  };

  const handleDownloadTemplate = async () => {
    await downloadTemplate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.import.title')}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.import.subtitle')}
        </p>
      </div>

      {/* Method Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {METHOD_CARDS.map((card, index) => {
          const isSelected = state.method === card.method;
          const CardIcon = card.icon;

          return (
            <button
              key={card.method}
              type="button"
              onClick={() => handleSelect(card.method, card.disabled)}
              className={cn(
                'animate-stagger-in text-left rounded-xl border-2 p-6 transition-all duration-200',
                card.disabled
                  ? 'opacity-60 cursor-not-allowed border-neutral-200 dark:border-neutral-700'
                  : isSelected
                    ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 cursor-pointer'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30 cursor-pointer'
              )}
              style={{ animationDelay: `${index * 80}ms` }}
              disabled={card.disabled}
            >
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                card.iconBg
              )}>
                <CardIcon className={cn(
                  'w-6 h-6',
                  card.method === 'excel' ? 'text-[#2C7A53] dark:text-[#3EAE70]' :
                  card.method === 'software' ? 'text-[#B7791F] dark:text-[#D2992F]' :
                  'text-neutral-500 dark:text-neutral-400'
                )} />
              </div>

              {/* Badge */}
              <span className={cn(
                'inline-block text-xs font-mono uppercase tracking-wide px-2 py-0.5 rounded-sm mb-3',
                card.badgeColor
              )}>
                {t(card.badgeKey)}
              </span>

              {/* Title & Description */}
              <h3 className="font-semibold text-neutral-900 dark:text-white text-base mb-1">
                {t(card.titleKey)}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {t(card.descKey)}
              </p>

              {/* Selected Indicator */}
              {isSelected && !card.disabled && (
                <div className="mt-4 flex items-center gap-2 text-[#1A40FF] dark:text-[#5570FF]">
                  <div className="w-2 h-2 rounded-full bg-[#1A40FF] dark:bg-[#5570FF]" />
                  <span className="text-xs font-mono uppercase tracking-wide">Seleccionado</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Download Template */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium"
        >
          <DownloadSimple className="w-4 h-4" />
          {t('inmobiliaria.import.upload.downloadTemplate')}
        </button>
      </div>
    </div>
  );
}
