'use client';

import {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  CheckCircle,
  XCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { AgentType, AgentExecutionStatus } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { Icon } from '@phosphor-icons/react';

// ============================================================================
// Icon Map
// ============================================================================

const ICON_MAP: Record<string, Icon> = {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
};

// ============================================================================
// Color Maps
// ============================================================================

const COLOR_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; activeBg: string }
> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-100 dark:bg-emerald-500/20',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-100 dark:bg-blue-500/20',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-100 dark:bg-amber-500/20',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-purple-100 dark:bg-purple-500/20',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    border: 'border-pink-200 dark:border-pink-500/30',
    text: 'text-pink-600 dark:text-pink-400',
    activeBg: 'bg-pink-100 dark:bg-pink-500/20',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    activeBg: 'bg-indigo-100 dark:bg-indigo-500/20',
  },
};

// ============================================================================
// Component
// ============================================================================

interface AgentBadgeProps {
  agentType: AgentType;
  status: AgentExecutionStatus;
  /** Optional duration string, e.g. "1.2s" */
  duration?: string;
  className?: string;
}

/**
 * AgentBadge - Compact pill-shape badge showing agent type, icon, and execution status.
 *
 * Status-dependent styling:
 * - dispatching: pulsing border, muted background
 * - running: spinning loader, active color
 * - completed: check icon, green accent
 * - failed: X icon, red accent
 */
export function AgentBadge({ agentType, status, duration, className }: AgentBadgeProps) {
  const meta = AGENT_METADATA[agentType];
  const colors = COLOR_CLASSES[meta.color] ?? COLOR_CLASSES.blue;
  const AgentIcon = ICON_MAP[meta.icon];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-medium',
        'border transition-all duration-300',
        // Status-dependent styles
        status === 'dispatching' && [
          colors.bg,
          colors.border,
          colors.text,
          'animate-pulse',
        ],
        status === 'running' && [
          colors.activeBg,
          colors.border,
          colors.text,
        ],
        status === 'completed' && [
          'bg-emerald-50 dark:bg-emerald-500/10',
          'border-emerald-200 dark:border-emerald-500/30',
          'text-emerald-600 dark:text-emerald-400',
        ],
        status === 'failed' && [
          'bg-red-50 dark:bg-red-500/10',
          'border-red-200 dark:border-red-500/30',
          'text-red-600 dark:text-red-400',
        ],
        className
      )}
    >
      {/* Status icon or agent icon */}
      {status === 'running' ? (
        <CircleNotch className="w-3.5 h-3.5 animate-spin flex-shrink-0" weight="bold" />
      ) : status === 'completed' ? (
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
      ) : status === 'failed' ? (
        <XCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
      ) : AgentIcon ? (
        <AgentIcon className="w-3.5 h-3.5 flex-shrink-0" weight="duotone" />
      ) : null}

      {/* Agent label */}
      <span className="whitespace-nowrap">{meta.label}</span>

      {/* Duration (only on completed) */}
      {status === 'completed' && duration && (
        <span className="text-[10px] opacity-70">{duration}</span>
      )}
    </div>
  );
}
