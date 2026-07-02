'use client';

import {
  Bell,
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { SegmentedControl, MonoLabel } from '@leasefy/cadence';
import { Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import type { AgentType, NotificationPreferences } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';

// ============================================================================
// Icon Map
// ============================================================================

const AGENT_ICON_MAP: Record<string, Icon> = {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
};

// ============================================================================
// Agent ordering
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
// Dot colors matching AGENT_METADATA
// ============================================================================

const DOT_COLORS: Record<string, string> = {
  emerald: 'bg-success',
  blue: 'bg-primary',
  amber: 'bg-warning',
  purple: 'bg-neutral-100 dark:bg-neutral-800',
  pink: 'bg-neutral-100 dark:bg-neutral-800',
  indigo: 'bg-primary',
};

// ============================================================================
// Channel options
// ============================================================================

type ChannelOption = {
  id: NotificationPreferences['channel'];
  labelKey: string;
};

const CHANNEL_OPTIONS: ChannelOption[] = [
  { id: 'in_app', labelKey: 'beta.preferences.notifications.inApp' },
  { id: 'email', labelKey: 'beta.preferences.notifications.email' },
  { id: 'whatsapp', labelKey: 'beta.preferences.notifications.whatsapp' },
  { id: 'all', labelKey: 'beta.preferences.notifications.all' },
];

// ============================================================================
// Component
// ============================================================================

interface NotificationSettingsProps {
  className?: string;
}

/**
 * NotificationSettings - Notification category toggles and channel selector.
 *
 * Shows a toggle for each agent category and a segmented control for
 * the notification channel preference.
 */
export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { t } = useI18n();
  const { preferences, updatePreferences } = useBetaChatContext();

  const handleToggle = (agentType: AgentType) => {
    updatePreferences({
      notifications: {
        ...preferences.notifications,
        categories: {
          ...preferences.notifications.categories,
          [agentType]: !preferences.notifications.categories[agentType],
        },
      },
    });
  };

  const handleChannelChange = (channel: NotificationPreferences['channel']) => {
    updatePreferences({
      notifications: {
        ...preferences.notifications,
        channel,
      },
    });
  };

  return (
    <section className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Bell className="w-4.5 h-4.5 text-muted-foreground" weight="duotone" />
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {t('beta.preferences.notifications.title')}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {t('beta.preferences.notifications.subtitle')}
          </p>
        </div>
      </div>

      {/* Category toggles */}
      <div
        className={cn(
          'rounded-xl border border-neutral-200 dark:border-border',
          'bg-white dark:bg-card',
          'divide-y divide-neutral-100 dark:divide-border'
        )}
      >
        {AGENT_TYPES.map((agentType) => {
          const meta = AGENT_METADATA[agentType];
          const AgentIcon = AGENT_ICON_MAP[meta.icon];
          const dotColor = DOT_COLORS[meta.color] ?? 'bg-neutral-400';
          const isEnabled = preferences.notifications.categories[agentType];

          return (
            <div
              key={agentType}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)}
                />
                {AgentIcon && (
                  <AgentIcon
                    className="w-4 h-4 text-muted-foreground"
                    weight="regular"
                  />
                )}
                <span className="text-[13px] font-medium text-foreground">
                  {meta.label}
                </span>
              </div>

              {/* Toggle switch — Cadence Switch */}
              <Switch
                checked={isEnabled}
                onCheckedChange={() => handleToggle(agentType)}
                aria-label={t('beta.preferences.notifications.toggleLabel', { agent: meta.label })}
              />
            </div>
          );
        })}
      </div>

      {/* Channel selector — Cadence SegmentedControl */}
      <div className="space-y-2">
        <MonoLabel className="block px-1 tracking-wide text-muted-foreground">
          {t('beta.preferences.notifications.channel')}
        </MonoLabel>
        <SegmentedControl<NotificationPreferences['channel']>
          fullWidth
          size="sm"
          aria-label={t('beta.preferences.notifications.channel')}
          value={preferences.notifications.channel}
          onChange={handleChannelChange}
          options={CHANNEL_OPTIONS.map((option) => ({
            value: option.id,
            label: t(option.labelKey),
          }))}
        />
      </div>
    </section>
  );
}
