'use client';

import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { PreferencesSkeleton } from './BetaSkeletons';
import { AutonomySettings } from './AutonomySettings';
import { NotificationSettings } from './NotificationSettings';
import { ToneSelector } from './ToneSelector';
import { ThresholdSettings } from './ThresholdSettings';

interface PreferencesPanelProps {
  className?: string;
}

/**
 * PreferencesPanel - Full-width settings container rendered in the main content area.
 *
 * Renders sub-sections in order:
 * 1. AutonomySettings
 * 2. NotificationSettings
 * 3. ToneSelector
 * 4. ThresholdSettings
 *
 * Includes a global reset button at the bottom.
 */
export function PreferencesPanel({ className }: PreferencesPanelProps) {
  const { t } = useI18n();
  const { isLoading, resetPreferences } = useBetaChatContext();

  if (isLoading) return <PreferencesSkeleton />;

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-y-auto',
        className
      )}
    >
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Page header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('beta.preferences.title')}</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {t('beta.preferences.subtitle')}
          </p>
        </div>

        {/* 1. Autonomy settings */}
        <AutonomySettings />

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-border" />

        {/* 2. Notification settings */}
        <NotificationSettings />

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-border" />

        {/* 3. Tone selector */}
        <ToneSelector />

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-border" />

        {/* 4. Threshold settings */}
        <ThresholdSettings />

        {/* Global reset */}
        <div className="border-t border-neutral-200 dark:border-border pt-6 pb-4">
          <button
            onClick={resetPreferences}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'border border-neutral-200 dark:border-border',
              'bg-white dark:bg-card',
              'text-[13px] font-medium text-muted-foreground',
              'hover:text-[#C4503B] hover:border-[#C4503B]/30 dark:hover:text-[#C4503B] dark:hover:border-[#C4503B]/30',
              'transition-colors duration-150'
            )}
          >
            <ArrowCounterClockwise className="w-4 h-4" />
            {t('beta.preferences.reset')}
          </button>
        </div>
      </div>
    </div>
  );
}
