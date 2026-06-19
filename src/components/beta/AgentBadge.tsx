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
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    border: 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
    activeBg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
  },
  blue: {
    bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    border: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40',
    text: 'text-[#1A40FF] dark:text-[#5570FF]',
    activeBg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
  },
  amber: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    border: 'border-[#B7791F]/30 dark:border-[#B7791F]/40',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
    activeBg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
  },
  purple: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    border: 'border-neutral-200 dark:border-neutral-700',
    text: 'text-neutral-600 dark:text-neutral-300',
    activeBg: 'bg-neutral-100 dark:bg-neutral-800',
  },
  pink: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    border: 'border-neutral-200 dark:border-neutral-700',
    text: 'text-neutral-600 dark:text-neutral-300',
    activeBg: 'bg-neutral-100 dark:bg-neutral-800',
  },
  indigo: {
    bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    border: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40',
    text: 'text-[#1A40FF] dark:text-[#5570FF]',
    activeBg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
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
          'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
          'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
          'text-[#2C7A53] dark:text-[#3EAE70]',
        ],
        status === 'failed' && [
          'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
          'border-[#C4503B]/30 dark:border-[#C4503B]/40',
          'text-[#C4503B] dark:text-[#E0664D]',
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
