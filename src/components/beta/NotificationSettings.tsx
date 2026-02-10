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
import { cn } from '@/lib/utils';
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
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
};

// ============================================================================
// Channel options
// ============================================================================

type ChannelOption = {
  id: NotificationPreferences['channel'];
  label: string;
};

const CHANNEL_OPTIONS: ChannelOption[] = [
  { id: 'in_app', label: 'En la app' },
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'all', label: 'Todos' },
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
            Notificaciones
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Elige sobre que te notificamos y por donde.
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

              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(agentType)}
                className={cn(
                  'relative w-9 h-5 rounded-full transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                  isEnabled
                    ? 'bg-indigo-600'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                )}
                role="switch"
                aria-checked={isEnabled}
                aria-label={`Notificaciones de ${meta.label}`}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm',
                    'transition-transform duration-200',
                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Channel selector */}
      <div className="space-y-2">
        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide px-1">
          Canal de notificacion
        </p>
        <div
          className={cn(
            'flex rounded-lg',
            'bg-neutral-100 dark:bg-neutral-800/50',
            'p-0.5'
          )}
        >
          {CHANNEL_OPTIONS.map((option) => {
            const isActive = preferences.notifications.channel === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleChannelChange(option.id)}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md',
                  'text-[12px] font-medium',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
