'use client';

import {
  ChatText,
  Briefcase,
  Handshake,
  Smiley,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { CommunicationTone } from '@/lib/types/beta-chat';

// ============================================================================
// Tone Options
// ============================================================================

interface ToneOption {
  id: CommunicationTone;
  labelKey: string;
  exampleKey: string;
  icon: Icon;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'formal',
    labelKey: 'beta.preferences.tone.formal',
    exampleKey: 'beta.preferences.tone.formalExample',
    icon: Briefcase,
  },
  {
    id: 'professional',
    labelKey: 'beta.preferences.tone.professional',
    exampleKey: 'beta.preferences.tone.professionalExample',
    icon: Handshake,
  },
  {
    id: 'casual',
    labelKey: 'beta.preferences.tone.casual',
    exampleKey: 'beta.preferences.tone.casualExample',
    icon: Smiley,
  },
];

// ============================================================================
// Component
// ============================================================================

interface ToneSelectorProps {
  className?: string;
}

/**
 * ToneSelector - Communication tone preference selector.
 *
 * Three cards (formal / profesional / casual) with example text snippets.
 * Selected card has an indigo ring. Clicking updates preferences.tone.
 */
export function ToneSelector({ className }: ToneSelectorProps) {
  const { t } = useI18n();
  const { preferences, updatePreferences } = useBetaChatContext();

  const handleToneChange = (tone: CommunicationTone) => {
    updatePreferences({ tone });
  };

  return (
    <section className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <ChatText className="w-4.5 h-4.5 text-muted-foreground" weight="duotone" />
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {t('beta.preferences.tone.title')}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {t('beta.preferences.tone.subtitle')}
          </p>
        </div>
      </div>

      {/* Tone cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {TONE_OPTIONS.map((option) => {
          const isSelected = preferences.tone === option.id;
          const IconComponent = option.icon;

          return (
            <button
              key={option.id}
              onClick={() => handleToneChange(option.id)}
              className={cn(
                'flex flex-col items-start gap-2 p-3.5 rounded-xl',
                'border text-left transition-all duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-600/5'
                  : 'border-neutral-200 dark:border-border bg-white dark:bg-card hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className="flex items-center gap-2">
                <IconComponent
                  className={cn(
                    'w-4.5 h-4.5',
                    isSelected
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-muted-foreground'
                  )}
                  weight={isSelected ? 'duotone' : 'regular'}
                />
                <span
                  className={cn(
                    'text-[13px] font-semibold',
                    isSelected
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-foreground'
                  )}
                >
                  {t(option.labelKey)}
                </span>
              </div>

              <p className="text-[12px] italic text-muted-foreground leading-relaxed">
                &ldquo;{t(option.exampleKey)}&rdquo;
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
