'use client';

import { useState } from 'react';
import {
  Buildings,
  Desktop,
  HouseLine,
  CloudArrowUp,
  ChartLineUp,
  FileArrowUp,
  Question,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ImportStepProps } from '../ImportWizard';

interface SoftwareItem {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  popular: boolean;
}

const SOFTWARE_LIST: SoftwareItem[] = [
  {
    id: 'simi',
    name: 'SIMI CRM',
    description: 'Líder del mercado desde 1992',
    color: 'bg-[#1A40FF]',
    icon: Buildings,
    popular: true,
  },
  {
    id: 'daytona',
    name: 'Daytona Cyber',
    description: 'Segunda plataforma más usada',
    color: 'bg-neutral-100 dark:bg-neutral-800',
    icon: Desktop,
    popular: true,
  },
  {
    id: 'domus',
    name: 'DOMUS',
    description: 'Sistema tradicional',
    color: 'bg-[#2C7A53]',
    icon: HouseLine,
    popular: false,
  },
  {
    id: 'wasi',
    name: 'WASI',
    description: 'Plataforma cloud moderna',
    color: 'bg-[#B7791F]',
    icon: CloudArrowUp,
    popular: false,
  },
  {
    id: 'inmoflex',
    name: 'Inmoflex',
    description: 'En crecimiento',
    color: 'bg-[#C4503B]',
    icon: ChartLineUp,
    popular: false,
  },
];

export function StepSoftwareMigration({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleHaveFile = () => {
    updateState({ method: 'excel' });
  };

  const exportSteps = [
    t('inmobiliaria.import.software.exportSteps.step1'),
    t('inmobiliaria.import.software.exportSteps.step2'),
    t('inmobiliaria.import.software.exportSteps.step3'),
    t('inmobiliaria.import.software.exportSteps.step4'),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.import.software.title')}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.import.software.subtitle')}
        </p>
      </div>

      {/* Software Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOFTWARE_LIST.map((software, index) => {
          const SoftwareIcon = software.icon;
          const isExpanded = expandedId === software.id;

          return (
            <div
              key={software.id}
              className={cn(
                'animate-stagger-in rounded-xl border transition-all cursor-pointer',
                isExpanded
                  ? 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/10'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1a1a1c]'
              )}
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={() => handleCardClick(software.id)}
            >
              <div className="p-5">
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      software.color
                    )}>
                      <SoftwareIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                          {software.name}
                        </span>
                        {software.popular && (
                          <span className="inline-block text-xs font-mono uppercase tracking-wide px-2 py-0.5 rounded-sm bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]">
                            {t('inmobiliaria.import.software.popular')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {software.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {isExpanded ? (
                      <CaretUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <CaretDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expandable export instructions */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
                      Instrucciones de exportación
                    </p>
                    <ol className="space-y-2.5">
                      {exportSteps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className="animate-content-reveal flex items-start gap-3"
                          style={{ animationDelay: `${stepIndex * 60}ms` }}
                        >
                          <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                              {stepIndex + 1}
                            </span>
                          </div>
                          <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Request help card */}
      <a
        href="#"
        className="flex items-start gap-4 p-5 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15 hover:bg-[#F8F0E0] dark:hover:bg-[#B7791F]/20 transition-colors group"
        onClick={(e) => e.preventDefault()}
      >
        <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center shrink-0">
          <Question className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-neutral-900 dark:text-white text-sm">
            {t('inmobiliaria.import.software.otherSoftware')}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('inmobiliaria.import.software.otherSoftwareDesc')}
          </p>
        </div>
        <span className="text-xs font-mono uppercase tracking-wide text-[#B7791F] dark:text-[#D2992F] group-hover:text-[#B7791F] dark:group-hover:text-[#B7791F] transition-colors self-center">
          {t('inmobiliaria.import.software.requestHelp')}
        </span>
      </a>

      {/* Have file CTA */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleHaveFile}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A40FF] text-white font-medium hover:opacity-90 transition-colors"
        >
          <FileArrowUp className="w-5 h-5" />
          {t('inmobiliaria.import.software.haveFile')}
        </button>
      </div>
    </div>
  );
}
