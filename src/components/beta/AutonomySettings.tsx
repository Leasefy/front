'use client';

import {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  Lightning,
  Hand,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { AgentType, AutonomyLevel } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import { AUTONOMY_LEVELS } from '@/lib/data/default-preferences';

// ============================================================================
// Icon Maps
// ============================================================================

const AGENT_ICON_MAP: Record<string, Icon> = {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
};

const LEVEL_ICON_MAP: Record<string, Icon> = {
  Lightning,
  ChatCircle,
  Hand,
};

// ============================================================================
// Color Classes (matching AgentBadge pattern)
// ============================================================================

const BORDER_COLORS: Record<string, string> = {
  emerald: 'border-l-emerald-500',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
  pink: 'border-l-pink-500',
  indigo: 'border-l-indigo-500',
};

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
};

// ============================================================================
// Agent types ordering
// ============================================================================

const AGENT_TYPES: AgentType[] = [
  'cobranza',
  'pipeline',
  'mantenimiento',
  'documentos',
  'comunicacion',
  'reportes',
];

// ============================================================================
// Component
// ============================================================================

interface AutonomySettingsProps {
  className?: string;
}

/**
 * AutonomySettings - Per-agent autonomy level toggles.
 *
 * Shows all 6 agent types with a segmented control for each:
 * Auto | Preguntar primero | Manual
 *
 * Color-coded left border per agent matching AGENT_METADATA tokens.
 * Includes a reset link at the bottom.
 */
export function AutonomySettings({ className }: AutonomySettingsProps) {
  const { t } = useI18n();
  const { preferences, updatePreferences, resetPreferences } = useBetaChatContext();

  const handleLevelChange = (agentType: AgentType, level: AutonomyLevel) => {
    updatePreferences({
      autonomy: { ...preferences.autonomy, [agentType]: level },
    });
  };

  return (
    <section className={cn('space-y-4', className)}>
      {/* Section header */}
      <div>
        <h3 className="text-[15px] font-semibold text-foreground">
          {t('beta.preferences.autonomy.title')}
        </h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {t('beta.preferences.autonomy.subtitle')}
        </p>
      </div>

      {/* Agent cards */}
      <div className="space-y-2">
        {AGENT_TYPES.map((agentType) => {
          const meta = AGENT_METADATA[agentType];
          const AgentIcon = AGENT_ICON_MAP[meta.icon];
          const borderColor = BORDER_COLORS[meta.color] ?? 'border-l-neutral-400';
          const badge = BADGE_COLORS[meta.color] ?? BADGE_COLORS.blue;
          const currentLevel = preferences.autonomy[agentType];
          const currentLevelMeta = AUTONOMY_LEVELS.find((l) => l.id === currentLevel);

          return (
            <div
              key={agentType}
              className={cn(
                'rounded-xl border border-neutral-200 dark:border-border',
                'bg-white dark:bg-card',
                'border-l-[3px]',
                borderColor,
                'p-3.5'
              )}
            >
              {/* Agent header row */}
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-lg',
                    badge.bg
                  )}
                >
                  {AgentIcon && (
                    <AgentIcon
                      className={cn('w-4 h-4', badge.text)}
                      weight="duotone"
                    />
                  )}
                </div>
                <span className="text-[13px] font-medium text-foreground">
                  {meta.label}
                </span>
              </div>

              {/* Segmented control */}
              <div
                className={cn(
                  'flex rounded-lg',
                  'bg-neutral-100 dark:bg-neutral-800/50',
                  'p-0.5'
                )}
              >
                {AUTONOMY_LEVELS.map((level) => {
                  const LevelIcon = LEVEL_ICON_MAP[level.icon];
                  const isActive = currentLevel === level.id;

                  return (
                    <button
                      key={level.id}
                      onClick={() => handleLevelChange(agentType, level.id)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5',
                        'px-2.5 py-1.5 rounded-md',
                        'text-[12px] font-medium',
                        'transition-all duration-150',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {LevelIcon && (
                        <LevelIcon
                          className="w-3.5 h-3.5 flex-shrink-0"
                          weight={isActive ? 'fill' : 'regular'}
                        />
                      )}
                      <span className="whitespace-nowrap">{level.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active level description */}
              {currentLevelMeta && (
                <p className="text-[11px] text-muted-foreground mt-2 px-0.5">
                  {currentLevelMeta.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset link */}
      <button
        onClick={resetPreferences}
        className={cn(
          'flex items-center gap-1.5',
          'text-[12px] text-muted-foreground',
          'hover:text-foreground transition-colors',
          'px-1'
        )}
      >
        <ArrowCounterClockwise className="w-3.5 h-3.5" />
        <span>{t('beta.preferences.autonomy.resetDefault')}</span>
      </button>
    </section>
  );
}
