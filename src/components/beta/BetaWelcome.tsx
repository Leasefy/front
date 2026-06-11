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
  /** The hero ChatInput rendered centered under the greeting (Manus-style). */
  inputSlot?: React.ReactNode;
  className?: string;
}

interface PromptChip {
  id: string;
  titleKey: string;
  descKey: string;
  icon: Icon;
}

const PROMPT_CHIPS: PromptChip[] = [
  { id: 'cobros', titleKey: 'beta.welcome.prompts.cobros', descKey: 'beta.welcome.prompts.cobros_desc', icon: CurrencyDollar },
  { id: 'propiedades', titleKey: 'beta.welcome.prompts.propiedades', descKey: 'beta.welcome.prompts.propiedades_desc', icon: Buildings },
  { id: 'contratos', titleKey: 'beta.welcome.prompts.contratos', descKey: 'beta.welcome.prompts.contratos_desc', icon: FileText },
  { id: 'mantenimiento', titleKey: 'beta.welcome.prompts.mantenimiento', descKey: 'beta.welcome.prompts.mantenimiento_desc', icon: Wrench },
  { id: 'candidatos', titleKey: 'beta.welcome.prompts.candidatos', descKey: 'beta.welcome.prompts.candidatos_desc', icon: FunnelSimple },
  { id: 'reportes', titleKey: 'beta.welcome.prompts.reportes', descKey: 'beta.welcome.prompts.reportes_desc', icon: ChartBar },
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
 * BetaWelcome — Manus-style welcome: small time greeting, big serif question,
 * the hero chat input centered, and a row of suggestion pills below.
 */
export function BetaWelcome({ onPromptClick, inputSlot, className }: BetaWelcomeProps) {
  const { t } = useI18n();
  const greetingKey = useMemo(() => getTimeGreeting(), []);

  return (
    <div className={cn('flex flex-col items-center justify-center h-full px-4 sm:px-6', className)}>
      <div className="w-full max-w-[660px] flex flex-col items-center -mt-8">
        {/* Time greeting — small eyebrow */}
        <p className="text-[13px] font-medium tracking-wide text-muted-foreground/70 mb-3 uppercase">
          {t(greetingKey)}
        </p>

        {/* Hero question — Manus-style serif */}
        <h1 className="font-serif text-[34px] sm:text-[42px] font-normal text-foreground mb-8 text-center tracking-tight leading-tight">
          {t('beta.welcome.heroTitle')}
        </h1>

        {/* Hero input — centered like Manus */}
        {inputSlot && <div className="w-full mb-5">{inputSlot}</div>}

        {/* Suggestion pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full">
          {PROMPT_CHIPS.map((chip) => {
            const ChipIcon = chip.icon;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onPromptClick?.(t(chip.descKey))}
                className={cn(
                  'inline-flex items-center gap-2',
                  'px-3.5 py-2 rounded-full',
                  'text-[13px] font-medium text-muted-foreground',
                  'bg-white dark:bg-neutral-900',
                  'border border-neutral-200/90 dark:border-neutral-800',
                  'hover:border-neutral-300 dark:hover:border-neutral-600',
                  'hover:text-foreground hover:shadow-sm',
                  'transition-all duration-150',
                  'cursor-pointer'
                )}
              >
                <ChipIcon className="w-4 h-4 opacity-70" weight="duotone" />
                {t(chip.titleKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
