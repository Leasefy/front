'use client';

import { useMemo } from 'react';
import {
  CurrencyDollar,
  Buildings,
  FileText,
  Wrench,
  FunnelSimple,
  ChartBar,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Types & Constants
// ============================================================================

interface BetaWelcomeProps {
  onPromptClick?: (prompt: string) => void;
  className?: string;
}

interface PromptCard {
  id: string;
  titleKey: string;
  descKey: string;
  icon: Icon;
  color: string;
}

const ICON_STYLES: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400' },
  sky: { bg: 'bg-sky-100 dark:bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400' },
};

const PROMPT_CARDS: PromptCard[] = [
  { id: 'cobros', titleKey: 'beta.welcome.prompts.cobros', descKey: 'beta.welcome.prompts.cobros_desc', icon: CurrencyDollar, color: 'emerald' },
  { id: 'propiedades', titleKey: 'beta.welcome.prompts.propiedades', descKey: 'beta.welcome.prompts.propiedades_desc', icon: Buildings, color: 'blue' },
  { id: 'contratos', titleKey: 'beta.welcome.prompts.contratos', descKey: 'beta.welcome.prompts.contratos_desc', icon: FileText, color: 'amber' },
  { id: 'mantenimiento', titleKey: 'beta.welcome.prompts.mantenimiento', descKey: 'beta.welcome.prompts.mantenimiento_desc', icon: Wrench, color: 'rose' },
  { id: 'candidatos', titleKey: 'beta.welcome.prompts.candidatos', descKey: 'beta.welcome.prompts.candidatos_desc', icon: FunnelSimple, color: 'violet' },
  { id: 'reportes', titleKey: 'beta.welcome.prompts.reportes', descKey: 'beta.welcome.prompts.reportes_desc', icon: ChartBar, color: 'sky' },
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'beta.welcome.greeting_morning';
  if (hour >= 12 && hour < 19) return 'beta.welcome.greeting_afternoon';
  return 'beta.welcome.greeting_evening';
}

// ============================================================================
// Component
// ============================================================================

/**
 * BetaWelcome — Elegant welcome with bold greeting, subtitle,
 * and colored suggestion cards with icon accents.
 */
export function BetaWelcome({ onPromptClick, className }: BetaWelcomeProps) {
  const { t } = useI18n();
  const greetingKey = useMemo(() => getTimeGreeting(), []);

  return (
    <div className={cn('flex flex-col items-center justify-center h-full px-4 sm:px-6', className)}>
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Greeting */}
        <h1 className="text-[32px] sm:text-[40px] font-bold text-foreground mb-2 text-center tracking-tight leading-tight">
          {t(greetingKey)}
        </h1>

        <p className="text-[15px] text-muted-foreground text-center mb-12 max-w-md leading-relaxed">
          {t('beta.welcome.subtitle')}
        </p>

        {/* Suggestion cards — 2x3 grid with colored icons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
          {PROMPT_CARDS.map((card) => {
            const CardIcon = card.icon;
            const colors = ICON_STYLES[card.color];
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onPromptClick?.(t(card.descKey))}
                className={cn(
                  'group text-left',
                  'px-4 py-3.5 rounded-2xl',
                  'bg-white dark:bg-neutral-900',
                  'border border-neutral-200/80 dark:border-neutral-800/80',
                  'hover:border-neutral-300 dark:hover:border-neutral-700',
                  'hover:shadow-sm',
                  'hover:-translate-y-0.5',
                  'transition-all duration-200 ease-out',
                  'cursor-pointer'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                      colors.bg
                    )}
                  >
                    <CardIcon className={cn('w-[18px] h-[18px]', colors.text)} weight="duotone" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">
                      {t(card.titleKey)}
                    </p>
                    <p className="text-[12px] text-muted-foreground/70 leading-snug mt-1">
                      {t(card.descKey)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
