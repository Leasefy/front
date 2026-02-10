'use client';

import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
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
 * 1. AutonomySettings — per-agent autonomy level toggles
 * 2. NotificationSettings — category toggles + channel selector
 * 3. ToneSelector — formal/professional/casual tone cards
 * 4. ThresholdSettings — mora, budget, and candidate score thresholds
 *
 * Includes a global "Restablecer toda la configuracion" reset button at the bottom.
 */
export function PreferencesPanel({ className }: PreferencesPanelProps) {
  const { resetPreferences } = useBetaChatContext();

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
          <h2 className="text-lg font-semibold text-foreground">Configuracion</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Ajusta el comportamiento de tus agentes de IA y preferencias de la plataforma.
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
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-neutral-200 dark:border-border',
              'bg-white dark:bg-card',
              'text-[13px] font-medium text-muted-foreground',
              'hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-800',
              'transition-colors duration-150'
            )}
          >
            <ArrowCounterClockwise className="w-4 h-4" />
            Restablecer toda la configuracion
          </button>
        </div>
      </div>
    </div>
  );
}
