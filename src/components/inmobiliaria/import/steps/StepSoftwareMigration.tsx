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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonoLabel } from '@leasefy/cadence';
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
    color: 'bg-primary',
    icon: Buildings,
    popular: true,
  },
  {
    id: 'daytona',
    name: 'Daytona Cyber',
    description: 'Segunda plataforma más usada',
    color: 'bg-surface-muted dark:bg-ink',
    icon: Desktop,
    popular: true,
  },
  {
    id: 'domus',
    name: 'DOMUS',
    description: 'Sistema tradicional',
    color: 'bg-success',
    icon: HouseLine,
    popular: false,
  },
  {
    id: 'wasi',
    name: 'WASI',
    description: 'Plataforma cloud moderna',
    color: 'bg-warning',
    icon: CloudArrowUp,
    popular: false,
  },
  {
    id: 'inmoflex',
    name: 'Inmoflex',
    description: 'En crecimiento',
    color: 'bg-danger',
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
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          {t('inmobiliaria.import.software.title')}
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
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
                  ? 'border-primary/30 bg-primary-soft/50 dark:bg-primary/10'
                  : 'border-border dark:border-border-strong hover:border-border dark:hover:border-border-strong bg-surface dark:bg-[#14130F]'
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
                        <span className="font-semibold text-fg dark:text-white text-sm">
                          {software.name}
                        </span>
                        {software.popular && (
                          <Badge variant="default">
                            {t('inmobiliaria.import.software.popular')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
                        {software.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {isExpanded ? (
                      <CaretUp className="w-4 h-4 text-fg-subtle" />
                    ) : (
                      <CaretDown className="w-4 h-4 text-fg-subtle" />
                    )}
                  </div>
                </div>

                {/* Expandable export instructions */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border-faint dark:border-border-strong">
                    <MonoLabel className="block text-xs text-fg-muted dark:text-fg-subtle mb-3">
                      Instrucciones de exportación
                    </MonoLabel>
                    <ol className="space-y-2.5">
                      {exportSteps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className="animate-content-reveal flex items-start gap-3"
                          style={{ animationDelay: `${stepIndex * 60}ms` }}
                        >
                          <div className="w-7 h-7 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-mono text-fg-muted dark:text-fg-subtle">
                              {stepIndex + 1}
                            </span>
                          </div>
                          <span className="text-sm text-fg dark:text-fg-subtle leading-relaxed">
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
        className="flex items-start gap-4 p-5 rounded-xl border border-warning/30 bg-warning-soft hover:bg-warning-soft transition-colors group"
        onClick={(e) => e.preventDefault()}
      >
        <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center shrink-0">
          <Question className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-fg dark:text-white text-sm">
            {t('inmobiliaria.import.software.otherSoftware')}
          </p>
          <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
            {t('inmobiliaria.import.software.otherSoftwareDesc')}
          </p>
        </div>
        <MonoLabel className="text-xs text-warning group-hover:text-warning dark:group-hover:text-warning transition-colors self-center">
          {t('inmobiliaria.import.software.requestHelp')}
        </MonoLabel>
      </a>

      {/* Have file CTA */}
      <div className="pt-2 flex justify-center">
        <Button
          type="button"
          size="lg"
          hideArrow
          onClick={handleHaveFile}
          className="gap-2"
        >
          <FileArrowUp className="w-5 h-5" />
          {t('inmobiliaria.import.software.haveFile')}
        </Button>
      </div>
    </div>
  );
}
