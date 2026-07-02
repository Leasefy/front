'use client';

import { FileXls, Desktop, Globe, DownloadSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonoLabel } from '@leasefy/cadence';
import { downloadTemplate } from '../lib/parseFile';
import type { ImportStepProps } from '../ImportWizard';
import type { ImportMethod } from '../lib/importTypes';

type BadgeVariant = 'success' | 'warning' | 'secondary';

interface MethodCard {
  method: ImportMethod;
  titleKey: string;
  descKey: string;
  badgeKey: string;
  badgeVariant: BadgeVariant;
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
    badgeVariant: 'success',
    icon: FileXls,
    iconBg: 'bg-success-soft',
    disabled: false,
  },
  {
    method: 'software',
    titleKey: 'inmobiliaria.import.methods.software.title',
    descKey: 'inmobiliaria.import.methods.software.desc',
    badgeKey: 'inmobiliaria.import.methods.software.badge',
    badgeVariant: 'warning',
    icon: Desktop,
    iconBg: 'bg-warning-soft',
    disabled: false,
  },
  {
    method: 'portal',
    titleKey: 'inmobiliaria.import.methods.portal.title',
    descKey: 'inmobiliaria.import.methods.portal.desc',
    badgeKey: 'inmobiliaria.import.methods.portal.badge',
    badgeVariant: 'secondary',
    icon: Globe,
    iconBg: 'bg-surface-muted dark:bg-ink',
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
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          {t('inmobiliaria.import.title')}
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.import.subtitle')}
        </p>
      </div>

      {/* Method Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {METHOD_CARDS.map((card, index) => {
          const isSelected = state.method === card.method;
          const CardIcon = card.icon;

          return (
            // allowlist: whole-card selectable button (rich icon-tile + badge + title + desc);
            // Button/RadioCard can't host this layout — kept native with aria-pressed.
            <button
              key={card.method}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleSelect(card.method, card.disabled)}
              className={cn(
                'animate-stagger-in text-left rounded-xl border-2 p-6 transition-all duration-200',
                card.disabled
                  ? 'opacity-60 cursor-not-allowed border-border dark:border-strong'
                  : isSelected
                    ? 'border-primary/30 bg-primary-soft cursor-pointer'
                    : 'border-border dark:border-strong hover:border-primary/30 dark:hover:border-primary/30 cursor-pointer'
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
                  card.method === 'excel' ? 'text-success' :
                  card.method === 'software' ? 'text-warning' :
                  'text-fg-muted dark:text-fg-subtle'
                )} />
              </div>

              {/* Badge */}
              <Badge variant={card.badgeVariant} className="mb-3">
                {t(card.badgeKey)}
              </Badge>

              {/* Title & Description */}
              <h3 className="font-semibold text-fg dark:text-white text-base mb-1">
                {t(card.titleKey)}
              </h3>
              <p className="text-sm text-fg-muted dark:text-fg-subtle leading-relaxed">
                {t(card.descKey)}
              </p>

              {/* Selected Indicator */}
              {isSelected && !card.disabled && (
                <div className="mt-4 flex items-center gap-2 text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary dark:bg-primary" />
                  <MonoLabel className="text-xs">Seleccionado</MonoLabel>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Download Template */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          hideArrow
          type="button"
          onClick={handleDownloadTemplate}
          className="gap-2"
        >
          <DownloadSimple className="w-4 h-4" />
          {t('inmobiliaria.import.upload.downloadTemplate')}
        </Button>
      </div>
    </div>
  );
}
