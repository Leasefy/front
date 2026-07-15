'use client';

import { PromptComposer, AgentSuggestionCard, Eyebrow } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Types & Constants
// ============================================================================

interface BetaWelcomeProps {
  onPromptClick?: (prompt: string) => void;
  /** @deprecated the hero now uses the cadence <PromptComposer>; kept for API compat. */
  inputSlot?: React.ReactNode;
  className?: string;
}

interface PromptChip {
  id: string;
  titleKey: string;
  descKey: string;
  gradient: string;
}

// §33 "Sugerencias · Agentes Leasefy" — one gradient monogram per domain.
const PROMPT_CHIPS: PromptChip[] = [
  { id: 'cobros', titleKey: 'beta.welcome.prompts.cobros', descKey: 'beta.welcome.prompts.cobros_desc', gradient: 'linear-gradient(140deg,#1F8A5B,#7DE08A)' },
  { id: 'propiedades', titleKey: 'beta.welcome.prompts.propiedades', descKey: 'beta.welcome.prompts.propiedades_desc', gradient: 'linear-gradient(140deg,#1A40FF,#2BB5E8)' },
  { id: 'contratos', titleKey: 'beta.welcome.prompts.contratos', descKey: 'beta.welcome.prompts.contratos_desc', gradient: 'linear-gradient(140deg,#8E7BF0,#F5A878)' },
  { id: 'mantenimiento', titleKey: 'beta.welcome.prompts.mantenimiento', descKey: 'beta.welcome.prompts.mantenimiento_desc', gradient: 'linear-gradient(140deg,#2BB5E8,#1A40FF)' },
  { id: 'candidatos', titleKey: 'beta.welcome.prompts.candidatos', descKey: 'beta.welcome.prompts.candidatos_desc', gradient: 'linear-gradient(140deg,#1A40FF,#2BB5E8)' },
  { id: 'reportes', titleKey: 'beta.welcome.prompts.reportes', descKey: 'beta.welcome.prompts.reportes_desc', gradient: 'linear-gradient(140deg,#1F8A5B,#7DE08A)' },
];

/** First grapheme of a title for the monogram tile. */
function monogram(title: string): string {
  return title.trim().charAt(0).toUpperCase() || '·';
}

// ============================================================================
// Component
// ============================================================================

/**
 * BetaWelcome — state-0 (empty) chat, rebuilt to the cadence §33 design:
 * the greeting, the framed <PromptComposer>, and the "Sugerencias · Agentes
 * Leasefy" grid of <AgentSuggestionCard>. Sending (or picking a suggestion)
 * calls onPromptClick — the same `sendMessage` handler as before.
 */
export function BetaWelcome({ onPromptClick, className }: BetaWelcomeProps) {
  const { t } = useI18n();

  return (
    <div className={cn('flex min-h-full flex-col items-center justify-center px-4 py-12 sm:px-6', className)}>
      <div className="flex w-full max-w-[760px] flex-col items-center">
        {/* Hero greeting */}
        <h1 className="mb-9 text-center font-heading font-medium tracking-[-0.025em] leading-[1.04] text-fg text-[clamp(2.25rem,5vw,3.25rem)]">
          {t('beta.welcome.heroTitle')}
        </h1>

        {/* Prompt composer (state 0) */}
        <PromptComposer
          className="w-full"
          onSend={(text) => onPromptClick?.(text)}
          onAttach={() => {}}
          onTemplates={() => {}}
          placeholder={t('beta.chat.placeholder')}
        />

        {/* Sugerencias · Agentes Leasefy */}
        <div className="mt-8 w-full">
          <Eyebrow className="mb-3.5 px-1">{t('beta.welcome.suggestionsLabel')}</Eyebrow>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROMPT_CHIPS.map((chip) => {
              const title = t(chip.titleKey);
              const desc = t(chip.descKey);
              return (
                <AgentSuggestionCard
                  key={chip.id}
                  initials={monogram(title)}
                  gradient={chip.gradient}
                  title={title}
                  description={desc}
                  onSelect={() => onPromptClick?.(desc)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
